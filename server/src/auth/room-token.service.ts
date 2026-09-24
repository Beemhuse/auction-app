import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type RoomClaims = { userId: string; auctionId: string; sessionId: string; expiresAt: number };

@Injectable()
export class RoomTokenService {
  constructor(private readonly config: ConfigService) {}
  issue(userId: string, auctionId: string, expiresAt: Date): string {
    const claims: RoomClaims = { userId, auctionId, sessionId: randomUUID(), expiresAt: expiresAt.getTime() };
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `${payload}.${this.sign(payload)}`;
  }
  verify(token: string): RoomClaims {
    const [payload, provided, extra] = token.split('.');
    if (!payload || !provided || extra) throw new UnauthorizedException('Invalid room token');
    if (!/^[a-f0-9]{64}$/i.test(provided)) throw new UnauthorizedException('Invalid room token');
    const expected = Buffer.from(this.sign(payload), 'hex');
    let actual: Buffer;
    try { actual = Buffer.from(provided, 'hex'); } catch { throw new UnauthorizedException('Invalid room token'); }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException('Invalid room token');
    try {
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as RoomClaims;
      if (!claims.userId || !claims.auctionId || !claims.sessionId || claims.expiresAt <= Date.now()) throw new Error();
      return claims;
    } catch { throw new UnauthorizedException('Expired or invalid room token'); }
  }
  private sign(payload: string): string { return createHmac('sha256', this.config.getOrThrow<string>('ENTRY_CODE_SECRET')).update(`room:v1:${payload}`).digest('hex'); }
}
