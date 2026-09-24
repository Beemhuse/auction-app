import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auctionKeys } from '@/features/auctions/api/keys';
import { overviewSchema } from '@/features/auctions/schemas/auction.schema';
import { adminRequest } from '@/lib/admin-client';
import { setAdminKey } from '@/lib/admin-session';

/** Verifies a candidate key against the overview endpoint and primes the cache with the result. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ adminKey }) => adminRequest('/overview', { key: adminKey, schema: overviewSchema }),
    onSuccess: (overview, { adminKey }) => {
      queryClient.clear();
      queryClient.setQueryData(auctionKeys.overview(), overview);
      setAdminKey(adminKey);
    },
  });
}
