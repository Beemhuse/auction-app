import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Gavel } from 'lucide-react';
import { ErrorMessage, Loading, StateMessage } from '@/components/ui/StateMessage';
import { AuctionCard, useAuctions } from '@/features/auctions';
import { RegistrationBadge, useMyRegistrations } from '@/features/registrations';
import { getTelegramUser, launchAuctionId } from '@/lib/telegram';

// Deep links open one auction first, but only once: going back should land on the list.
let launchHandled = false;

export function AuctionsPage() {
  const navigate = useNavigate();
  const auctions = useAuctions();
  const registrations = useMyRegistrations();
  const user = getTelegramUser();

  useEffect(() => {
    if (launchHandled) return;
    launchHandled = true;
    const auctionId = launchAuctionId();
    if (auctionId) navigate(`/auctions/${auctionId}`);
  }, [navigate]);

  const byAuction = new Map((registrations.data ?? []).map((registration) => [registration.auctionId, registration]));

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">{user?.first_name ? `Welcome, ${user.first_name}` : 'Welcome'}</p>
        <h1>Auctions</h1>
      </header>
      {auctions.isLoading && <Loading />}
      {auctions.error && <ErrorMessage error={auctions.error} onRetry={auctions.refetch} />}
      {auctions.data?.length === 0 && (
        <StateMessage icon={Gavel} title="No auctions right now">New auctions will appear here. Check back soon.</StateMessage>
      )}
      <div className="stack">
        {auctions.data?.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} badge={<RegistrationBadge registration={byAuction.get(auction.id)} />} />
        ))}
      </div>
    </main>
  );
}
