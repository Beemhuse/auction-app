import { queryOptions, useQuery } from '@tanstack/react-query';
import { auctionKeys } from '@/features/auctions/api/keys';
import { adminRequest } from '@/lib/admin-client';
import { registrationListSchema } from '../schemas/registration.schema';

export const registrationsQueryOptions = (auctionId) => queryOptions({
  queryKey: auctionKeys.registrations(auctionId),
  queryFn: ({ signal }) => adminRequest(`/auctions/${auctionId}/registrations`, { signal, schema: registrationListSchema }),
});

export const useRegistrations = (auctionId, options) => useQuery({ ...registrationsQueryOptions(auctionId), ...options });
