import { z } from 'zod';

export const bidSchema = z.object({
  id: z.string(),
  auctionId: z.string(),
  telegramUserId: z.string(),
  telegramUsername: z.string().nullable(),
  telegramName: z.string().nullable(),
  amountMinor: z.string().regex(/^\d+$/),
  sequence: z.string().regex(/^\d+$/),
  requestId: z.string(),
  placedAt: z.iso.datetime({ offset: true }),
});

/** Server returns the latest 500 bids ordered by sequence, newest first. */
export const bidListSchema = z.array(bidSchema);

export const BID_HISTORY_LIMIT = 500;
