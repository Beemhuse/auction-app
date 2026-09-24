import { cn } from '@/lib/cn';

const TONES = {
  ACTIVE: 'positive',
  HELD: 'positive',
  APPLIED: 'positive',
  SCHEDULED: 'warning',
  PENDING: 'warning',
  CLOSED: 'negative',
  FORFEIT: 'negative',
  REFUNDED: 'neutral',
};

export function StatusBadge({ status, tone = TONES[status] ?? 'neutral', children }) {
  return <span className={cn('status', `status-${tone}`)}>{children ?? status}</span>;
}
