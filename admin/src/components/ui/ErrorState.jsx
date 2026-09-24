import { RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({ title = 'Something went wrong', error, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <h3>{title}</h3>
      {error?.message && <p>{error.message}</p>}
      {onRetry && <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>Try again</Button>}
    </div>
  );
}
