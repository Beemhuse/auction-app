import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TelegramIdentity = { id: string; username?: string; firstName?: string; lastName?: string };

// Mini App initData is signed once when the app opens and never refreshes, so it must outlast a session
// (waiting for an entry code, reading an auction). Live bidding uses room tokens instead.
export const MAX_AUTH_AGE_SECONDS = 60 * 60;

@Injectable()
export class TelegramAuthService {
  constructor(private readonly config: ConfigService) {}

  validate(initData: string, nowSeconds = Math.floor(Date.now() / 1000)): TelegramIdentity {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    const authDate = Number(params.get('auth_date'));
    if (!hash || !Number.isInteger(authDate) || authDate > nowSeconds + 30 || nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
      throw new UnauthorizedException('Invalid Telegram authentication');
    }
    params.delete('hash');
    const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
    const secret = createHmac('sha256', 'WebAppData').update(this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN')).digest();
    const expected = createHmac('sha256', secret).update(checkString).digest();
    if (!/^[a-f0-9]{64}$/i.test(hash)) throw new UnauthorizedException('Invalid Telegram authentication');
    let actual: Buffer;
    try { actual = Buffer.from(hash, 'hex'); } catch { throw new UnauthorizedException('Invalid Telegram authentication'); }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException('Invalid Telegram authentication');
    try {
      const user = JSON.parse(params.get('user') ?? '') as { id?: number | string; username?: string; first_name?: string; last_name?: string };
      if (!user.id) throw new Error();
      return { id: String(user.id), username: user.username, firstName: user.first_name, lastName: user.last_name };
    } catch { throw new UnauthorizedException('Invalid Telegram user'); }
  }
}
