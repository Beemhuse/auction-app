import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Auction, AuctionOutcome, AuctionRegistration, AuctionResult, DepositRefund, DepositStatus, PaymentAttempt, PaymentAttemptStatus } from '../database/entities';
import { PaystackService } from '../integrations/paystack/paystack.service';
import { TelegramBotService, refundDetailsRequestMessage, refundSentMessage, refundStartedMessage } from '../telegram/telegram-bot.service';

const NEEDS_ATTENTION = 'needs-attention';
const FAILED = 'failed';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DepositRefund) private readonly refunds: Repository<DepositRefund>,
    @InjectRepository(AuctionRegistration) private readonly registrations: Repository<AuctionRegistration>,
    @InjectRepository(Auction) private readonly auctions: Repository<Auction>,
    @InjectRepository(AuctionResult) private readonly results: Repository<AuctionResult>,
    @InjectRepository(PaymentAttempt) private readonly paymentAttempts: Repository<PaymentAttempt>,
    private readonly paystack: PaystackService,
    private readonly telegram: TelegramBotService,
  ) {}

  /**
   * Refunds a held deposit through Paystack, back to the account the bidder paid from.
   * The deposit is marked REFUNDED straight away and returns to HELD if Paystack rejects the refund.
   */
  async refundRegistration(registrationId: string, amountMinor?: string) {
    const registration = await this.registrations.findOneBy({ id: registrationId });
    if (!registration) throw new NotFoundException('Registration not found');
    const auction = await this.auctions.findOneByOrFail({ id: registration.auctionId });
    const amount = amountMinor ?? auction.depositAmountMinor;
    if (BigInt(amount) < 1n || BigInt(amount) > BigInt(auction.depositAmountMinor)) throw new BadRequestException('Refund amount must be between 1 and the deposit amount');
    const paid = await this.paymentAttempts.findOneBy({ registrationId, status: PaymentAttemptStatus.PAID });
    const reference = paid?.reference ?? registration.paymentReference;
    if (!reference) throw new BadRequestException('This registration has no payment to refund');

    // Claim the refund first so two clicks cannot refund the same deposit twice.
    const refund: DepositRefund = await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(AuctionRegistration, { where: { id: registrationId }, lock: { mode: 'pessimistic_write' } });
      if (!locked || locked.depositStatus !== DepositStatus.HELD) throw new BadRequestException(`Only held deposits can be refunded; this one is ${locked?.depositStatus ?? 'missing'}`);
      const existing = await manager.findOneBy(DepositRefund, { registrationId });
      if (existing && existing.status !== FAILED) throw new ConflictException('A refund for this deposit is already in progress');
      locked.depositStatus = DepositStatus.REFUNDED;
      await manager.save(locked);
      return manager.save(Object.assign(existing ?? manager.create(DepositRefund, { registrationId }), {
        providerRefundId: null, paymentReference: reference, amountMinor: amount, currency: auction.currency, status: 'requesting', customerDetails: null,
      }));
    });

    let providerRefund: { id: string; status: string };
    try {
      providerRefund = await this.paystack.createRefund({ reference, amountMinor: amount === auction.depositAmountMinor ? undefined : amount, customerNote: `Deposit refund for ${auction.title}` });
    } catch (error) {
      await this.markFailed(refund);
      throw error;
    }
    refund.providerRefundId = providerRefund.id;
    refund.status = providerRefund.status;
    await this.refunds.save(refund);
    if (refund.status === FAILED) { await this.markFailed(refund); return { refundId: refund.id, status: refund.status, amountMinor: amount }; }

    await this.notify(registration.telegramUserId, refund, auction, refund.status === NEEDS_ATTENTION ? 'details' : 'started');
    return { refundId: refund.id, status: refund.status, amountMinor: amount };
  }

  /** Refunds every held deposit on a closed auction except the winner's. */
  async refundLosers(auctionId: string) {
    const result = await this.results.findOneBy({ auctionId });
    if (!result) throw new BadRequestException('Refunds open once the auction has closed and its result is recorded');
    if (result.outcome === AuctionOutcome.LEGACY) throw new BadRequestException('This auction closed before winners were recorded. Refund bidders one at a time.');
    const held = await this.registrations.findBy({ auctionId, depositStatus: DepositStatus.HELD });
    const losers = held.filter((registration) => registration.telegramUserId !== result.winnerTelegramUserId);
    const failed: { registrationId: string; telegramUserId: string; message: string }[] = [];
    let refunded = 0;
    for (const registration of losers) {
      try {
        await this.refundRegistration(registration.id);
        refunded += 1;
      } catch (error) {
        failed.push({ registrationId: registration.id, telegramUserId: registration.telegramUserId, message: error instanceof Error ? error.message : 'Refund failed' });
      }
    }
    return { refunded, failed };
  }

  /** Completes a refund Paystack could not send back automatically, using a bank account the bidder gave us. */
  async retryWithBankAccount(refundId: string, account: { accountNumber: string; bankId: string }) {
    const refund = await this.refunds.findOneBy({ id: refundId });
    if (!refund) throw new NotFoundException('Refund not found');
    if (refund.status !== NEEDS_ATTENTION || !refund.providerRefundId) throw new BadRequestException(`Only refunds that need attention can be retried; this one is ${refund.status}`);
    const result = await this.paystack.retryRefund(refund.providerRefundId, { currency: refund.currency, ...account });
    refund.status = result.status;
    await this.refunds.save(refund);
    return { refundId: refund.id, status: refund.status };
  }

  banks(currency: string) { return this.paystack.listBanks(currency); }

  /** Applies a signed Paystack refund.* webhook. Unknown refunds are logged and acknowledged. */
  async applyWebhook(event: string, data: Record<string, unknown>): Promise<void> {
    const status = typeof data.status === 'string' ? data.status : event.replace(/^refund\./, '');
    const providerId = data.id === undefined || data.id === null ? null : String(data.id);
    const transaction = data.transaction as { reference?: unknown } | undefined;
    const reference = typeof data.transaction_reference === 'string' ? data.transaction_reference : typeof transaction?.reference === 'string' ? transaction.reference : null;
    const refund = (providerId && await this.refunds.findOneBy({ providerRefundId: providerId })) || (reference && await this.refunds.findOneBy({ paymentReference: reference })) || null;
    if (!refund) { this.logger.warn(`Ignoring ${event} for an unknown refund (id ${providerId}, reference ${reference})`); return; }
    if (refund.status === status) return;
    refund.status = status;
    if (providerId && !refund.providerRefundId) refund.providerRefundId = providerId;
    await this.refunds.save(refund);

    const registration = await this.registrations.findOneByOrFail({ id: refund.registrationId });
    const auction = await this.auctions.findOneByOrFail({ id: registration.auctionId });
    if (status === FAILED) await this.markFailed(refund);
    else if (status === 'processed') await this.notify(registration.telegramUserId, refund, auction, 'sent');
    else if (status === NEEDS_ATTENTION) await this.notify(registration.telegramUserId, refund, auction, 'details');
  }

  /** Paystack will not refund: put the deposit back to HELD so an admin can try again. */
  private async markFailed(refund: DepositRefund): Promise<void> {
    refund.status = FAILED;
    await this.refunds.save(refund);
    await this.registrations.update({ id: refund.registrationId, depositStatus: DepositStatus.REFUNDED }, { depositStatus: DepositStatus.HELD });
    this.logger.warn(`Refund ${refund.id} for ${refund.paymentReference} failed; deposit is held again`);
  }

  private async notify(telegramUserId: string, refund: DepositRefund, auction: Auction, kind: 'started' | 'sent' | 'details'): Promise<void> {
    try {
      if (kind === 'details') await this.telegram.requestRefundDetails(telegramUserId, refund.id, refundDetailsRequestMessage(auction, refund.amountMinor));
      else await this.telegram.sendText(telegramUserId, kind === 'sent' ? refundSentMessage(auction, refund.amountMinor) : refundStartedMessage(auction, refund.amountMinor));
    } catch (error) {
      this.logger.warn(`Could not message ${telegramUserId} about refund ${refund.id}: ${error instanceof Error ? error.message : error}`);
    }
  }
}
