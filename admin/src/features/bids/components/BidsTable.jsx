import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TelegramUser } from '@/features/messages';
import { formatDate, formatMoney } from '@/lib/format';
import { useBids } from '../api/queries';
import { BID_HISTORY_LIMIT } from '../schemas/bid.schema';

export function BidsTable({ auctionId, currency, auctionStatus, refetchInterval }) {
  const { data = [], isLoading, error, dataUpdatedAt } = useBids(auctionId, { refetchInterval });
  const leadingId = data[0]?.id;
  const leaderLabel = auctionStatus === 'CLOSED' ? 'Winning' : 'Leading';

  const columns = [
    { key: 'sequence', header: 'Sequence', render: (bid) => <span className="mono">#{bid.sequence}</span> },
    { key: 'telegramUserId', header: 'Bidder', render: (bid) => <TelegramUser id={bid.telegramUserId} name={bid.telegramName} username={bid.telegramUsername} /> },
    {
      key: 'amountMinor',
      header: 'Amount',
      render: (bid) => (
        <>
          <strong>{formatMoney(bid.amountMinor, currency)}</strong>
          {bid.id === leadingId && <> <StatusBadge tone="positive">{leaderLabel}</StatusBadge></>}
        </>
      ),
    },
    { key: 'placedAt', header: 'Placed', render: (bid) => formatDate(bid.placedAt) },
    { key: 'requestId', header: 'Request ID', render: (bid) => <span className="record-id">{bid.requestId}</span> },
  ];

  return (
    <>
      <div className="table-toolbar">
        <span className="muted">
          Accepted bids, newest first{data.length >= BID_HISTORY_LIMIT && ` (latest ${BID_HISTORY_LIMIT} shown)`}.
        </span>
        {refetchInterval && dataUpdatedAt > 0 && (
          <span className="live-indicator">Live · updated {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
        )}
      </div>
      <DataTable
        className="detail-table"
        columns={columns}
        rows={data}
        isLoading={isLoading}
        error={error}
        emptyMessage="No bids yet."
      />
    </>
  );
}
