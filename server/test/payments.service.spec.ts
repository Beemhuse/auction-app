import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { EntryCodeService } from '../src/registrations/entry-code.service';
import { PaystackService } from '../src/integrations/paystack/paystack.service';
import { PaymentsService } from '../src/payments/payments.service';
import { TelegramBotService } from '../src/telegram/telegram-bot.service';

describe('PaymentsService.reconcile', () => {
  const paystack = { verifyTransaction: jest.fn() };
  const transaction = jest.fn();
  const service = new PaymentsService({} as ConfigService, { transaction } as unknown as DataSource, {} as EntryCodeService, {} as TelegramBotService, paystack as unknown as PaystackService, {} as never);

  afterEach(() => jest.resetAllMocks());

  it('rejects a reference Paystack does not know', async () => {
    paystack.verifyTransaction.mockResolvedValue(null);
    await expect(service.reconcile('HMR-missing')).rejects.toThrow('Paystack has no record');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('leaves an unpaid transaction untouched', async () => {
    paystack.verifyTransaction.mockResolvedValue({ id: 1, status: 'abandoned', reference: 'HMR-ref', amount: 2000000, currency: 'NGN' });
    await expect(service.reconcile('HMR-ref')).resolves.toEqual({ confirmed: false, paystackStatus: 'abandoned' });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('confirms a successful transaction under the same event id the webhook uses', async () => {
    paystack.verifyTransaction.mockResolvedValue({ id: 77, status: 'success', reference: 'HMR-ref', amount: 2000000, currency: 'NGN' });
    const existsBy = jest.fn().mockResolvedValue(true);
    const findOneBy = jest.fn().mockResolvedValue(null);
    transaction.mockImplementation((work: (manager: unknown) => unknown) => work({ existsBy, findOneBy }));
    await expect(service.reconcile('HMR-ref')).resolves.toEqual({ confirmed: true, paystackStatus: 'success', duplicate: true });
    expect(existsBy).toHaveBeenCalledWith(expect.anything(), { providerEventId: 'paystack:charge.success:77' });
  });
});
