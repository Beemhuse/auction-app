import { Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDuration } from '@/lib/format';
import { ENDING_SOON_MS } from './phase';

export function RoomCountdown({ state, phase, now }) {
  if (phase === 'ended') return <div className="countdown countdown-ended"><Clock size={16} aria-hidden="true" />Bidding closed</div>;

  if (phase === 'waiting') {
    const untilStart = new Date(state.startsAt).getTime() - now;
    return (
      <div className="countdown">
        <Clock size={16} aria-hidden="true" />
        {untilStart > 0 ? <>Starts in <strong>{formatDuration(untilStart)}</strong></> : 'Starting shortly. Waiting for the auctioneer'}
      </div>
    );
  }

  const remaining = new Date(state.effectiveEndsAt).getTime() - now;
  const soon = remaining <= ENDING_SOON_MS;
  return (
    <div className={cn('countdown', soon && 'countdown-soon')} role="timer" aria-live={soon ? 'polite' : 'off'}>
      <Clock size={16} aria-hidden="true" />
      Ends in <strong>{formatDuration(remaining)}</strong>
      {soon && <span className="countdown-note">Late bids add time</span>}
    </div>
  );
}
