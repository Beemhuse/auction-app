import { StatusPill } from '@/components/ui/StatusPill';

export function AuctionStatus({ auction }) {
  if (auction.status === 'ACTIVE') return <StatusPill tone="live" live>Live now</StatusPill>;
  if (auction.status === 'CLOSED') return <StatusPill tone="neutral">Ended</StatusPill>;
  return <StatusPill tone="info">Upcoming</StatusPill>;
}
