import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TelegramAuthService } from '../src/auth/telegram-auth.service';

const token = '123456:test-token';
const config = { getOrThrow: () => token } as unknown as ConfigService;

function signedInitData(authDate: number, user = { id: 42, username: 'bidder' }): string {
  const params = new URLSearchParams({ auth_date: String(authDate), query_id: 'query-1', user: JSON.stringify(user) });
  const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', createHmac('sha256', secret).update(checkString).digest('hex'));
  return params.toString();
}

describe('TelegramAuthService', () => {
  const service = new TelegramAuthService(config);
  it('accepts canonical signed initData', () => expect(service.validate(signedInitData(1_000), 1_100)).toEqual({ id: '42', username: 'bidder' }));
  it('rejects tampering', () => expect(() => service.validate(signedInitData(1_000).replace('bidder', 'attacker'), 1_100)).toThrow(UnauthorizedException));
  it('rejects a malformed trailing signature nibble', () => expect(() => service.validate(`${signedInitData(1_000)}0`, 1_100)).toThrow(UnauthorizedException));
  it('rejects stale authentication', () => expect(() => service.validate(signedInitData(1_000), 1_000 + 3_601)).toThrow(UnauthorizedException));
});
