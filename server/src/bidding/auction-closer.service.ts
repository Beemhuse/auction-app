import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import { Auction, AuctionOutcome, AuctionRegistration, AuctionResult, AuctionStatus, Bid, DepositStatus } from '../database/entities';
import { TelegramBotService, auctionEndedMessage, reserveNotMetMessage, winnerMessage } from '../telegram/telegram-bot.service';
import { AuctionEventsService } from './auction-events.service';
import { REDIS } from './redis.provider';
import { stateKey } from './bidding.service';

const TICK_MS = 15_000;
/** Lets the last accepted bid finish saving before the result is read. */
const SETTLE_MS = 5_000;

type Closed = { auction: Auction; result: AuctionResult; topBidder: string | null };

/**
 * Closes auctions once bidding has ended, records who won, and tells bidders in the bot chat.
 * Also finalises auctions an admin closed by hand. The result row makes each auction finalise once.
 */
@Injectable()
export class AuctionCloserService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AuctionCloserService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly dataSource: DataSource,
    @InjectRepository(Auction) private readonly auctions: Repository<Auction>,
    @InjectRepository(AuctionRegistration) private readonly registrations: Repository<AuctionRegistration>,
    private readonly events: AuctionEventsService,
    private readonly telegram: TelegramBotService,
  ) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  onModuleDestroy() { clearInterval(this.timer); }

  async tick(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const settled = new Date(now.getTime() - SETTLE_MS);
      const candidates = await this.auctions.createQueryBuilder('auction')
        .leftJoin(AuctionResult, 'result', 'result.auction_id = auction.id')
        .where('result.auction_id IS NULL')
        .andWhere('((auction.status = :active AND auction.effectiveEndsAt < :settled) OR (auction.status = :closed AND auction.updatedAt < :settled))', { active: AuctionStatus.ACTIVE, closed: AuctionStatus.CLOSED, settled })
        .getMany();
      for (const auction of candidates) {
        try {
          if (auction.status === AuctionStatus.ACTIVE && !await this.biddingOver(auction, settled)) continue;
          const closed = await this.close(auction.id);
          if (closed) await this.announce(closed);
        } catch (error) {
          this.logger.error(`Could not close auction ${auction.id}`, error instanceof Error ? error.stack : undefined);
        }
      }
    } catch (error) {
      this.logger.error('Could not look for auctions to close', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }

  /** Redis holds the authoritative end while bidding; a soft-close extension may not be in the database yet. */
  private async biddingOver(auction: Auction, settled: Date): Promise<boolean> {
    const liveEnd = Number(await this.redis.hget(stateKey(auction.id), 'endsAt') ?? 0);
    return Math.max(liveEnd, auction.effectiveEndsAt.getTime()) < settled.getTime();
  }

  private async close(auctionId: string): Promise<Closed | null> {
    return this.dataSource.transaction(async (manager) => {
      const auction = await manager.findOne(Auction, { where: { id: auctionId }, lock: { mode: 'pessimistic_write' } });
      if (!auction || auction.status === AuctionStatus.SCHEDULED) return null;
      if (await manager.existsBy(AuctionResult, { auctionId })) return null;
      if (auction.status === AuctionStatus.ACTIVE) {
        auction.status = AuctionStatus.CLOSED;
        await manager.save(auction);
      }
      const top = await manager.findOne(Bid, { where: { auctionId }, order: { sequence: 'DESC' } });
      const reserveMet = !auction.reservePriceMinor || (top !== null && BigInt(top.amountMinor) >= BigInt(auction.reservePriceMinor));
      const outcome = !top ? AuctionOutcome.NO_BIDS : reserveMet ? AuctionOutcome.SOLD : AuctionOutcome.RESERVE_NOT_MET;
      const result = await manager.save(manager.create(AuctionResult, {
        auctionId,
        outcome,
        winnerTelegramUserId: outcome === AuctionOutcome.SOLD ? top!.telegramUserId : null,
        winningBidMinor: outcome === AuctionOutcome.SOLD ? top!.amountMinor : null,
        highestBidMinor: top?.amountMinor ?? null,
      }));
      return { auction, result, topBidder: top?.telegramUserId ?? null };
    });
  }

  private async announce({ auction, result, topBidder }: Closed): Promise<void> {
    this.logger.log(`Closed auction ${auction.id}: ${result.outcome}`);
    await this.events.publish({ version: 1, event: 'auction.closed', eventId: randomUUID(), timestamp: new Date().toISOString(), auctionId: auction.id, payload: { outcome: result.outcome, winningBidMinor: result.winningBidMinor } });

    // Everyone whose deposit is held hears the result; the top bidder gets their own message.
    const admitted = await this.registrations.findBy({ auctionId: auction.id, depositStatus: In([DepositStatus.HELD, DepositStatus.APPLIED]) });
    const messages = new Map<string, string>();
    for (const registration of admitted) messages.set(registration.telegramUserId, auctionEndedMessage(auction, result.outcome, result.winningBidMinor));
    if (result.outcome === AuctionOutcome.SOLD && result.winnerTelegramUserId) messages.set(result.winnerTelegramUserId, winnerMessage(auction, result.winningBidMinor!));
    if (result.outcome === AuctionOutcome.RESERVE_NOT_MET && topBidder) messages.set(topBidder, reserveNotMetMessage(auction, result.highestBidMinor!));

    for (const [telegramUserId, text] of messages) {
      try {
        await this.telegram.sendText(telegramUserId, text);
      } catch (error) {
        this.logger.warn(`Could not tell ${telegramUserId} that auction ${auction.id} ended: ${error instanceof Error ? error.message : error}`);
      }
    }
  }
}
