import { Inject, Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { LessThan, Repository } from 'typeorm';
import { Auction, AuctionRegistration, AuctionStatus, Bid, DepositStatus } from '../database/entities';
import { PlaceBidDto } from './dto';
import { REDIS } from './redis.provider';
import { randomUUID } from 'node:crypto';
import { AuctionEventsService } from './auction-events.service';
import { SOFT_CLOSE_CAP_MS, SOFT_CLOSE_WINDOW_MS } from '../auctions/auction-timing';

// The opening bid may equal the starting price; every later bid must beat the leader by the increment.
const PLACE_BID_SCRIPT = `
local existing = redis.call('HGET', KEYS[2], ARGV[1])
if existing then return {'DUPLICATE', existing} end
local now = tonumber(ARGV[2]); local ends = tonumber(redis.call('HGET', KEYS[1], 'endsAt') or '0')
if ends == 0 or now >= ends then return {'CLOSED', tostring(ends)} end
local current = tonumber(redis.call('HGET', KEYS[1], 'amount') or ARGV[3]); local increment = tonumber(ARGV[4]); local offered = tonumber(ARGV[5])
local minimum = current + increment
if tonumber(redis.call('HGET', KEYS[1], 'sequence') or '0') == 0 then minimum = current end
if offered < minimum then return {'UNDERBID', tostring(minimum)} end
local originalEnds = tonumber(redis.call('HGET', KEYS[1], 'originalEndsAt')); local window = tonumber(ARGV[7]); local cap = originalEnds + tonumber(ARGV[8])
if ends - now < window then ends = math.min(now + window, cap) end
local sequence = redis.call('HINCRBY', KEYS[1], 'sequence', 1)
redis.call('HSET', KEYS[1], 'amount', offered, 'leader', ARGV[6], 'endsAt', ends)
local packed = tostring(offered) .. ':' .. tostring(sequence) .. ':' .. tostring(ends)
redis.call('HSET', KEYS[2], ARGV[1], packed); redis.call('PEXPIRE', KEYS[2], 86400000)
return {'ACCEPTED', tostring(offered), tostring(sequence), tostring(ends)}
`;

const stateKey = (auctionId: string) => `hammer:v1:auction:${auctionId}:state`;
const requestsKey = (auctionId: string) => `hammer:v1:auction:${auctionId}:requests`;

@Injectable()
export class BiddingService implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis, @InjectRepository(Auction) private readonly auctions: Repository<Auction>, @InjectRepository(AuctionRegistration) private readonly registrations: Repository<AuctionRegistration>, @InjectRepository(Bid) private readonly bids: Repository<Bid>, private readonly events: AuctionEventsService) {}
  async place(telegramUserId: string, dto: PlaceBidDto) {
    const [auction, registration] = await Promise.all([this.auctions.findOneBy({ id: dto.auctionId }), this.registrations.findOneBy({ auctionId: dto.auctionId, telegramUserId })]);
    if (!auction || auction.status !== AuctionStatus.ACTIVE) throw new NotFoundException('Active auction not found');
    if (!registration || registration.depositStatus !== DepositStatus.HELD || !registration.codeRedeemedAt) throw new NotFoundException('Admitted registration not found');
    const key = stateKey(auction.id);
    await this.redis.hsetnx(key, 'amount', auction.startingPriceMinor);
    await this.redis.hsetnx(key, 'sequence', 0);
    await this.redis.hsetnx(key, 'originalEndsAt', auction.endsAt.getTime());
    await this.redis.hsetnx(key, 'endsAt', auction.effectiveEndsAt.getTime());
    const result = await this.redis.eval(PLACE_BID_SCRIPT, 2, key, requestsKey(auction.id), dto.requestId, Date.now(), auction.startingPriceMinor, auction.minIncrementMinor, dto.amountMinor, telegramUserId, SOFT_CLOSE_WINDOW_MS, SOFT_CLOSE_CAP_MS) as string[];
    if (result[0] === 'ACCEPTED') {
      const bid = this.bids.create({ auctionId: auction.id, telegramUserId, amountMinor: result[1], sequence: result[2], requestId: dto.requestId });
      await this.bids.save(bid);
      const endsAt = new Date(Number(result[3]));
      // Persist soft-close extensions so every reader (catalog, admin, room entry) sees the real end time.
      if (endsAt > auction.effectiveEndsAt) await this.auctions.update({ id: auction.id, effectiveEndsAt: LessThan(endsAt) }, { effectiveEndsAt: endsAt });
      const accepted = { status: 'ACCEPTED', amountMinor: Number(result[1]), sequence: Number(result[2]), effectiveEndsAt: endsAt.toISOString() } as const;
      await this.events.publish({ version: 1, event: 'bid.accepted', eventId: randomUUID(), timestamp: new Date().toISOString(), auctionId: auction.id, payload: { ...accepted, minimumNextBidMinor: Number(result[1]) + Number(auction.minIncrementMinor) } });
      return accepted;
    }
    return { status: result[0], detail: result[1] };
  }

  /** Snapshot of the live room for one admitted bidder: price, timing, and whether they lead. */
  async state(telegramUserId: string, auctionId: string) {
    const auction = await this.auctions.findOneBy({ id: auctionId });
    if (!auction) throw new NotFoundException('Auction not found');
    const live = await this.redis.hgetall(stateKey(auctionId));
    const bidCount = Number(live.sequence ?? 0);
    const highest = bidCount > 0 ? live.amount : null;
    const minimumNext = highest ? BigInt(highest) + BigInt(auction.minIncrementMinor) : BigInt(auction.startingPriceMinor);
    return {
      auctionId,
      status: auction.status,
      currency: auction.currency,
      highestBidMinor: highest,
      bidCount,
      minimumNextBidMinor: minimumNext.toString(),
      minIncrementMinor: auction.minIncrementMinor,
      startsAt: auction.startsAt.toISOString(),
      effectiveEndsAt: (live.endsAt ? new Date(Number(live.endsAt)) : auction.effectiveEndsAt).toISOString(),
      leading: bidCount > 0 && live.leader === telegramUserId,
      serverTime: new Date().toISOString(),
    };
  }
  async onModuleDestroy() { await this.redis.quit(); }
}
