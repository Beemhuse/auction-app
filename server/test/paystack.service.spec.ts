import { ConfigService } from '@nestjs/config';
import { PaystackService } from '../src/integrations/paystack/paystack.service';

describe('PaystackService', () => {
  const values: Record<string, string> = { PAYSTACK_SECRET_KEY: 'sk_test_secret', PAYSTACK_BASE_URL: 'https://api.paystack.test' };
  const service = new PaystackService({ getOrThrow: (key: string) => values[key] } as unknown as ConfigService);

  afterEach(() => jest.restoreAllMocks());

  it('initializes checkout using minor units and internal metadata', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: true, message: 'ok', data: { authorization_url: 'https://checkout.test/pay', access_code: 'access', reference: 'HMR-ref' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const result = await service.initialize({ email: 'bidder@example.com', amountMinor: '2000000', currency: 'NGN', reference: 'HMR-ref', auctionId: 'auction', registrationId: 'registration' });
    expect(result.checkoutUrl).toBe('https://checkout.test/pay');
    expect(fetchMock).toHaveBeenCalledWith('https://api.paystack.test/transaction/initialize', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer sk_test_secret' }) }));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ email: 'bidder@example.com', amount: '2000000', currency: 'NGN', reference: 'HMR-ref', metadata: { auction_id: 'auction', registration_id: 'registration' } });
    expect(body).not.toHaveProperty('callback_url');
  });

  it('sends the Telegram return link as callback_url when provided', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: true, message: 'ok', data: { authorization_url: 'https://checkout.test/pay', access_code: 'access', reference: 'HMR-ref' } }), { status: 200 }));
    await service.initialize({ email: 'bidder@example.com', amountMinor: '2000000', currency: 'NGN', reference: 'HMR-ref', auctionId: 'auction', registrationId: 'registration', callbackUrl: 'https://t.me/hammer_bot?start=paid_HMR-ref' });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).callback_url).toBe('https://t.me/hammer_bot?start=paid_HMR-ref');
  });

  describe('transactionStatus', () => {
    const reply = (status: number, body: unknown) => jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

    it('returns the Paystack transaction status', async () => {
      const fetchMock = reply(200, { status: true, message: 'Verification successful', data: { status: 'success', reference: 'HMR-ref' } });
      await expect(service.transactionStatus('HMR-ref')).resolves.toBe('success');
      expect(fetchMock).toHaveBeenCalledWith('https://api.paystack.test/transaction/verify/HMR-ref', expect.objectContaining({ headers: { Authorization: 'Bearer sk_test_secret' } }));
    });

    it('returns null when Paystack has no record of the reference', async () => {
      reply(400, { status: false, message: 'Transaction reference not found' });
      await expect(service.transactionStatus('HMR-missing')).resolves.toBeNull();
    });

    it('verifyTransaction returns the full transaction for confirmation', async () => {
      reply(200, { status: true, message: 'Verification successful', data: { id: 42, status: 'success', reference: 'HMR-ref', amount: 2000000, currency: 'NGN' } });
      await expect(service.verifyTransaction('HMR-ref')).resolves.toEqual({ id: 42, status: 'success', reference: 'HMR-ref', amount: 2000000, currency: 'NGN' });
    });

    it('throws on other provider errors', async () => {
      reply(500, { status: false, message: 'Server error' });
      await expect(service.transactionStatus('HMR-ref')).rejects.toThrow('Server error');
    });
  });
});
