import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { auctionStatusSchema } from '../schemas/auction.schema';

const filtersSchema = z.object({
  q: z.string().catch(''),
  status: z.union([z.literal('ALL'), auctionStatusSchema]).catch('ALL'),
});

/** Catalog filters stored in the URL so views are shareable and survive reloads. */
export function useAuctionFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersSchema.parse({
    q: params.get('q') ?? '',
    status: params.get('status') ?? 'ALL',
  }), [params]);

  const setFilter = useCallback((name, value) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (!value || value === 'ALL') next.delete(name); else next.set(name, value);
      return next;
    }, { replace: true });
  }, [setParams]);

  return { filters, setFilter };
}

export function filterAuctions(auctions, { q, status }) {
  const term = q.trim().toLowerCase();
  return auctions.filter((auction) => (
    (status === 'ALL' || auction.status === status)
    && (!term || auction.title.toLowerCase().includes(term) || auction.id.includes(term))
  ));
}
