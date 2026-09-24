/**
 * waiting: scheduled, the auctioneer has not opened bidding yet
 * live:    bidding open and the (possibly extended) end is still ahead
 * ended:   closed by the auctioneer, or the end time has passed
 */
export function roomPhase(state, now) {
  if (state.status === 'CLOSED') return 'ended';
  if (state.status === 'SCHEDULED') return 'waiting';
  return now >= new Date(state.effectiveEndsAt).getTime() ? 'ended' : 'live';
}

export const ENDING_SOON_MS = 60_000;
