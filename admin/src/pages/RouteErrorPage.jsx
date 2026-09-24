import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorState } from '@/components/ui/ErrorState';

export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : error?.message;
  return (
    <main className="app-shell">
      <ErrorState title="This page crashed" error={{ message }} onRetry={() => window.location.reload()} />
    </main>
  );
}
