import { z } from 'zod';
import { compareMinor, majorToMinor } from '@/lib/money';

const timestamp = z.iso.datetime({ offset: true });
const minorAmount = z.string().regex(/^\d+$/);

export const liveStateSchema = z.object({
  auctionId: z.string(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'CLOSED']),
  currency: z.string().length(3),
  highestBidMinor: minorAmount.nullable(),
  bidCount: z.number().int(),
  minimumNextBidMinor: minorAmount,
  minIncrementMinor: minorAmount,
  startsAt: timestamp,
  effectiveEndsAt: timestamp,
  leading: z.boolean(),
  outcome: z.enum(['SOLD', 'RESERVE_NOT_MET', 'NO_BIDS', 'LEGACY']).nullable().optional(),
  serverTime: timestamp,
});

export const bidResultSchema = z.object({
  status: z.enum(['ACCEPTED', 'DUPLICATE', 'CLOSED', 'UNDERBID']),
  amountMinor: z.number().int().optional(),
  sequence: z.number().int().optional(),
  effectiveEndsAt: timestamp.optional(),
  detail: z.string().optional(),
});

const bidAcceptedEvent = z.object({
  version: z.literal(1),
  event: z.literal('bid.accepted'),
  eventId: z.string(),
  timestamp,
  auctionId: z.string(),
  payload: z.object({
    amountMinor: z.number().int(),
    sequence: z.number().int(),
    effectiveEndsAt: timestamp,
    minimumNextBidMinor: z.number().int(),
  }),
});

const otherEvent = z.object({
  version: z.literal(1),
  event: z.enum(['room.connected', 'auction.closed']),
  auctionId: z.string(),
});

export const roomEventSchema = z.union([bidAcceptedEvent, otherEvent]);

/** Custom bid in major units, validated against the current minimum. */
export const customBidSchema = (minimumMinor) => z.object({
  amount: z.string().trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with at most 2 decimals')
    .refine((value) => compareMinor(majorToMinor(value), minimumMinor) >= 0, 'That is below the minimum bid'),
});
