import { formatDate, formatMoney, formatRelative } from '@/lib/format';

export function AuctionSummary({ auction }) {
  const money = (minor) => formatMoney(minor, auction.currency);
  const extended = new Date(auction.effectiveEndsAt).getTime() !== new Date(auction.endsAt).getTime();

  const facts = [
    { label: 'Highest bid', value: auction.highestBidMinor ? money(auction.highestBidMinor) : 'No bids yet', strong: true },
    { label: 'Bids placed', value: auction.bidCount },
    { label: 'Paid registrations', value: `${auction.paidCount} of ${auction.registrationCount}` },
    { label: 'Starting price', value: money(auction.startingPriceMinor) },
    { label: 'Reserve price', value: auction.reservePriceMinor ? money(auction.reservePriceMinor) : 'None' },
    { label: 'Deposit', value: money(auction.depositAmountMinor) },
    { label: 'Minimum increment', value: money(auction.minIncrementMinor) },
    { label: 'Starts', value: formatDate(auction.startsAt), note: formatRelative(auction.startsAt) },
    {
      label: 'Effective end',
      value: formatDate(auction.effectiveEndsAt),
      note: extended ? `Extended from ${formatDate(auction.endsAt)}` : formatRelative(auction.effectiveEndsAt),
    },
  ];

  return (
    <dl className="fact-grid">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd className={fact.strong ? 'fact-strong' : undefined}>{fact.value}</dd>
          {fact.note && <dd className="fact-note">{fact.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
