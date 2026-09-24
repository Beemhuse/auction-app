import { ConfigService } from '@nestjs/config';
import { Api } from 'grammy';
import { parsePaymentReturn, TelegramLinkService } from '../src/telegram/telegram-link.service';

const REFERENCE = 'HMR-0123456789abcdef0123456789abcdef';

describe('TelegramLinkService', () => {
  const config = { getOrThrow: () => '123:token' } as unknown as ConfigService;

  afterEach(() => jest.restoreAllMocks());

  it('builds a bot deep link carrying the payment reference and caches the username', async () => {
    const getMe = jest.spyOn(Api.prototype, 'getMe').mockResolvedValue({ username: 'hammer_bot' } as Awaited<ReturnType<Api['getMe']>>);
    const links = new TelegramLinkService(config);
    await expect(links.paymentReturnUrl(REFERENCE)).resolves.toBe(`https://t.me/hammer_bot?start=paid_${REFERENCE}`);
    await links.paymentReturnUrl(REFERENCE);
    expect(getMe).toHaveBeenCalledTimes(1);
  });

  it('returns null and retries later when the bot username cannot be resolved', async () => {
    const getMe = jest.spyOn(Api.prototype, 'getMe').mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ username: 'hammer_bot' } as Awaited<ReturnType<Api['getMe']>>);
    const links = new TelegramLinkService(config);
    await expect(links.paymentReturnUrl(REFERENCE)).resolves.toBeNull();
    await expect(links.paymentReturnUrl(REFERENCE)).resolves.toContain('hammer_bot');
    expect(getMe).toHaveBeenCalledTimes(2);
  });
});

describe('parsePaymentReturn', () => {
  it('extracts the reference from a deep-link payload', () => {
    expect(parsePaymentReturn(`paid_${REFERENCE}`)).toBe(REFERENCE);
  });

  it('tolerates query parameters appended by the payment provider', () => {
    expect(parsePaymentReturn(`paid_${REFERENCE}?trxref=${REFERENCE}`)).toBe(REFERENCE);
  });

  it('ignores ordinary /start payloads', () => {
    expect(parsePaymentReturn('')).toBeNull();
    expect(parsePaymentReturn('paid_not-a-reference')).toBeNull();
  });
});
