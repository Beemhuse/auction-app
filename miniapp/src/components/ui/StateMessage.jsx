import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';

export function Loading({ label = 'Loading...' }) {
  return (
    <div className="state-message" role="status">
      <Loader2 className="spin" size={28} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function StateMessage({ icon: Icon = AlertCircle, title, children, action, onAction }) {
  return (
    <div className="state-message">
      <Icon size={32} aria-hidden="true" />
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action && <Button variant="secondary" onClick={onAction}>{action}</Button>}
    </div>
  );
}

export function ErrorMessage({ error, onRetry, title = 'Something went wrong' }) {
  return <StateMessage title={title} action={onRetry && 'Try again'} onAction={onRetry}>{error?.message}</StateMessage>;
}
