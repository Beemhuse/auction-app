import { Auction } from '../database/entities';

/** A bid in the final minute pushes the end out to one minute from now. */
export const SOFT_CLOSE_WINDOW_MS = 60_000;
/** Soft-close extensions can never push the end more than this past the scheduled end. */
export const SOFT_CLOSE_CAP_MS = 15 * 60_000;
/** Slack for clock skew and final-event delivery after the auction closes. */
const ROOM_TOKEN_GRACE_MS = 5 * 60_000;

/** Latest moment an auction can still be running, given the soft-close cap. */
export function latestPossibleEnd(auction: Pick<Auction, 'endsAt'>): Date {
  return new Date(auction.endsAt.getTime() + SOFT_CLOSE_CAP_MS);
}

/** Room tokens outlive every possible extension, so a late bid never locks admitted bidders out. */
export function roomTokenExpiry(auction: Pick<Auction, 'endsAt'>): Date {
  return new Date(latestPossibleEnd(auction).getTime() + ROOM_TOKEN_GRACE_MS);
}
