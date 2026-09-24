import { queryOptions, useQuery } from '@tanstack/react-query';
import { adminRequest } from '@/lib/admin-client';
import { overviewSchema } from '../schemas/auction.schema';
import { auctionKeys } from './keys';

export const overviewQueryOptions = () => queryOptions({
  queryKey: auctionKeys.overview(),
  queryFn: ({ signal }) => adminRequest('/overview', { signal, schema: overviewSchema }),
  refetchInterval: 30_000,
});

export const useOverview = (options) => useQuery({ ...overviewQueryOptions(), ...options });

/**
 * The admin API has no single-auction endpoint; the overview carries every auction
 * with its counters, so detail views select from that cached list.
 */
export const useAuction = (id) => useOverview({
  select: (overview) => overview.auctions.find((auction) => auction.id === id) ?? null,
});
