import { StatusBadge } from '@/components/ui/StatusBadge';

const LABELS = {
  requesting: { tone: 'warning', label: 'Refund requested' },
  pending: { tone: 'warning', label: 'Refund pending' },
  processing: { tone: 'warning', label: 'Refund processing' },
  processed: { tone: 'positive', label: 'Refund sent' },
  failed: { tone: 'negative', label: 'Refund failed' },
  'needs-attention': { tone: 'negative', label: 'Needs bank details' },
};

export function RefundStatus({ refund }) {
  if (!refund) return null;
  const { tone, label } = LABELS[refund.status] ?? { tone: 'neutral', label: `Refund ${refund.status}` };
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
