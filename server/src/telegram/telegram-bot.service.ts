import { HttpException, HttpStatus, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Bot, Context, InlineKeyboard } from 'grammy';
import Redis from 'ioredis';
import { In, Repository } from 'typeorm';
import { Auction, AuctionStatus, DepositStatus } from '../database/entities';
import { RegistrationsService } from '../registrations/registrations.service';
import { isRegistrationOpen } from '../auctions/registration-window';
import { parsePaymentReturn } from './telegram-link.service';

type PaymentReturn = Awaited<ReturnType<RegistrationsService['paymentReturn']>>;

export function entryCodeMessage(auction: Pick<Auction, 'title' | 'startsAt'>, code: string): string {
  return [
    `Deposit confirmed for ${auction.title}.`,
    '',
    `Entry code: ${code}`,
    `Auction starts: ${auction.startsAt.toISOString()}`,
    '',
    'Keep this code private. It can be redeemed only once by your Telegram account.',
  ].join('\n');
}

/** Reply for a payer arriving back from Paystack checkout via the t.me deep link. */
export function paymentReturnMessage(result: PaymentReturn): string {
  if (!result) return 'I could not find that payment for your Telegram account. Use /auctions to start again.';
  const { auction } = result;
  if (result.depositStatus === DepositStatus.HELD && result.entryCode) return entryCodeMessage(auction, result.entryCode);
  if (result.depositStatus === DepositStatus.HELD && result.redeemed) return `Your deposit for ${auction.title} is confirmed and your entry code has already been used.`;
  if (result.depositStatus === DepositStatus.PENDING) {
    return [
      `Thanks! We are waiting for Paystack to confirm your deposit for ${auction.title}.`,
      'Your private entry code will arrive in this chat as soon as it is confirmed, usually within a minute.',
      '',
      'If you did not finish paying, tap Pay deposit again.',
    ].join('\n');
  }
  return `Your registration for ${auction.title} is ${result.depositStatus}. Use /auctions to continue.`;
}

export function registrationErrorMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const message = typeof response === 'string' ? response : (response as { message?: string | string[] }).message;
    const detail = Array.isArray(message) ? message.join(' ') : message;
    if (detail === 'Registration is closed') return 'Registration for this auction has closed. Choose another auction with /auctions.';
    if (detail === 'Auction not found') return 'This auction is no longer available. Use /auctions to refresh the list.';
    if (error.getStatus() === HttpStatus.BAD_GATEWAY || error.getStatus() === HttpStatus.SERVICE_UNAVAILABLE) {
      return 'Payment checkout is temporarily unavailable. Please try again shortly.';
    }
  }
  return 'I could not prepare checkout right now. Please try again shortly.';
}

/** Telegram only opens Mini Apps over https. */
function httpsUrl(value: string | undefined): URL | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === 'https:' ? url : null; } catch { return null; }
}

/** Mini App link that opens straight on one auction, or null when MINI_APP_URL is not usable. */
export function miniAppAuctionUrl(base: string | undefined, auctionId: string): string | null {
  const url = httpsUrl(base);
  if (!url) return null;
  url.searchParams.set('auction', auctionId);
  return url.toString();
}

