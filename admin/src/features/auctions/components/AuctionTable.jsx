import { Link } from 'react-router';
import { Eye, Pencil } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatMoney } from '@/lib/format';

export function AuctionTable({ auctions, isLoading, error, onEdit, emptyMessage = 'No auctions match this view.' }) {
  const columns = [
    {
      key: 'title',
      header: 'Auction',
      render: (auction) => (
        <>
          <Link className="auction-name" to={`/auctions/${auction.id}`}>{auction.title}</Link>
          <span className="record-id">{auction.id}</span>
        </>
      ),
    },
    { key: 'status', header: 'Status', render: (auction) => <StatusBadge status={auction.status} /> },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (auction) => <>{formatDate(auction.startsAt)}<br /><span className="muted">to {formatDate(auction.effectiveEndsAt)}</span></>,
    },
    { key: 'deposit', header: 'Deposit', render: (auction) => formatMoney(auction.depositAmountMinor, auction.currency) },
    {
      key: 'registrations',
      header: 'Registered',
      render: (auction) => <>{auction.paidCount} paid <span className="muted">/ {auction.registrationCount}</span></>,
    },
    {
      key: 'bids',
      header: 'Bids',
      render: (auction) => (
        <>
          {auction.bidCount}
          {auction.highestBidMinor && <><br /><span className="muted">{formatMoney(auction.highestBidMinor, auction.currency)}</span></>}
        </>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      srOnlyHeader: true,
      render: (auction) => (
        <div className="row-actions">
          <Link className="table-button" to={`/auctions/${auction.id}`} title="Inspect auction" aria-label={`Inspect ${auction.title}`}>
            <Eye size={15} aria-hidden="true" />
          </Link>
          {onEdit && <IconButton compact icon={Pencil} size={15} label={`Edit ${auction.title}`} onClick={() => onEdit(auction)} />}
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} rows={auctions} isLoading={isLoading} error={error} emptyMessage={emptyMessage} />;
}
