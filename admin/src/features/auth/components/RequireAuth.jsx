import { Navigate, Outlet, useLocation } from 'react-router';
import { useAdminKey } from '@/lib/admin-session';

export function RequireAuth() {
  const adminKey = useAdminKey();
  const location = useLocation();
  if (!adminKey) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
