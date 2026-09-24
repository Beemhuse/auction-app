import { queryOptions, useQuery } from '@tanstack/react-query';
import { auctionKeys } from '@/features/auctions/api/keys';
import { adminRequest } from '@/lib/admin-client';
import { bidListSchema } from '../schemas/bid.schema';

export const bidsQueryOptions = (auctionId) => queryOptions({
  queryKey: auctionKeys.bids(auctionId),
  queryFn: ({ signal }) => adminRequest(`/auctions/${auctionId}/bids`, { signal, schema: bidListSchema }),
});

export const useBids = (auctionId, options) => useQuery({ ...bidsQueryOptions(auctionId), ...options });
