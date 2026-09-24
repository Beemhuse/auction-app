import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { admissionSchema, checkoutSchema, myRegistrationsSchema } from '../schemas/registration.schema';

export const useMyRegistrations = (options) => useQuery({
  queryKey: queryKeys.myRegistrations,
  queryFn: ({ signal }) => apiRequest('/registrations/mine', { signal, auth: 'telegram', schema: myRegistrationsSchema }),
  ...options,
});

/** Starts (or resumes) registration and returns a Paystack checkout link. */
export function useCreateRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ auctionId, email }) => apiRequest('/registrations', { auth: 'telegram', body: { auctionId, email }, schema: checkoutSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myRegistrations }),
  });
}

/** Consumes the one-time entry code; the returned room token is cached as room access. */
export function useRedeemCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ auctionId, code }) => apiRequest('/registrations/redeem', { auth: 'telegram', body: { auctionId, code }, schema: admissionSchema }),
    onSuccess: (admission) => {
      queryClient.setQueryData(queryKeys.roomAccess(admission.auctionId), admission);
      return queryClient.invalidateQueries({ queryKey: queryKeys.myRegistrations });
    },
  });
}

/**
 * Room token for an admitted bidder. Redemption seeds it; reopening the app fetches a fresh one,
 * since the entry code can only be used once.
 */
export const useRoomAccess = (auctionId, { enabled }) => useQuery({
  queryKey: queryKeys.roomAccess(auctionId),
  queryFn: () => apiRequest('/registrations/room-token', { auth: 'telegram', body: { auctionId }, schema: admissionSchema }),
  enabled,
  staleTime: Infinity,
});
