import { z } from 'zod';

export const DEPOSIT_STATUSES = ['PENDING', 'HELD', 'APPLIED', 'REFUNDED', 'FORFEIT'];

const timestamp = z.iso.datetime({ offset: true });

// entryCodeDigest is deliberately absent: Zod strips unknown keys, so it never reaches the UI.
export const registrationSchema = z.object({
  id: z.string(),
  auctionId: z.string(),
  telegramUserId: z.string(),
  telegramUsername: z.string().nullable(),
  telegramName: z.string().nullable(),
  payerEmail: z.string(),
  paymentReference: z.string().nullable(),
  depositStatus: z.enum(DEPOSIT_STATUSES),
  codeRedeemedAt: timestamp.nullable(),
  createdAt: timestamp,
  refund: z.object({
    id: z.string(),
    status: z.string(),
    amountMinor: z.string(),
    customerDetails: z.string().nullable(),
    updatedAt: timestamp,
  }).nullable(),
});

export const registrationListSchema = z.array(registrationSchema);

export const verifyPaymentResultSchema = z.object({
  confirmed: z.boolean(),
  paystackStatus: z.string(),
  duplicate: z.boolean().optional(),
});
