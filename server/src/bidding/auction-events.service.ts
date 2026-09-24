import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { Subject } from 'rxjs';
import { REDIS } from './redis.provider';

export type AuctionEvent = {
  version: 1;
  event: 'bid.accepted' | 'auction.closed';
  eventId: string;
  timestamp: string;
  auctionId: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class AuctionEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly subscriber: Redis;
  readonly events = new Subject<AuctionEvent>();
  constructor(@Inject(REDIS) private readonly publisher: Redis) { this.subscriber = publisher.duplicate(); }
  async onModuleInit() {
    await this.subscriber.subscribe('hammer:v1:auction-events');
    this.subscriber.on('message', (_channel, message) => {
      try { this.events.next(JSON.parse(message) as AuctionEvent); } catch { /* Invalid internal messages are ignored and observable in Redis logs. */ }
    });
  }
  async publish(event: AuctionEvent) { await this.publisher.publish('hammer:v1:auction-events', JSON.stringify(event)); }
  async onModuleDestroy() { this.events.complete(); await this.subscriber.quit(); }
}
