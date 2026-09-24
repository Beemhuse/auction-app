import { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useUpdateAuction } from '../api/mutations';

const TRANSITIONS = {
  SCHEDULED: {
    to: 'ACTIVE',
    label: 'Open bidding',
    icon: Play,
    variant: 'primary',
    body: 'Admitted bidders will be able to place bids immediately, regardless of the scheduled start time.',
    done: 'Bidding opened',
  },
  ACTIVE: {
    to: 'CLOSED',
    label: 'Close auction',
    icon: Square,
    variant: 'danger',
    body: 'New bids will be rejected straight away. The current highest bid stays as the final result.',
    done: 'Auction closed',
  },
};

export function AuctionStatusActions({ auction }) {
  const [confirming, setConfirming] = useState(false);
  const update = useUpdateAuction();
  const toast = useToast();
  const transition = TRANSITIONS[auction.status];
  if (!transition) return null;

  const close = () => { setConfirming(false); update.reset(); };
  const confirm = () => update.mutate({ id: auction.id, changes: { status: transition.to } }, {
    onSuccess: () => { toast.success(transition.done); close(); },
  });

  return (
    <>
      <Button variant={transition.variant} icon={transition.icon} onClick={() => setConfirming(true)}>{transition.label}</Button>
      {confirming && (
        <ConfirmDialog
          title={`${transition.label}?`}
          confirmLabel={transition.label}
          variant={transition.variant}
          pending={update.isPending}
          error={update.error?.message}
          onConfirm={confirm}
          onClose={close}
        >
          <p><strong>{auction.title}</strong></p>
          <p>{transition.body}</p>
        </ConfirmDialog>
      )}
    </>
  );
}
