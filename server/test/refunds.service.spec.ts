import { DataSource, Repository } from 'typeorm';
import { Auction, AuctionOutcome, AuctionRegistration, AuctionResult, DepositRefund, DepositStatus, PaymentAttempt } from '../src/database/entities';
import { PaystackService } from '../src/integrations/paystack/paystack.service';
import { RefundsService } from '../src/payments/refunds.service';
import { TelegramBotService } from '../src/telegram/telegram-bot.service';

const AUCTION = { id: 'auction-1', title: 'Vintage watch', currency: 'NGN', depositAmountMinor: '2000000' } as Auction;

function setup(registrations: Partial<AuctionRegistration>[] = [{ id: 'reg-1', auctionId: 'auction-1', telegramUserId: '100', depositStatus: DepositStatus.HELD, paymentReference: 'HMR-1' }]) {
  const regs = registrations.map((row) => ({ ...row })) as AuctionRegistration[];
  const refunds: DepositRefund[] = [];
  const find = (where: Partial<AuctionRegistration>) => regs.find((row) => Object.entries(where).every(([key, value]) => row[key as keyof AuctionRegistration] === value)) ?? null;
  const manager = {
    findOne: jest.fn(async (_entity: unknown, options: { where: { id: string } }) => find({ id: options.where.id })),
    findOneBy: jest.fn(async (_entity: unknown, where: { registrationId: string }) => refunds.find((refund) => refund.registrationId === where.registrationId) ?? null),
    save: jest.fn(async (value: DepositRefund) => { if (!refunds.includes(value) && 'registrationId' in value) refunds.push(Object.assign(value, { id: value.id ?? `refund-${refunds.length + 1}` })); return value; }),
    create: jest.fn((_entity: unknown, value: object) => ({ ...value })),
  };
  const refundRepo = {
    save: jest.fn(async (value: DepositRefund) => value),
    findOneBy: jest.fn(async (where: Partial<DepositRefund>) => refunds.find((refund) => Object.entries(where).every(([key, value]) => refund[key as keyof DepositRefund] === value)) ?? null),
  };
  const registrationRepo = {
    findOneBy: jest.fn(async (where: Partial<AuctionRegistration>) => find(where)),
    findOneByOrFail: jest.fn(async (where: Partial<AuctionRegistration>) => find(where)),
    findBy: jest.fn(async (where: Partial<AuctionRegistration>) => regs.filter((row) => row.auctionId === where.auctionId && row.depositStatus === where.depositStatus)),
    update: jest.fn(async (where: Partial<AuctionRegistration>, changes: Partial<AuctionRegistration>) => { const row = find(where); if (row) Object.assign(row, changes); }),
  };
  const result = { auctionId: 'auction-1', outcome: AuctionOutcome.SOLD, winnerTelegramUserId: '200' } as AuctionResult;
  const paystack = { createRefund: jest.fn(async (_input: { reference: string; amountMinor?: string }) => ({ id: '555', status: 'pending' })), retryRefund: jest.fn() };
  const telegram = { sendText: jest.fn(async (_to: string, _text: string) => undefined), requestRefundDetails: jest.fn(async () => undefined) };
  const service = new RefundsService(
    { transaction: (work: (m: typeof manager) => unknown) => work(manager) } as unknown as DataSource,
    refundRepo as unknown as Repository<DepositRefund>,
    registrationRepo as unknown as Repository<AuctionRegistration>,
    { findOneByOrFail: async () => AUCTION } as unknown as Repository<Auction>,
    { findOneBy: async () => result } as unknown as Repository<AuctionResult>,
    { findOneBy: async () => null } as unknown as Repository<PaymentAttempt>,
    paystack as unknown as PaystackService,
    telegram as unknown as TelegramBotService,
  );
  return { service, regs, refunds, paystack, telegram };
}

describe('RefundsService', () => {
  it('refunds the full deposit, marks it REFUNDED and tells the bidder', async () => {
    const { service, regs, refunds, paystack, telegram } = setup();
    await expect(service.refundRegistration('reg-1')).resolves.toMatchObject({ status: 'pending', amountMinor: '2000000' });
    expect(paystack.createRefund).toHaveBeenCalledWith(expect.objectContaining({ reference: 'HMR-1', amountMinor: undefined }));
    expect(regs[0].depositStatus).toBe(DepositStatus.REFUNDED);
    expect(refunds[0]).toMatchObject({ providerRefundId: '555', status: 'pending' });
    expect(telegram.sendText.mock.calls[0][1]).toContain('We have started a refund of');
  });

  it('puts the deposit back to HELD when Paystack rejects the refund', async () => {
    const { service, regs, refunds, paystack } = setup();
    paystack.createRefund.mockRejectedValueOnce(new Error('Transaction has been fully reversed'));
    await expect(service.refundRegistration('reg-1')).rejects.toThrow('fully reversed');
    expect(regs[0].depositStatus).toBe(DepositStatus.HELD);
    expect(refunds[0].status).toBe('failed');
  });

  it('refuses a second refund while one is in progress', async () => {
    const { service, regs } = setup();
    await service.refundRegistration('reg-1');
    regs[0].depositStatus = DepositStatus.HELD;
    await expect(service.refundRegistration('reg-1')).rejects.toThrow('already in progress');
  });

  it('asks the bidder for bank details when Paystack needs them', async () => {
    const { service, paystack, telegram } = setup();
    paystack.createRefund.mockResolvedValueOnce({ id: '555', status: 'needs-attention' });
    await service.refundRegistration('reg-1');
    expect(telegram.requestRefundDetails).toHaveBeenCalledWith('100', 'refund-1', expect.stringContaining('account number, bank name, and account name'));
  });

  it('refunds every held deposit except the winner', async () => {
    const { service, paystack } = setup([
      { id: 'reg-1', auctionId: 'auction-1', telegramUserId: '100', depositStatus: DepositStatus.HELD, paymentReference: 'HMR-1' },
      { id: 'reg-2', auctionId: 'auction-1', telegramUserId: '200', depositStatus: DepositStatus.HELD, paymentReference: 'HMR-2' },
      { id: 'reg-3', auctionId: 'auction-1', telegramUserId: '300', depositStatus: DepositStatus.HELD, paymentReference: 'HMR-3' },
    ]);
    await expect(service.refundLosers('auction-1')).resolves.toEqual({ refunded: 2, failed: [] });
    expect(paystack.createRefund.mock.calls.map(([input]) => input.reference)).toEqual(['HMR-1', 'HMR-3']);
  });

  it('tells the bidder once when the refund webhook reports it processed', async () => {
    const { service, telegram } = setup();
    await service.refundRegistration('reg-1');
    telegram.sendText.mockClear();
    await service.applyWebhook('refund.processed', { id: 555, status: 'processed', transaction_reference: 'HMR-1' });
    await service.applyWebhook('refund.processed', { id: 555, status: 'processed', transaction_reference: 'HMR-1' });
    expect(telegram.sendText).toHaveBeenCalledTimes(1);
    expect(telegram.sendText.mock.calls[0][1]).toContain('Paystack has sent your refund');
  });
});
