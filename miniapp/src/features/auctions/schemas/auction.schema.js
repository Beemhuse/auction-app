import { z } from 'zod';

const minorAmount = z.string().regex(/^\d+$/);
const timestamp = z.iso.datetime({ offset: true });

export const auctionSchema = z.object({
  id: z.string(),
  title: z.string(),
  currency: z.string().length(3),
  startingPriceMinor: minorAmount,
  reservePriceMinor: minorAmount.nullable(),
  depositAmountMinor: minorAmount,
  minIncrementMinor: minorAmount,
  status: z.enum(['SCHEDULED', 'ACTIVE', 'CLOSED']),
  startsAt: timestamp,
  endsAt: timestamp,
  effectiveEndsAt: timestamp,
});

export const auctionListSchema = z.array(auctionSchema);

/** Mirrors the server's REGISTRATION_CUTOFF_MS: registration closes 15 minutes before the start. */
const REGISTRATION_CUTOFF_MS = 15 * 60_000;

export const isRegistrationOpen = (auction, now = Date.now()) => (
  auction.status !== 'CLOSED' && now < new Date(auction.startsAt).getTime() - REGISTRATION_CUTOFF_MS
);
