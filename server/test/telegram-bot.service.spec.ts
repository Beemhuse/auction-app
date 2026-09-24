import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DepositStatus } from '../src/database/entities';
import { paymentReturnMessage, registrationErrorMessage } from '../src/telegram/telegram-bot.service';

describe('registrationErrorMessage', () => {
  it('explains a closed registration window', () => {
    expect(registrationErrorMessage(new BadRequestException('Registration is closed')))
      .toBe('Registration for this auction has closed. Choose another auction with /auctions.');
  });

  it('explains a stale auction selection', () => {
    expect(registrationErrorMessage(new NotFoundException('Auction not found')))
      .toBe('This auction is no longer available. Use /auctions to refresh the list.');
  });

  it('does not expose payment provider details', () => {
    expect(registrationErrorMessage(new BadGatewayException('provider internals')))
      .toBe('Payment checkout is temporarily unavailable. Please try again shortly.');
  });
});

describe('paymentReturnMessage', () => {
  const auction = { title: 'Founders Lot', startsAt: new Date('2026-10-01T10:00:00.000Z') } as never;
  const result = (overrides: object) => ({ auction, depositStatus: DepositStatus.PENDING, redeemed: false, entryCode: null, ...overrides });

  it('rejects references that do not belong to the sender', () => {
    expect(paymentReturnMessage(null)).toContain('could not find that payment');
  });

  it('asks the payer to wait for webhook confirmation while pending', () => {
    expect(paymentReturnMessage(result({}))).toContain('waiting for Paystack to confirm');
  });

  it('shows the entry code once the webhook has confirmed the deposit', () => {
    expect(paymentReturnMessage(result({ depositStatus: DepositStatus.HELD, entryCode: 'HMR-ABCD2345' }))).toContain('Entry code: HMR-ABCD2345');
  });

  it('does not repeat a code that has been redeemed', () => {
    const message = paymentReturnMessage(result({ depositStatus: DepositStatus.HELD, redeemed: true }));
    expect(message).toContain('already been used');
    expect(message).not.toContain('HMR-');
  });
});
