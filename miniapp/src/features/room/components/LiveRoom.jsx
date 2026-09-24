import { Loading, ErrorMessage } from '@/components/ui/StateMessage';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/format';
import { haptic } from '@/lib/telegram';
import { useLiveRoom } from '../hooks/useLiveRoom';
import { useServerNow } from '../hooks/useServerNow';
import { BidFeed } from './BidFeed';
import { BidPanel } from './BidPanel';
import { ConnectionBadge } from './ConnectionBadge';
import { PriceBoard } from './PriceBoard';
import { RoomCountdown } from './RoomCountdown';
import { roomPhase } from './phase';

export function LiveRoom({ auctionId, roomToken }) {
  const toast = useToast();
  const { live, feed, connection, placeBid } = useLiveRoom(auctionId, roomToken);
  const state = live.data;
  const now = useServerNow(state?.serverTime, state?.receivedAt);

  if (live.isLoading) return <Loading label="Joining the room..." />;
  if (live.error) return <ErrorMessage title="Could not join the room" error={live.error} onRetry={live.refetch} />;

  const phase = roomPhase(state, now);
  const money = (minor) => formatMoney(minor, state.currency);

  let disabledReason = null;
  if (phase === 'waiting') disabledReason = 'Bidding opens when the auctioneer starts the auction.';
  else if (phase === 'ended') disabledReason = state.leading ? 'Congratulations! We will contact you in the bot chat about next steps.' : 'This auction has ended.';
  else if (state.leading) disabledReason = 'You are winning. We will let you know here if someone outbids you.';

  const bid = (amountMinor) => placeBid.mutate(amountMinor, {
    onSuccess: (result) => {
      if (result.status === 'ACCEPTED') { haptic.success(); toast.success(`Bid of ${money(result.amountMinor)} placed`); }
      else if (result.status === 'UNDERBID') { haptic.warning(); toast.error(`Someone bid first. The minimum is now ${money(result.detail)}.`); }
      else if (result.status === 'CLOSED') { haptic.error(); toast.error('Bidding has closed.'); }
    },
    onError: (error) => {
      haptic.error();
      toast.error(error.status === 404 ? 'Bidding is not open right now.' : error.message);
    },
  });

  return (
    <div className="room">
      <div className="room-bar">
        <RoomCountdown state={state} phase={phase} now={now} />
        <ConnectionBadge status={connection} />
      </div>
      <PriceBoard state={state} phase={phase} />
      <BidPanel state={state} disabledReason={disabledReason} pending={placeBid.isPending} onBid={bid} />
      <BidFeed feed={feed} currency={state.currency} />
    </div>
  );
}
