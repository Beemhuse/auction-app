import { useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarX, Lock } from 'lucide-react';
import { ErrorMessage, Loading, StateMessage } from '@/components/ui/StateMessage';
import { AuctionFacts, AuctionStatus, isRegistrationOpen, useAuction } from '@/features/auctions';
import { EnterCodePanel, RegisterPanel, registrationStage, useMyRegistrations, useRoomAccess } from '@/features/registrations';
import { LiveRoom } from '@/features/room';
import { useTelegramBackButton } from '@/lib/telegram';

const PENDING_POLL_MS = 10_000;

export function AuctionPage() {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const goBack = useCallback(() => navigate('/'), [navigate]);
  const nativeBack = useTelegramBackButton(goBack);

  const auction = useAuction(auctionId);
  const registrations = useMyRegistrations({
    // While a payment is pending, keep checking so the code form appears once the webhook lands.
    refetchInterval: (query) => (query.state.data?.some((r) => r.auctionId === auctionId && r.depositStatus === 'PENDING') ? PENDING_POLL_MS : false),
  });
  const registration = registrations.data?.find((r) => r.auctionId === auctionId);
  const stage = registrationStage(registration);

  let body;
  if (auction.isLoading || registrations.isLoading) body = <Loading />;
  else if (auction.error) body = <ErrorMessage title={auction.error.status === 404 ? 'Auction not found' : 'Could not load auction'} error={auction.error} onRetry={auction.refetch} />;
  else if (registrations.error) body = <ErrorMessage error={registrations.error} onRetry={registrations.refetch} />;
  else body = <AuctionBody auction={auction.data} registration={registration} stage={stage} />;

  return (
    <main className="page">
      {!nativeBack && <Link to="/" className="back-link"><ArrowLeft size={16} aria-hidden="true" />All auctions</Link>}
      {auction.data && (
        <header className="page-header">
          <AuctionStatus auction={auction.data} />
          <h1>{auction.data.title}</h1>
        </header>
      )}
      {body}
    </main>
  );
}

function AuctionBody({ auction, registration, stage }) {
  if (stage === 'admitted') return <RoomGate auction={auction} />;

  let panel;
  if (stage === 'paid') panel = <EnterCodePanel auction={auction} />;
  else if (stage === 'inactive') {
    panel = <StateMessage icon={Lock} title="Registration inactive">Your deposit for this auction is {registration.depositStatus.toLowerCase()}.</StateMessage>;
  } else if (auction.status === 'CLOSED') {
    panel = <StateMessage icon={CalendarX} title="This auction has ended" />;
  } else if (!isRegistrationOpen(auction)) {
    panel = (
      <StateMessage icon={Lock} title="Registration has closed">
        {stage === 'pending' ? 'If you already paid, your entry code will still arrive in the bot chat.' : 'Registration closes 15 minutes before the auction starts.'}
      </StateMessage>
    );
  } else panel = <RegisterPanel auction={auction} pending={stage === 'pending'} />;

  return (
    <div className="stack">
      <AuctionFacts auction={auction} />
      {panel}
    </div>
  );
}

function RoomGate({ auction }) {
  const access = useRoomAccess(auction.id, { enabled: true });
  if (access.isLoading) return <Loading label="Joining the room..." />;
  if (access.error) return <ErrorMessage title="Could not join the room" error={access.error} onRetry={access.refetch} />;
  return (
    <>
      <LiveRoom auctionId={auction.id} roomToken={access.data.roomToken} />
      <details className="details">
        <summary>Auction details</summary>
        <AuctionFacts auction={auction} />
      </details>
    </>
  );
}
