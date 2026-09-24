import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Api } from 'grammy';

export const PAYMENT_RETURN_PREFIX = 'paid_';
const PAYMENT_RETURN_PATTERN = new RegExp(`^${PAYMENT_RETURN_PREFIX}(HMR-[0-9a-f]{32})`, 'i');

/** Extracts the payment reference from a `/start paid_<reference>` deep-link payload. */
export function parsePaymentReturn(payload: string): string | null {
  return PAYMENT_RETURN_PATTERN.exec(payload.trim())?.[1] ?? null;
}

/**
 * Builds t.me deep links back into the bot. Paystack redirects the payer here after checkout
 * so they land in the bot chat; the redirect never confirms payment, only the signed webhook does.
 */
@Injectable()
export class TelegramLinkService {
  private readonly logger = new Logger(TelegramLinkService.name);
  private readonly api: Api;
  private username?: Promise<string | null>;

  constructor(config: ConfigService) {
    this.api = new Api(config.getOrThrow<string>('TELEGRAM_BOT_TOKEN'));
  }

  async paymentReturnUrl(reference: string): Promise<string | null> {
    const username = await this.botUsername();
    return username ? `https://t.me/${username}?start=${PAYMENT_RETURN_PREFIX}${reference}` : null;
  }

  private botUsername(): Promise<string | null> {
    this.username ??= this.api.getMe().then((me) => me.username).catch(() => {
      this.logger.warn('Unable to resolve Telegram bot username; checkout will not redirect back to Telegram');
      this.username = undefined; // retry on the next checkout
      return null;
    });
    return this.username;
  }
}
