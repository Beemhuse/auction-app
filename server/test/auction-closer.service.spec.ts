import Redis from 'ioredis';
import { DataSource, Repository } from 'typeorm';
import { AuctionCloserService } from '../src/bidding/auction-closer.service';
import { AuctionEventsService } from '../src/bidding/auction-events.service';
import { Auction, AuctionOutcome, AuctionRegistration, AuctionResult, AuctionStatus, Bid } from '../src/database/entities';
import { TelegramBotService } from '../src/telegram/telegram-bot.service';

const NOW = new Date('2026-09-25T12:00:00Z');

function setup({ reserve = null as string | null, top = null as Partial<Bid> | null, liveEnd = null as string | null, alreadyClosed = false } = {}) {
  const auction = {
    id: 'auction-1', title: 'Vintage watch', currency: 'NGN', status: AuctionStatus.ACTIVE, reservePriceMinor: reserve,
    effectiveEndsAt: new Date(NOW.getTime() - 60_000), updatedAt: new Date(NOW.getTime() - 60_000),
  } as Auction;
  const saved: unknown[] = [];
  const manager = {
    findOne: jest.fn(async (entity: unknown) => (entity === Auction ? auction : entity === Bid ? top : null)),
    existsBy: jest.fn(async () => alreadyClosed),
    save: jest.fn(async (value: unknown) => { saved.push(value); return value; }),
    create: jest.fn((_entity: unknown, value: unknown) => value),
  };
  const queryBuilder = { leftJoin: () => queryBuilder, where: () => queryBuilder, andWhere: () => queryBuilder, getMany: async () => [auction] };
  const redis = { hget: jest.fn(async () => liveEnd) };
  const dataSource = { transaction: jest.fn((work: (m: typeof manager) => unknown) => work(manager)) };
  const auctions = { createQueryBuilder: () => queryBuilder };
  const registrations = { findBy: jest.fn(async () => [{ telegramUserId: '100' }, { telegramUserId: '200' }, { telegramUserId: '300' }]) };
  const events = { publish: jest.fn(async () => undefined) };
  const telegram = { sendText: jest.fn(async (_to: string, _text: string) => undefined) };
  const service = new AuctionCloserService(
    redis as unknown as Redis, dataSource as unknown as DataSource, auctions as unknown as Repository<Auction>,
    registrations as unknown as Repository<AuctionRegistration>, events as unknown as AuctionEventsService, telegram as unknown as TelegramBotService,
  );
  const result = () => saved.find((value) => (value as AuctionResult).outcome) as AuctionResult | undefined;
  const messageTo = (id: string) => telegram.sendText.mock.calls.find(([to]) => to === id)?.[1] as string | undefined;
  return { service, auction, telegram, events, result, messageTo };
}

describe('AuctionCloserService', () => {
  it('closes an ended auction, records the winner and messages every admitted bidder', async () => {
    const { service, auction, telegram, events, result, messageTo } = setup({ top: { telegramUserId: '200', amountMinor: '5000000' } });
    await service.tick(NOW);
    expect(auction.status).toBe(AuctionStatus.CLOSED);
    expect(result()).toMatchObject({ outcome: AuctionOutcome.SOLD, winnerTelegramUserId: '200', winningBidMinor: '5000000' });
    expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({ event: 'auction.closed', auctionId: 'auction-1' }));
    expect(telegram.sendText).toHaveBeenCalledTimes(3);
    expect(messageTo('200')).toContain('Congratulations! You won Vintage watch');
    expect(messageTo('100')).toContain('You did not win this time');
  });

  it('does not declare a winner when the reserve is not met', async () => {
    const { service, result, messageTo } = setup({ reserve: '9000000', top: { telegramUserId: '200', amountMinor: '5000000' } });
    await service.tick(NOW);
    expect(result()).toMatchObject({ outcome: AuctionOutcome.RESERVE_NOT_MET, winnerTelegramUserId: null, highestBidMinor: '5000000' });
    expect(messageTo('200')).toContain('did not reach the reserve price');
    expect(messageTo('100')).toContain('without a sale');
  });

  it('records an auction with no bids', async () => {
    const { service, result, messageTo } = setup();
    await service.tick(NOW);
    expect(result()).toMatchObject({ outcome: AuctionOutcome.NO_BIDS, winnerTelegramUserId: null });
    expect(messageTo('100')).toContain('ended with no bids');
  });

  it('waits while a soft-close extension in Redis is still running', async () => {
    const { service, auction, telegram } = setup({ liveEnd: String(NOW.getTime() + 30_000) });
    await service.tick(NOW);
    expect(auction.status).toBe(AuctionStatus.ACTIVE);
    expect(telegram.sendText).not.toHaveBeenCalled();
  });

  it('announces nothing when another process already recorded the result', async () => {
    const { service, telegram, events } = setup({ alreadyClosed: true });
    await service.tick(NOW);
    expect(events.publish).not.toHaveBeenCalled();
    expect(telegram.sendText).not.toHaveBeenCalled();
  });

  it('keeps messaging the others when one user has blocked the bot', async () => {
    const { service, telegram } = setup({ top: { telegramUserId: '200', amountMinor: '5000000' } });
    telegram.sendText.mockRejectedValueOnce(new Error('This user has blocked the bot or never started it'));
    await service.tick(NOW);
    expect(telegram.sendText).toHaveBeenCalledTimes(3);
  });
});
