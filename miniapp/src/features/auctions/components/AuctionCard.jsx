import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/format';
import { AuctionStatus } from './AuctionStatus';

/** Catalog row. `badge` shows the viewer's own standing (registered, paid, joined). */
export function AuctionCard({ auction, badge }) {
  return (
    <Link to={`/auctions/${auction.id}`} className="card auction-card">
      <div className="auction-card-top">
        <AuctionStatus auction={auction} />
        {badge}
      </div>
      <h2 className="auction-card-title">{auction.title}</h2>
      <dl className="auction-card-facts">
        <div><dt>Opening bid</dt><dd>{formatMoney(auction.startingPriceMinor, auction.currency)}</dd></div>
        <div><dt>{auction.status === 'ACTIVE' ? 'Ends' : 'Starts'}</dt><dd>{formatDate(auction.status === 'ACTIVE' ? auction.effectiveEndsAt : auction.startsAt)}</dd></div>
      </dl>
      <ChevronRight className="auction-card-chevron" size={20} aria-hidden="true" />
    </Link>
  );
}
