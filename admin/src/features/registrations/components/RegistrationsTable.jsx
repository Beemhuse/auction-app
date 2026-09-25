import { useState } from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { formatDate, maskEmail } from '@/lib/format';
import { useRegistrations } from '../api/queries';
import { useVerifyPayment } from '../api/mutations';
import { DEPOSIT_STATUSES } from '../schemas/registration.schema';

export function RegistrationsTable({ auctionId, refetchInterval }) {
  const [revealEmails, setRevealEmails] = useState(false);
  const [depositFilter, setDepositFilter] = useState('ALL');
  const { data = [], isLoading, error } = useRegistrations(auctionId, { refetchInterval });
  const rows = depositFilter === 'ALL' ? data : data.filter((row) => row.depositStatus === depositFilter);
  const toast = useToast();
  const verifyPayment = useVerifyPayment(auctionId);

  const verify = (row) => verifyPayment.mutate(row.id, {
    onSuccess: (result) => {
      if (!result.confirmed) toast.info(`Not paid yet. Paystack status: ${result.paystackStatus}`);
      else if (result.duplicate) toast.success('Already confirmed. Entry code re-sent.');
      else toast.success('Payment confirmed. Entry code sent.');
    },
    onError: (error) => toast.error(error.message),
  });

  const columns = [
    { key: 'telegramUserId', header: 'Telegram user', render: (row) => <span className="mono">{row.telegramUserId}</span> },
    { key: 'payerEmail', header: 'Email', render: (row) => (revealEmails ? row.payerEmail : maskEmail(row.payerEmail)) },
    { key: 'depositStatus', header: 'Deposit', render: (row) => <StatusBadge status={row.depositStatus} /> },
    {
      key: 'paymentReference',
      header: 'Payment reference',
      render: (row) => (row.paymentReference ? <span className="record-id">{row.paymentReference}</span> : <span className="muted">-</span>),
    },
    {
      key: 'codeRedeemedAt',
      header: 'Entry',
      render: (row) => (row.codeRedeemedAt ? formatDate(row.codeRedeemedAt) : <span className="muted">Not redeemed</span>),
    },
    { key: 'createdAt', header: 'Registered', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (row) => (row.paymentReference && row.depositStatus === 'PENDING' ? (
        <Button
          variant="secondary"
          icon={RefreshCw}
          onClick={() => verify(row)}
          disabled={verifyPayment.isPending && verifyPayment.variables === row.id}
          title="Ask Paystack whether this payment succeeded and confirm it if the webhook was missed"
        >
          {verifyPayment.isPending && verifyPayment.variables === row.id ? 'Checking...' : 'Verify payment'}
        </Button>
      ) : null),
    },
  ];

  return (
    <>
      <div className="table-toolbar">
        <select value={depositFilter} onChange={(event) => setDepositFilter(event.target.value)} aria-label="Filter by deposit status">
          <option value="ALL">All deposits ({data.length})</option>
          {DEPOSIT_STATUSES.map((status) => (
            <option key={status} value={status}>{status} ({data.filter((row) => row.depositStatus === status).length})</option>
          ))}
        </select>
        <Button variant="ghost" icon={revealEmails ? EyeOff : Eye} onClick={() => setRevealEmails((value) => !value)} aria-pressed={revealEmails}>
          {revealEmails ? 'Mask emails' : 'Reveal emails'}
        </Button>
      </div>
      <DataTable
        className="detail-table"
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        error={error}
        emptyMessage={data.length ? 'No registrations with this deposit status.' : 'No registrations yet.'}
      />
    </>
  );
}
