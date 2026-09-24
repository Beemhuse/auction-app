import { BadGatewayException } from '@nestjs/common';
import { DepositStatus, PaymentAttemptStatus } from '../src/database/entities';
import { RegistrationsService } from '../src/registrations/registrations.service';

const AUCTION = {
  id: 'auction-1', status: 'SCHEDULED', currency: 'NGN', depositAmountMinor: '2000000',
  startsAt: new Date(Date.now() + 24 * 60 * 60_000), endsAt: new Date(Date.now() + 25 * 60 * 60_000),
};

function setup(paystackStatus: () => Promise<string | null>) {
  const registration = { id: 'reg-1', auctionId: AUCTION.id, telegramUserId: '42', payerEmail: 'bidder@example.com', depositStatus: DepositStatus.PENDING, paymentReference: 'HMR-old' };
  const existing = { id: 'attempt-1', registrationId: registration.id, reference: 'HMR-old', checkoutUrl: 'https://checkout.paystack.com/old', status: PaymentAttemptStatus.PENDING };
  const auctions = { findOneBy: jest.fn().mockResolvedValue(AUCTION) };
  const registrations = { findOneBy: jest.fn().mockResolvedValue(registration), save: jest.fn(async (value) => value), create: jest.fn() };
  const paymentAttempts = {
    findOne: jest.fn().mockResolvedValue(existing),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => ({ ...value })),
  };
  const paystack = {
    transactionStatus: jest.fn(paystackStatus),
    initialize: jest.fn().mockResolvedValue({ checkoutUrl: 'https://checkout.paystack.com/new' }),
  };
  const links = { paymentReturnUrl: jest.fn().mockResolvedValue('https://t.me/hammer_bot?start=paid_x') };
  const service = new RegistrationsService(
    auctions as never, registrations as never, paymentAttempts as never,
    {} as never, {} as never, {} as never, paystack as never, links as never,
  );
  return { service, existing, paystack, paymentAttempts };
}

describe('RegistrationsService.create with an existing checkout', () => {
  it.each(['abandoned', 'ongoing', null])('reuses the link when Paystack reports %s', async (status) => {
    const { service, paystack } = setup(async () => status);
    await expect(service.create(AUCTION.id, '42', 'bidder@example.com'))
      .resolves.toMatchObject({ checkoutUrl: 'https://checkout.paystack.com/old', awaitingConfirmation: false });
    expect(paystack.initialize).not.toHaveBeenCalled();
  });

  it.each(['success', 'pending', 'processing', 'queued'])('does not issue a new checkout when Paystack reports %s', async (status) => {
    const { service, paystack, existing } = setup(async () => status);
    await expect(service.create(AUCTION.id, '42', 'bidder@example.com'))
      .resolves.toMatchObject({ checkoutUrl: '', status: DepositStatus.PENDING, awaitingConfirmation: true });
    expect(paystack.initialize).not.toHaveBeenCalled();
    expect(existing.status).toBe(PaymentAttemptStatus.PENDING); // only the webhook may mark it paid
  });

  it.each(['failed', 'reversed'])('replaces a %s transaction with a fresh checkout', async (status) => {
    const { service, paystack, existing } = setup(async () => status);
    await expect(service.create(AUCTION.id, '42', 'bidder@example.com'))
      .resolves.toMatchObject({ checkoutUrl: 'https://checkout.paystack.com/new', awaitingConfirmation: false });
    expect(existing.status).toBe(PaymentAttemptStatus.FAILED);
    expect(paystack.initialize).toHaveBeenCalledWith(expect.objectContaining({ callbackUrl: 'https://t.me/hammer_bot?start=paid_x' }));
  });

  it('falls back to reusing the link when Paystack cannot be reached', async () => {
    const { service, paystack } = setup(async () => { throw new BadGatewayException('Unable to reach Paystack'); });
    await expect(service.create(AUCTION.id, '42', 'bidder@example.com'))
      .resolves.toMatchObject({ checkoutUrl: 'https://checkout.paystack.com/old' });
    expect(paystack.initialize).not.toHaveBeenCalled();
  });
});

describe('RegistrationsService admission', () => {
  const auction = { id: 'auction-1', endsAt: new Date(Date.now() + 60 * 60_000) };
  const build = (registration: object | null, rows: object[] = []) => {
    const tokens = { issue: jest.fn().mockReturnValue('room-token') };
    const service = new RegistrationsService(
      { findOneByOrFail: jest.fn().mockResolvedValue(auction) } as never,
      { findOneBy: jest.fn().mockResolvedValue(registration), find: jest.fn().mockResolvedValue(rows) } as never,
      {} as never, {} as never, {} as never, tokens as never, {} as never, {} as never,
    );
    return { service, tokens };
  };

  it('re-issues room tokens only to admitted bidders, valid past the soft-close cap', async () => {
    const { service, tokens } = build({ id: 'reg-1', telegramUserId: '42', depositStatus: DepositStatus.HELD, codeRedeemedAt: new Date() });
    const result = await service.roomToken('auction-1', '42');
    expect(result).toMatchObject({ roomToken: 'room-token', admitted: true });
    expect(result.expiresAt.getTime()).toBeGreaterThan(auction.endsAt.getTime() + 15 * 60_000);
    expect(tokens.issue).toHaveBeenCalledWith('42', 'auction-1', result.expiresAt);
  });

  it.each([
    ['unregistered', null],
    ['unpaid', { depositStatus: DepositStatus.PENDING, codeRedeemedAt: null }],
    ['paid but not redeemed', { depositStatus: DepositStatus.HELD, codeRedeemedAt: null }],
  ])('refuses %s callers', async (_label, registration) => {
    await expect(build(registration).service.roomToken('auction-1', '42')).rejects.toThrow('Admitted registration not found');
  });

  it('lists the caller\'s registrations without sensitive fields', async () => {
    const rows = [{ id: 'reg-1', auctionId: 'auction-1', depositStatus: DepositStatus.HELD, codeRedeemedAt: new Date(), createdAt: new Date(), entryCodeDigest: 'secret', payerEmail: 'a@b.c' }];
    const [mine] = await build(null, rows).service.mine('42');
    expect(mine).toEqual({ registrationId: 'reg-1', auctionId: 'auction-1', depositStatus: DepositStatus.HELD, admitted: true, createdAt: rows[0].createdAt });
  });
});
