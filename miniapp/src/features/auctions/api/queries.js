import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { auctionListSchema, auctionSchema } from '../schemas/auction.schema';

/** Scheduled and active auctions, soonest first. */
export const useAuctions = () => useQuery({
  queryKey: queryKeys.auctions,
  queryFn: ({ signal }) => apiRequest('/auctions', { signal, schema: auctionListSchema }),
  refetchInterval: 60_000,
});

export const useAuction = (id) => useQuery({
  queryKey: queryKeys.auction(id),
  queryFn: ({ signal }) => apiRequest(`/auctions/${id}`, { signal, schema: auctionSchema }),
  refetchInterval: 30_000,
});
