import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { latestPossibleEnd, roomTokenExpiry, SOFT_CLOSE_CAP_MS } from '../src/auctions/auction-timing';
import { RoomTokenGuard } from '../src/auth/room-token.guard';
import { RoomTokenService } from '../src/auth/room-token.service';
import { BiddingService } from '../src/bidding/bidding.service';
import { miniAppAuctionUrl } from '../src/telegram/telegram-bot.service';

const AUCTION = {
  id: 'auction-1', status: 'ACTIVE', currency: 'NGN', startingPriceMinor: '100000', minIncrementMinor: '5000',
  startsAt: new Date('2026-10-01T10:00:00Z'), endsAt: new Date('2026-10-01T11:00:00Z'), effectiveEndsAt: new Date('2026-10-01T11:00:00Z'),
};

describe('auction timing', () => {
  it('lets room tokens outlive the soft-close cap', () => {
    expect(latestPossibleEnd(AUCTION).getTime()).toBe(AUCTION.endsAt.getTime() + SOFT_CLOSE_CAP_MS);
    expect(roomTokenExpiry(AUCTION).getTime()).toBeGreaterThan(latestPossibleEnd(AUCTION).getTime());
  });
});

describe('BiddingService.state', () => {
  const build = (live: Record<string, string>) => new BiddingService(
    { hgetall: jest.fn().mockResolvedValue(live) } as never,
    { findOneBy: jest.fn().mockResolvedValue(AUCTION) } as never,
    {} as never, {} as never, { findOneBy: jest.fn().mockResolvedValue(null) } as never, {} as never,
  );

  it('opens at the starting price before any bid', async () => {
    await expect(build({}).state('42', AUCTION.id)).resolves.toMatchObject({
      highestBidMinor: null, bidCount: 0, minimumNextBidMinor: '100000', leading: false, effectiveEndsAt: AUCTION.effectiveEndsAt.toISOString(),
    });
  });

  it('reports the leader, the next minimum, and extended end times from Redis', async () => {
    const extended = new Date('2026-10-01T11:01:00Z');
    const service = build({ amount: '120000', sequence: '3', leader: '42', endsAt: String(extended.getTime()) });
    await expect(service.state('42', AUCTION.id)).resolves.toMatchObject({
      highestBidMinor: '120000', bidCount: 3, minimumNextBidMinor: '125000', leading: true, effectiveEndsAt: extended.toISOString(),
    });
    await expect(service.state('7', AUCTION.id)).resolves.toMatchObject({ leading: false });
  });
});

describe('RoomTokenGuard', () => {
  const tokens = new RoomTokenService({ getOrThrow: () => 'this-is-a-test-secret-with-32-characters' } as unknown as ConfigService);
  const guard = new RoomTokenGuard(tokens);
  const context = (authorization?: string) => {
    const request: Record<string, unknown> = { headers: { authorization } };
    return { request, ctx: { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext };
  };

  it('attaches verified room claims', () => {
    const { request, ctx } = context(`Bearer ${tokens.issue('42', 'auction-1', new Date(Date.now() + 60_000))}`);
    expect(guard.canActivate(ctx)).toBe(true);
    expect(request.room).toMatchObject({ userId: '42', auctionId: 'auction-1' });
  });

  it('rejects missing or malformed credentials', () => {
    expect(() => guard.canActivate(context().ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context('Basic abc').ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(context('Bearer not-a-token').ctx)).toThrow(UnauthorizedException);
  });
});

describe('miniAppAuctionUrl', () => {
  it('adds the auction to an https Mini App URL', () => {
    expect(miniAppAuctionUrl('https://app.example.com/auction', 'abc')).toBe('https://app.example.com/auction?auction=abc');
  });

  it('refuses URLs Telegram cannot open', () => {
    expect(miniAppAuctionUrl(undefined, 'abc')).toBeNull();
    expect(miniAppAuctionUrl('http://localhost:5175', 'abc')).toBeNull();
    expect(miniAppAuctionUrl('not a url', 'abc')).toBeNull();
  });
});
