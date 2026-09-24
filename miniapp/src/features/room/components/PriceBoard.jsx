import { Trophy, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';

export function PriceBoard({ state, phase }) {
  const hasBids = state.bidCount > 0;
  const standing = !hasBids ? null : state.leading ? 'leading' : 'outbid';

  return (
    <section className={cn('card price-board', standing && `price-board-${standing}`)} aria-live="polite">
      <p className="price-label">{hasBids ? (phase === 'ended' ? 'Winning bid' : 'Highest bid') : 'Opening bid'}</p>
      <p className="price-value">{formatMoney(hasBids ? state.highestBidMinor : state.minimumNextBidMinor, state.currency)}</p>
      <p className="price-meta">{hasBids ? `${state.bidCount} bid${state.bidCount === 1 ? '' : 's'}` : 'No bids yet'}</p>
      {standing === 'leading' && (
        <p className="standing standing-leading">
          <Trophy size={16} aria-hidden="true" />{phase === 'ended' ? 'You have the winning bid' : 'You are the highest bidder'}
        </p>
      )}
      {standing === 'outbid' && phase !== 'ended' && <p className="standing standing-outbid"><TrendingUp size={16} aria-hidden="true" />Place a bid to take the lead</p>}
    </section>
  );
}
