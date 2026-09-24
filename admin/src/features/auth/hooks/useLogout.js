import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearAdminKey } from '@/lib/admin-session';

export function useLogout() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    clearAdminKey();
    queryClient.clear();
  }, [queryClient]);
}
