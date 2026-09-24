import { Auction, AuctionStatus } from '../database/entities';

export const REGISTRATION_CUTOFF_MS = 15 * 60_000;

export function isRegistrationOpen(auction: Auction, now = Date.now()): boolean {
  return auction.status !== AuctionStatus.CLOSED && now < auction.startsAt.getTime() - REGISTRATION_CUTOFF_MS;
}
