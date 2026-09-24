import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { RoomClaims, RoomTokenService } from './room-token.service';

export type RoomRequest = FastifyRequest & { room: RoomClaims };

/**
 * Authenticates live-room calls with the signed room token from redemption (`Authorization: Bearer <token>`).
 * Unlike Telegram initData, which goes stale while a Mini App stays open, it lasts for the whole auction.
 */
@Injectable()
export class RoomTokenGuard implements CanActivate {
  constructor(private readonly tokens: RoomTokenService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RoomRequest>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Room token required');
    request.room = this.tokens.verify(token);
    return true;
  }
}
