import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';

const MAX_RETRIES = 2;

// Client errors (bad key, not found, validation) will not fix themselves on retry.
const shouldRetry = (failureCount, error) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: shouldRetry,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});
