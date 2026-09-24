import { formatDate, formatMoney } from '@/lib/format';

export function AuctionFacts({ auction }) {
  const money = (minor) => formatMoney(minor, auction.currency);
  const facts = [
    ['Opening bid', money(auction.startingPriceMinor)],
    ['Minimum raise', money(auction.minIncrementMinor)],
    ['Refundable deposit', money(auction.depositAmountMinor)],
    ['Starts', formatDate(auction.startsAt)],
    ['Ends', formatDate(auction.effectiveEndsAt)],
  ];
  return (
    <dl className="card facts">
      {facts.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}
