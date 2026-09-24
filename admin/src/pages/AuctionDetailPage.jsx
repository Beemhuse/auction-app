import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button, LinkButton } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { AuctionFormDialog, AuctionStatusActions, AuctionSummary, useAuction } from '@/features/auctions';
import { BidsTable } from '@/features/bids';
import { RegistrationsTable } from '@/features/registrations';
import { NotFoundPage } from './NotFoundPage';

const LIVE_REFRESH_MS = 5_000;

export function AuctionDetailPage() {
  const { auctionId } = useParams();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const { data: auction, isLoading, error, refetch } = useAuction(auctionId);

  const tab = params.get('tab') === 'bids' ? 'bids' : 'registrations';
  const setTab = (value) => setParams(value === 'registrations' ? {} : { tab: value }, { replace: true });

  if (isLoading) return <p className="page-loading">Loading auction...</p>;
  if (error) return <ErrorState title="Could not load this auction" error={error} onRetry={refetch} />;
  if (!auction) return <NotFoundPage title="Auction not found" message="It may have been removed, or the link is wrong." />;

  const liveRefresh = auction.status === 'ACTIVE' ? LIVE_REFRESH_MS : false;

  return (
    <>
      <div className="breadcrumb">
        <LinkButton variant="ghost" icon={ArrowLeft} to="/auctions">All auctions</LinkButton>
      </div>
      <section className="workspace detail-header">
        <PageHeader
          eyebrow="AUCTION DETAIL"
          title={auction.title}
          actions={(
            <>
              <AuctionStatusActions auction={auction} />
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            </>
          )}
        >
          <div className="detail-meta">
            <StatusBadge status={auction.status} />
            <span className="record-id">{auction.id}</span>
          </div>
        </PageHeader>
        <AuctionSummary auction={auction} />
      </section>

      <section className="detail-panel">
        <Tabs
          label="Auction records"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'registrations', label: 'Registrations', count: auction.registrationCount },
            { value: 'bids', label: 'Bid history', count: auction.bidCount },
          ]}
        />
        {tab === 'registrations'
          ? <RegistrationsTable auctionId={auction.id} refetchInterval={liveRefresh} />
          : <BidsTable auctionId={auction.id} currency={auction.currency} auctionStatus={auction.status} refetchInterval={liveRefresh} />}
      </section>

      {editing && <AuctionFormDialog auction={auction} onClose={() => setEditing(false)} />}
    </>
  );
}
