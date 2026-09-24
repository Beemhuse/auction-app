import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Subscription } from 'rxjs';
import { RoomTokenService } from '../auth/room-token.service';
import { AuctionEvent, AuctionEventsService } from './auction-events.service';

type RoomSocket = WebSocket & { auctionId?: string };

@WebSocketGateway({ path: '/ws/v1/auctions' })
export class AuctionGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer() server: Server;
  private subscription?: Subscription;
  constructor(private readonly tokens: RoomTokenService, private readonly auctionEvents: AuctionEventsService) {}
  onModuleInit() { this.subscription = this.auctionEvents.events.subscribe((event) => this.broadcast(event)); }
  handleConnection(client: RoomSocket, request: { url?: string }) {
    try {
      const url = new URL(request.url ?? '', 'http://localhost');
      const claims = this.tokens.verify(url.searchParams.get('token') ?? '');
      client.auctionId = claims.auctionId;
      client.send(JSON.stringify({ version: 1, event: 'room.connected', eventId: claims.sessionId, timestamp: new Date().toISOString(), auctionId: claims.auctionId, payload: {} }));
    } catch { client.close(1008, 'Unauthorized'); }
  }
  private broadcast(event: AuctionEvent) {
    for (const client of this.server.clients as Set<RoomSocket>) {
      if (client.readyState === WebSocket.OPEN && client.auctionId === event.auctionId) client.send(JSON.stringify(event));
    }
  }
  onModuleDestroy() { this.subscription?.unsubscribe(); }
}
