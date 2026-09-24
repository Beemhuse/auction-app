import { z } from 'zod';

const timestamp = z.iso.datetime({ offset: true });
const depositStatus = z.enum(['PENDING', 'HELD', 'APPLIED', 'REFUNDED', 'FORFEIT']);

/* ---------- API responses ---------- */

export const myRegistrationSchema = z.object({
  registrationId: z.string(),
  auctionId: z.string(),
  depositStatus,
  admitted: z.boolean(),
  createdAt: timestamp,
});

export const myRegistrationsSchema = z.array(myRegistrationSchema);

export const checkoutSchema = z.object({
  registrationId: z.string(),
  checkoutUrl: z.string(),
  status: depositStatus,
  awaitingConfirmation: z.boolean().default(false),
});

/** Returned by both code redemption and room-token re-issue. */
export const admissionSchema = z.object({
  auctionId: z.string(),
  registrationId: z.string(),
  admitted: z.literal(true),
  expiresAt: timestamp,
  roomToken: z.string().min(1),
});

/* ---------- Forms ---------- */

export const registerFormSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')),
});

const ENTRY_CODE = /^HMR-[A-Z2-9]{8}$/;

/** Accepts "hmr-abcd2345", "ABCD2345" or "HMR ABCD2345" and normalises to "HMR-ABCD2345". */
export const entryCodeFormSchema = z.object({
  code: z.string().trim().toUpperCase()
    .transform((value) => `HMR-${value.replace(/^HMR/, '').replace(/[\s-]/g, '')}`)
    .pipe(z.string().regex(ENTRY_CODE, 'Codes look like HMR-ABCD2345')),
});

/* ---------- Derived state ---------- */

/** Where the viewer stands in one auction, from their registration (or its absence). */
export function registrationStage(registration) {
  if (!registration) return 'unregistered';
  if (registration.admitted) return 'admitted';
  if (registration.depositStatus === 'HELD') return 'paid';
  if (registration.depositStatus === 'PENDING') return 'pending';
  return 'inactive';
}
