import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';

const shouldRetry = (failureCount, error) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, retry: shouldRetry, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
