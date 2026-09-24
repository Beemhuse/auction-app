import { cn } from '@/lib/cn';
import { formatMoney, formatTime } from '@/lib/format';

export function BidFeed({ feed, currency }) {
  return (
    <section className="card feed">
      <h2>Live bids</h2>
      {feed.length === 0 ? (
        <p className="muted feed-empty">New bids appear here as they happen.</p>
      ) : (
        <ol>
          {feed.map((bid, index) => (
            <li key={bid.sequence} className={cn(bid.mine && 'feed-mine', index === 0 && 'feed-top')}>
              <span className="feed-amount">{formatMoney(bid.amountMinor, currency)}</span>
              <span className="feed-who">{bid.mine ? 'You' : 'Another bidder'}</span>
              <span className="feed-time">{formatTime(bid.at)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
