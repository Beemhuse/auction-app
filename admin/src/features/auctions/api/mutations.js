import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminRequest } from '@/lib/admin-client';
import { auctionSchema } from '../schemas/auction.schema';
import { auctionKeys } from './keys';

export function useCreateAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminRequest('/auctions', { method: 'POST', body: payload, schema: auctionSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: auctionKeys.overview() }),
  });
}

export function useUpdateAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }) => adminRequest(`/auctions/${id}`, { method: 'PATCH', body: changes, schema: auctionSchema }),
    onSuccess: (updated) => {
      // Apply the new fields immediately, then refetch for fresh counters.
      queryClient.setQueryData(auctionKeys.overview(), (overview) => overview && {
        ...overview,
        auctions: overview.auctions.map((auction) => (auction.id === updated.id ? { ...auction, ...updated } : auction)),
      });
      return queryClient.invalidateQueries({ queryKey: auctionKeys.overview() });
    },
  });
}
