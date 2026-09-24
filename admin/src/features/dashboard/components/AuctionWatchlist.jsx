import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatMoney, formatRelative } from '@/lib/format';

/** Compact list of auctions with a single timing column, used on the dashboard. */
export function AuctionWatchlist({ title, eyebrow, auctions, timing, emptyMessage, viewAllTo }) {
  return (
    <section className="watchlist">
      <div className="watchlist-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        {viewAllTo && <Link className="text-link" to={viewAllTo}>View all <ArrowRight size={14} aria-hidden="true" /></Link>}
      </div>
      {auctions.length === 0 ? (
        <p className="watchlist-empty">{emptyMessage}</p>
      ) : (
        <ul>
          {auctions.map((auction) => {
            const at = timing === 'ends' ? auction.effectiveEndsAt : auction.startsAt;
            // Status only changes when an operator acts, so a passed time means someone needs to step in.
            const overdue = new Date(at).getTime() < Date.now();
            const verb = timing === 'ends' ? 'end' : 'start';
            return (
              <li key={auction.id}>
                <Link to={`/auctions/${auction.id}`} className="watchlist-row">
                  <span className="watchlist-main">
                    <span className="auction-name">{auction.title}</span>
                    <span className="muted">
                      {auction.highestBidMinor
                        ? `High bid ${formatMoney(auction.highestBidMinor, auction.currency)} · ${auction.bidCount} bids`
                        : `${auction.paidCount} paid of ${auction.registrationCount} registered`}
                    </span>
                  </span>
                  <span className="watchlist-meta">
                    <StatusBadge status={auction.status} />
                    {overdue
                      ? <span className="overdue" title={formatDate(at)}>Due to {verb} {formatRelative(at)}</span>
                      : <span className="muted" title={formatDate(at)}>{verb === 'end' ? 'Ends' : 'Starts'} {formatRelative(at)}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
