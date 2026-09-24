import { Navigate, useLocation, useNavigate } from 'react-router';
import { LoginForm } from '@/features/auth';
import { useAdminKey } from '@/lib/admin-session';

export function LoginPage() {
  const adminKey = useAdminKey();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from?.pathname
    ? `${location.state.from.pathname}${location.state.from.search ?? ''}`
    : '/';

  if (adminKey) return <Navigate to={destination} replace />;

  return (
    <main className="auth-screen">
      <LoginForm onSuccess={() => navigate(destination, { replace: true })} />
    </main>
  );
}