@Injectable()
export class TelegramBotService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly bot: Bot;
  private readonly redis: Redis;
  private readonly miniAppUrl: string | undefined;

  constructor(
    config: ConfigService,
    @InjectRepository(Auction) private readonly auctions: Repository<Auction>,
    private readonly registrations: RegistrationsService,
  ) {
    this.bot = new Bot(config.getOrThrow<string>('TELEGRAM_BOT_TOKEN'));
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), { maxRetriesPerRequest: 1 });
    this.configureHandlers();
    this.enabled = config.get<string>('TELEGRAM_BOT_ENABLED') !== 'false';
    this.miniAppUrl = config.get<string>('MINI_APP_URL') || undefined;
  }

  private readonly enabled: boolean;

  async onApplicationBootstrap(): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.bot.api.deleteWebhook({ drop_pending_updates: false });
      await this.bot.api.setMyCommands([
        { command: 'start', description: 'Browse available auctions' },
        { command: 'auctions', description: 'Show available auctions' },
        { command: 'cancel', description: 'Cancel the current action' },
      ]);
      await this.configureMenuButton();
      void this.bot.start({ allowed_updates: ['message', 'callback_query'], onStart: ({ username }) => this.logger.log(`Telegram bot @${username} is polling`) })
        .catch(() => this.logger.error('Telegram polling stopped after a network or API error'));
    } catch {
      this.logger.error('Telegram bot startup failed; API will remain available');
    }
  }

  async sendEntryCode(telegramUserId: string, auction: Auction, code: string): Promise<void> {
    await this.bot.api.sendMessage(telegramUserId, entryCodeMessage(auction, code), { reply_markup: this.enterAuctionKeyboard(auction.id) });
  }

  /** "Enter auction" button that opens the Mini App on this auction, when a Mini App is configured. */
  private enterAuctionKeyboard(auctionId: string): InlineKeyboard | undefined {
    const url = miniAppAuctionUrl(this.miniAppUrl, auctionId);
    return url ? new InlineKeyboard().webApp('Enter auction', url) : undefined;
  }

  /** Points the chat menu button at the Mini App so no BotFather setup is needed. */
  private async configureMenuButton(): Promise<void> {
    const url = httpsUrl(this.miniAppUrl);
    if (!url) { this.logger.warn('MINI_APP_URL is not an https URL; the Mini App menu button is not set'); return; }
    try {
      await this.bot.api.setChatMenuButton({ menu_button: { type: 'web_app', text: 'Auctions', web_app: { url: url.toString() } } });
    } catch {
      this.logger.warn('Unable to set the Mini App menu button');
    }
  }

  private configureHandlers(): void {
    this.bot.command('start', async (ctx) => {
      const reference = parsePaymentReturn(ctx.match);
      if (!reference || !ctx.from) { await this.sendCatalog(ctx); return; }
      const result = await this.registrations.paymentReturn(reference, String(ctx.from.id));
      await ctx.reply(paymentReturnMessage(result), { reply_markup: result?.entryCode ? this.enterAuctionKeyboard(result.auction.id) : undefined });
    });
    this.bot.command('auctions', (ctx) => this.sendCatalog(ctx));
    this.bot.command('cancel', async (ctx) => {
      if (ctx.from) await this.redis.del(this.pendingKey(ctx.from.id));
      await ctx.reply('Cancelled. Use /auctions whenever you are ready.');
    });
    this.bot.callbackQuery(/^register:([0-9a-f-]{36})$/i, async (ctx) => {
      if (!ctx.from) return;
      const auctionId = ctx.match[1];
      const auction = await this.auctions.findOneBy({ id: auctionId });
      if (!auction) { await ctx.answerCallbackQuery({ text: 'This auction is no longer available', show_alert: true }); return; }
      if (!isRegistrationOpen(auction)) { await ctx.answerCallbackQuery({ text: 'Registration for this auction has closed', show_alert: true }); return; }
      await this.redis.set(this.pendingKey(ctx.from.id), auctionId, 'EX', 600);
      await ctx.answerCallbackQuery();
      await ctx.reply('Reply with the email address you want to use for your Paystack receipt. Use /cancel to stop.');
    });
    this.bot.on('message:text', async (ctx) => {
      if (!ctx.from || ctx.message.text.startsWith('/')) return;
      const auctionId = await this.redis.get(this.pendingKey(ctx.from.id));
      if (!auctionId) return;
      const email = ctx.message.text.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { await ctx.reply('That does not look like an email address. Please try again or use /cancel.'); return; }
      try {
        const registration = await this.registrations.create(auctionId, String(ctx.from.id), email);
        await this.redis.del(this.pendingKey(ctx.from.id));
        if (registration.awaitingConfirmation) {
          await ctx.reply('Paystack has already received your payment. We are waiting for its confirmation, and your private entry code will arrive in this chat shortly. There is no need to pay again.');
          return;
        }
        if (!registration.checkoutUrl) { await ctx.reply(`Your registration is already ${registration.status}. Use /auctions to continue.`); return; }
        await ctx.reply('Your deposit checkout is ready. After paying you will be brought back to this chat, and your private entry code will arrive here once Paystack confirms the payment.', {
          reply_markup: new InlineKeyboard().url('Pay deposit', registration.checkoutUrl),
        });
      } catch (error) {
        const message = registrationErrorMessage(error);
        if (error instanceof HttpException && error.getStatus() < 500) this.logger.warn(`Telegram registration rejected: ${error.message}`);
        else this.logger.error('Unable to create Telegram registration', error instanceof Error ? error.stack : undefined);
        await ctx.reply(message);
      }
    });
    this.bot.catch((error) => this.logger.error(`Telegram update ${error.ctx.update.update_id} failed`, error.error));
  }

  private async sendCatalog(ctx: Context): Promise<void> {
    const auctions = await this.auctions.find({ where: { status: In([AuctionStatus.SCHEDULED, AuctionStatus.ACTIVE]) }, order: { startsAt: 'ASC' }, take: 10 });
    if (!auctions.length) { await ctx.reply('There are no available auctions right now. Check back soon.'); return; }
    await ctx.reply('Available auctions');
    for (const auction of auctions) {
      const amount = (minor: string) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: auction.currency }).format(Number(minor) / 100);
      const text = [`${auction.title}`, `Starts: ${auction.startsAt.toISOString()}`, `Opening bid: ${amount(auction.startingPriceMinor)}`, `Minimum increment: ${amount(auction.minIncrementMinor)}`, `Refundable deposit: ${amount(auction.depositAmountMinor)}`].join('\n');
      await ctx.reply(text, { reply_markup: new InlineKeyboard().text('Register', `register:${auction.id}`) });
    }
  }

  private pendingKey(userId: number): string { return `hammer:v1:bot:pending-email:${userId}`; }

  async onModuleDestroy(): Promise<void> {
    if (this.bot.isRunning()) await this.bot.stop();
    await this.redis.quit();
  }
}
