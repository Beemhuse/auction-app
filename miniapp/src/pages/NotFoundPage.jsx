import { useNavigate } from 'react-router';
import { StateMessage } from '@/components/ui/StateMessage';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <main className="page">
      <StateMessage title="Page not found" action="Back to auctions" onAction={() => navigate('/')} />
    </main>
  );
}
