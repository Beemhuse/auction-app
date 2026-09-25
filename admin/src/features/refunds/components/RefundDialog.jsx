import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/format';
import { majorToMinor, minorToMajor } from '@/lib/money';
import { useRefundDeposit } from '../api/mutations';

/** Refund one held deposit, in full by default, back to the account the bidder paid from. */
export function RefundDialog({ auction, registration, who, onClose }) {
  const [amount, setAmount] = useState(minorToMajor(auction.depositAmountMinor));
  const refund = useRefundDeposit(auction.id);
  const toast = useToast();
  const amountMinor = /^\d+(\.\d{1,2})?$/.test(amount.trim()) ? majorToMinor(amount) : null;
  const invalid = !amountMinor || BigInt(amountMinor) < 1n || BigInt(amountMinor) > BigInt(auction.depositAmountMinor);

  const submit = (event) => {
    event.preventDefault();
    refund.mutate({ registrationId: registration.id, amountMinor: amountMinor === auction.depositAmountMinor ? undefined : amountMinor }, {
      onSuccess: (result) => {
        if (result.status === 'needs-attention') toast.info('Paystack needs bank details. The bidder has been asked for them in the bot chat.');
        else if (result.status === 'failed') toast.error('Paystack could not refund this payment. The deposit is held again.');
        else toast.success(`Refund started for ${who}`);
        onClose();
      },
    });
  };

  return (
    <Modal title={`Refund ${who}`} eyebrow="DEPOSIT REFUND" size="sm" onClose={onClose}>
      <form onSubmit={submit}>
        <FormField
          label={`Amount (${auction.currency})`}
          error={amount && invalid ? `Enter an amount up to ${formatMoney(auction.depositAmountMinor, auction.currency)}` : undefined}
          hint="Paystack returns it to the card or account they paid from. The bidder is told in the bot chat."
        >
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" required autoFocus />
        </FormField>
        <p className="form-error" role="alert">{refund.error?.message}</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" icon={Undo2} disabled={refund.isPending || invalid}>{refund.isPending ? 'Refunding...' : 'Refund'}</Button>
        </div>
      </form>
    </Modal>
  );
}
