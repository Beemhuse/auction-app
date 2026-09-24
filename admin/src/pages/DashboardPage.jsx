import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { AuctionFormDialog, useOverview } from '@/features/auctions';
import { AuctionWatchlist, MetricsGrid } from '@/features/dashboard';

const WATCHLIST_SIZE = 5;

export function DashboardPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const { data, isLoading, error, refetch } = useOverview();
  const auctions = data?.auctions ?? [];

  const live = auctions
    .filter((auction) => auction.status === 'ACTIVE')
    .sort((a, b) => new Date(a.effectiveEndsAt) - new Date(b.effectiveEndsAt))
    .slice(0, WATCHLIST_SIZE);
  const upcoming = auctions
    .filter((auction) => auction.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .slice(0, WATCHLIST_SIZE);

  return (
    <>
      <MetricsGrid totals={data?.totals} isLoading={isLoading} />
      <section className="workspace">
        <PageHeader
          eyebrow="TODAY"
          title="Operations overview"
          actions={<Button icon={Plus} onClick={() => setCreating(true)}>New auction</Button>}
        />
        {error ? (
          <ErrorState title="Could not load the overview" error={error} onRetry={refetch} />
        ) : (
          <div className="watchlist-grid">
            <AuctionWatchlist
              eyebrow="LIVE"
              title="Closing soonest"
              timing="ends"
              auctions={live}
              emptyMessage={isLoading ? 'Loading...' : 'No auctions are live right now.'}
              viewAllTo="/auctions?status=ACTIVE"
            />
            <AuctionWatchlist
              eyebrow="UPCOMING"
              title="Starting next"
              timing="starts"
              auctions={upcoming}
              emptyMessage={isLoading ? 'Loading...' : 'Nothing scheduled.'}
              viewAllTo="/auctions?status=SCHEDULED"
            />
          </div>
        )}
      </section>
      {creating && (
        <AuctionFormDialog auction={null} onClose={() => setCreating(false)} onSaved={(created) => navigate(`/auctions/${created.id}`)} />
      )}
    </>
  );
}
