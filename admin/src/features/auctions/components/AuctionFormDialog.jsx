import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useCreateAuction, useUpdateAuction } from '../api/mutations';
import { diffAuctionPayload, toAuctionPayload } from '../schemas/auction.schema';
import { AuctionForm } from './AuctionForm';

/** Create when `auction` is null, edit otherwise. */
export function AuctionFormDialog({ auction, onClose, onSaved }) {
  const toast = useToast();
  const create = useCreateAuction();
  const update = useUpdateAuction();
  const mutation = auction ? update : create;

  const submit = (values) => {
    const payload = toAuctionPayload(values);
    if (!auction) {
      create.mutate(payload, {
        onSuccess: (created) => { toast.success('Auction created'); onSaved?.(created); onClose(); },
      });
      return;
    }

    const changes = diffAuctionPayload(auction, payload);
    if (Object.keys(changes).length === 0) {
      toast.info('No changes to save');
      onClose();
      return;
    }
    update.mutate({ id: auction.id, changes }, {
      onSuccess: (updated) => { toast.success('Auction updated'); onSaved?.(updated); onClose(); },
    });
  };

  return (
    <Modal title={auction ? 'Edit auction' : 'New auction'} eyebrow="AUCTION" onClose={onClose}>
      <AuctionForm
        auction={auction}
        onSubmit={submit}
        onCancel={onClose}
        pending={mutation.isPending}
        serverError={mutation.error?.message}
      />
    </Modal>
  );
}
