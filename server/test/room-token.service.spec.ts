import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { RoomTokenService } from '../src/auth/room-token.service';

describe('RoomTokenService', () => {
  const config = { getOrThrow: () => 'this-is-a-test-secret-with-32-characters' } as unknown as ConfigService;
  const service = new RoomTokenService(config);
  it('round-trips bound room claims', () => {
    const token = service.issue('42', 'auction-1', new Date(Date.now() + 60_000));
    expect(service.verify(token)).toMatchObject({ userId: '42', auctionId: 'auction-1' });
  });
  it('rejects tampered tokens', () => {
    const token = service.issue('42', 'auction-1', new Date(Date.now() + 60_000));
    expect(() => service.verify(`${token}0`)).toThrow(UnauthorizedException);
  });
  it('rejects expired tokens', () => {
    const token = service.issue('42', 'auction-1', new Date(Date.now() - 1));
    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });
});
