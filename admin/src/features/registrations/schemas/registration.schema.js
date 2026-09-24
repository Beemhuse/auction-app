import { z } from 'zod';

export const DEPOSIT_STATUSES = ['PENDING', 'HELD', 'APPLIED', 'REFUNDED', 'FORFEIT'];

const timestamp = z.iso.datetime({ offset: true });

// entryCodeDigest is deliberately absent: Zod strips unknown keys, so it never reaches the UI.
export const registrationSchema = z.object({
  id: z.string(),
  auctionId: z.string(),
  telegramUserId: z.string(),
  payerEmail: z.string(),
  paymentReference: z.string().nullable(),
  depositStatus: z.enum(DEPOSIT_STATUSES),
  codeRedeemedAt: timestamp.nullable(),
  createdAt: timestamp,
});

export const registrationListSchema = z.array(registrationSchema);
