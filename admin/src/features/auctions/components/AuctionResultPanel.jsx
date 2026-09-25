import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MessageDialog, TelegramUser } from '@/features/messages';
import { formatDate, formatMoney } from '@/lib/format';

const HEADLINES = {
  SOLD: { tone: 'positive', label: 'Sold' },
  RESERVE_NOT_MET: { tone: 'warning', label: 'Reserve not met' },
  NO_BIDS: { tone: 'neutral', label: 'No bids' },
  LEGACY: { tone: 'neutral', label: 'Closed' },
};

function nextStepsDraft(auction, result) {
  const money = (minor) => formatMoney(minor, auction.currency);
  const balance = BigInt(result.winningBidMinor) - BigInt(auction.depositAmountMinor);
  return [
    'Here are the next steps for your purchase.',
    '',
    `Winning bid: ${money(result.winningBidMinor)}`,
    `Deposit already paid: ${money(auction.depositAmountMinor)}`,
    `Balance to pay: ${money(String(balance > 0n ? balance : 0n))}`,
    '',
    'Payment details: ',
    'Collection or delivery: ',
  ].join('\n');
}

/** How a closed auction ended, with a way to reach the winner in their bot chat. */
export function AuctionResultPanel({ auction }) {
  const [messaging, setMessaging] = useState(false);
  const { result } = auction;
  if (!result) return null;
  const headline = HEADLINES[result.outcome] ?? HEADLINES.LEGACY;
  const winner = result.winnerTelegramUserId && { telegramUserId: result.winnerTelegramUserId, name: result.winnerName, username: result.winnerUsername };

  let summary;
  if (result.outcome === 'SOLD') summary = <>Won with <strong>{formatMoney(result.winningBidMinor, auction.currency)}</strong>. The winner has been told in their bot chat.</>;
  else if (result.outcome === 'RESERVE_NOT_MET') summary = <>The highest bid, <strong>{formatMoney(result.highestBidMinor, auction.currency)}</strong>, did not reach the reserve. The highest bidder has been told. Message them from the Registrations tab.</>;
  else if (result.outcome === 'NO_BIDS') summary = <>Nobody placed a bid. Admitted bidders have been told the auction ended.</>;
  else summary = <>This auction closed before results were recorded, so nobody was messaged. Check Bid history for the highest bid.</>;

  return (
    <section className="result-panel" aria-label="Auction result">
      <div className="result-copy">
        <div className="result-heading">
          <StatusBadge tone={headline.tone}>{headline.label}</StatusBadge>
          <span className="muted">Closed {formatDate(result.closedAt)}</span>
        </div>
        {winner && <div className="result-winner"><TelegramUser id={winner.telegramUserId} name={winner.name} username={winner.username} /></div>}
        <p>{summary}</p>
      </div>
      {winner && <Button icon={MessageCircle} onClick={() => setMessaging(true)}>Message winner</Button>}
      {messaging && <MessageDialog auction={auction} recipient={winner} initialText={nextStepsDraft(auction, result)} onClose={() => setMessaging(false)} />}
    </section>
  );
}
