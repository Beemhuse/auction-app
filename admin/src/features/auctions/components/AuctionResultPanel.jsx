import { useState } from 'react';
import { MessageCircle, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { MessageDialog, TelegramUser } from '@/features/messages';
import { useRefundLosers } from '@/features/refunds';
import { useRegistrations } from '@/features/registrations';
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
  const [confirmingRefunds, setConfirmingRefunds] = useState(false);
  const { result } = auction;
  const { data: registrations = [] } = useRegistrations(auction.id, { enabled: Boolean(result) });
  const refundLosers = useRefundLosers(auction.id);
  const toast = useToast();
  if (!result) return null;
  const refundable = result.outcome === 'LEGACY' ? [] : registrations.filter((row) => row.depositStatus === 'HELD' && row.telegramUserId !== result.winnerTelegramUserId);
  const refundAll = () => refundLosers.mutate(undefined, {
    onSuccess: ({ refunded, failed }) => {
      if (failed.length) toast.error(`${refunded} refunded, ${failed.length} failed: ${failed[0].message}`);
      else toast.success(`${refunded} deposit${refunded === 1 ? '' : 's'} refunded`);
      setConfirmingRefunds(false);
    },
  });
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
      <div className="result-actions">
        {refundable.length > 0 && (
          <Button variant="secondary" icon={Undo2} onClick={() => setConfirmingRefunds(true)}>
            Refund {winner ? 'other bidders' : 'all bidders'} ({refundable.length})
          </Button>
        )}
        {winner && <Button icon={MessageCircle} onClick={() => setMessaging(true)}>Message winner</Button>}
      </div>
      {confirmingRefunds && (
        <ConfirmDialog
          title={`Refund ${refundable.length} deposit${refundable.length === 1 ? '' : 's'}?`}
          confirmLabel="Refund deposits"
          variant="danger"
          pending={refundLosers.isPending}
          error={refundLosers.error?.message}
          onConfirm={refundAll}
          onClose={() => { setConfirmingRefunds(false); refundLosers.reset(); }}
        >
          Every held deposit {winner ? 'except the winner’s ' : ''}is refunded in full through Paystack, and each bidder is told in the bot chat.
          {winner && ' The winner’s deposit stays held.'}
        </ConfirmDialog>
      )}
      {messaging && <MessageDialog auction={auction} recipient={winner} initialText={nextStepsDraft(auction, result)} onClose={() => setMessaging(false)} />}
    </section>
  );
}
