import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { auctionKeys } from '@/features/auctions/api/keys';
import { adminRequest } from '@/lib/admin-client';

const refundResultSchema = z.object({ refundId: z.string(), status: z.string(), amountMinor: z.string().optional() });
const bulkResultSchema = z.object({
  refunded: z.number().int(),
  failed: z.array(z.object({ registrationId: z.string(), telegramUserId: z.string(), message: z.string() })),
});
const banksSchema = z.array(z.object({ id: z.string(), name: z.string() }));

function useRefreshRegistrations(auctionId) {
  const queryClient = useQueryClient();
  return () => Promise.all([
    queryClient.invalidateQueries({ queryKey: auctionKeys.registrations(auctionId) }),
    queryClient.invalidateQueries({ queryKey: auctionKeys.overview() }),
  ]);
}

export function useRefundDeposit(auctionId) {
  const refresh = useRefreshRegistrations(auctionId);
  return useMutation({
    mutationFn: ({ registrationId, amountMinor }) => adminRequest(`/registrations/${registrationId}/refund`, { method: 'POST', body: amountMinor ? { amountMinor } : {}, schema: refundResultSchema }),
    onSettled: refresh,
  });
}

export function useRefundLosers(auctionId) {
  const refresh = useRefreshRegistrations(auctionId);
  return useMutation({
    mutationFn: () => adminRequest(`/auctions/${auctionId}/refund-losers`, { method: 'POST', body: {}, schema: bulkResultSchema }),
    onSettled: refresh,
  });
}

export function useRetryRefund(auctionId) {
  const refresh = useRefreshRegistrations(auctionId);
  return useMutation({
    mutationFn: ({ refundId, accountNumber, bankId }) => adminRequest(`/refunds/${refundId}/retry`, { method: 'POST', body: { accountNumber, bankId }, schema: refundResultSchema }),
    onSettled: refresh,
  });
}

export const useBanks = (currency) => useQuery(queryOptions({
  queryKey: ['paystack', 'banks', currency],
  queryFn: ({ signal }) => adminRequest(`/banks?currency=${currency}`, { signal, schema: banksSchema }),
  staleTime: 60 * 60_000,
}));
