import { z } from 'zod';
import { majorToMinor, minorToMajor } from '@/lib/money';
import { toLocalInput } from '@/lib/format';

export const AUCTION_STATUSES = ['SCHEDULED', 'ACTIVE', 'CLOSED'];
export const auctionStatusSchema = z.enum(AUCTION_STATUSES);

const minorAmount = z.string().regex(/^\d+$/);
const timestamp = z.iso.datetime({ offset: true });

/* ---------- API responses ---------- */

export const auctionSchema = z.object({
  id: z.string(),
  title: z.string(),
  currency: z.string().length(3),
  startingPriceMinor: minorAmount,
  reservePriceMinor: minorAmount.nullable(),
  depositAmountMinor: minorAmount,
  minIncrementMinor: minorAmount,
  status: auctionStatusSchema,
  startsAt: timestamp,
  endsAt: timestamp,
  effectiveEndsAt: timestamp,
  createdAt: timestamp,
});

export const auctionSummarySchema = auctionSchema.extend({
  registrationCount: z.number().int(),
  paidCount: z.number().int(),
  bidCount: z.number().int(),
  highestBidMinor: minorAmount.nullable(),
});

export const overviewSchema = z.object({
  totals: z.object({
    auctions: z.number().int(),
    active: z.number().int(),
    registrations: z.number().int(),
    bids: z.number().int(),
  }),
  auctions: z.array(auctionSummarySchema),
});

/* ---------- Create / edit form ---------- */

const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

const money = (label, { positive = false } = {}) => z.string().trim()
  .min(1, `${label} is required`)
  .regex(MONEY_PATTERN, `${label} must be a number with at most 2 decimals`)
  .refine((value) => !positive || Number(value) > 0, `${label} must be greater than zero`);

const localDateTime = (label) => z.string()
  .min(1, `${label} is required`)
  .refine((value) => !Number.isNaN(new Date(value).getTime()), `${label} is not a valid date`);

export const auctionFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO code, e.g. NGN'),
  status: auctionStatusSchema,
  startingPrice: money('Starting price'),
  reservePrice: z.string().trim()
    .refine((value) => value === '' || MONEY_PATTERN.test(value), 'Reserve price must be a number with at most 2 decimals'),
  deposit: money('Deposit', { positive: true }),
  increment: money('Minimum increment', { positive: true }),
  startsAt: localDateTime('Start time'),
  endsAt: localDateTime('End time'),
}).refine((values) => new Date(values.endsAt) > new Date(values.startsAt), {
  path: ['endsAt'],
  message: 'End time must be after the start time',
}).refine((values) => values.reservePrice === '' || Number(values.reservePrice) >= Number(values.startingPrice), {
  path: ['reservePrice'],
  message: 'Reserve price cannot be below the starting price',
});

const HOUR = 60 * 60_000;

export function toAuctionFormValues(auction) {
  const now = Date.now();
  return {
    title: auction?.title ?? '',
    currency: auction?.currency ?? 'NGN',
    status: auction?.status ?? 'SCHEDULED',
    startingPrice: minorToMajor(auction?.startingPriceMinor),
    reservePrice: minorToMajor(auction?.reservePriceMinor),
    deposit: minorToMajor(auction?.depositAmountMinor),
    increment: minorToMajor(auction?.minIncrementMinor),
    startsAt: toLocalInput(auction?.startsAt ?? now + HOUR),
    endsAt: toLocalInput(auction?.endsAt ?? now + 2 * HOUR),
  };
}

/** Validated form values -> request body matching the server's CreateAuctionDto. */
export function toAuctionPayload(values) {
  return {
    title: values.title,
    currency: values.currency,
    status: values.status,
    startingPriceMinor: majorToMinor(values.startingPrice),
    reservePriceMinor: values.reservePrice ? majorToMinor(values.reservePrice) : null,
    depositAmountMinor: majorToMinor(values.deposit),
    minIncrementMinor: majorToMinor(values.increment),
    startsAt: new Date(values.startsAt).toISOString(),
    endsAt: new Date(values.endsAt).toISOString(),
  };
}

/** Only the fields that differ from the current auction, for PATCH. */
export function diffAuctionPayload(auction, payload) {
  return Object.fromEntries(Object.entries(payload).filter(([field, value]) => {
    const current = auction[field];
    if (field === 'startsAt' || field === 'endsAt') return new Date(current).getTime() !== new Date(value).getTime();
    return (current ?? null) !== value;
  }));
}
