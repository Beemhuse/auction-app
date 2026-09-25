import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { adminRequest } from '@/lib/admin-client';

const sentSchema = z.object({ sent: z.literal(true) });

/** Sends text through the bot to a user registered for the auction. */
export function useSendMessage(auctionId) {
  return useMutation({
    mutationFn: ({ telegramUserId, text }) => adminRequest(`/auctions/${auctionId}/messages`, { method: 'POST', body: { telegramUserId, text }, schema: sentSchema }),
  });
}
