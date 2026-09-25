import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auctionKeys } from '@/features/auctions/api/keys';
import { adminRequest } from '@/lib/admin-client';
import { verifyPaymentResultSchema } from '../schemas/registration.schema';

/** Asks Paystack about a registration's payment and confirms it server-side if the webhook was missed. */
export function useVerifyPayment(auctionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (registrationId) => adminRequest(`/registrations/${registrationId}/verify-payment`, { method: 'POST', schema: verifyPaymentResultSchema }),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: auctionKeys.registrations(auctionId) }),
      queryClient.invalidateQueries({ queryKey: auctionKeys.overview() }),
    ]),
  });
}
