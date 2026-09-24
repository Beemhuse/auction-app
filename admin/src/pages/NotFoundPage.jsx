import { ArrowLeft } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';

export function NotFoundPage({ title = 'Page not found', message = 'The page you are looking for does not exist.' }) {
  return (
    <div className="error-state">
      <h3>{title}</h3>
      <p>{message}</p>
      <LinkButton icon={ArrowLeft} to="/">Back to dashboard</LinkButton>
    </div>
  );
}
