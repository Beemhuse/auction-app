import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/format';
import { useBanks, useRetryRefund } from '../api/mutations';

/** Sends a needs-attention refund to the bank account the bidder replied with in the bot chat. */
export function CompleteRefundDialog({ auction, refund, who, onClose }) {
  const [accountNumber, setAccountNumber] = useState(() => refund.customerDetails?.match(/\d{10}/)?.[0] ?? '');
  const [bankId, setBankId] = useState('');
  const banks = useBanks(auction.currency);
  const retry = useRetryRefund(auction.id);
  const toast = useToast();

  const submit = (event) => {
    event.preventDefault();
    retry.mutate({ refundId: refund.id, accountNumber: accountNumber.trim(), bankId }, {
      onSuccess: () => { toast.success(`Refund sent to the bank account for ${who}`); onClose(); },
    });
  };

  return (
    <Modal title={`Complete refund for ${who}`} eyebrow="NEEDS BANK DETAILS" size="sm" onClose={onClose}>
      <form onSubmit={submit} className="stack-form">
        <p className="confirm-copy">
          Paystack could not return {formatMoney(refund.amountMinor, auction.currency)} to the original payment method.
        </p>
        <div className="customer-details">
          <strong>Reply from the bidder</strong>
          <p>{refund.customerDetails || 'No reply yet. They were asked for their bank details in the bot chat.'}</p>
        </div>
        <FormField label="Account number">
          <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={20} required />
        </FormField>
        <FormField label="Bank" error={banks.error?.message}>
          <select value={bankId} onChange={(event) => setBankId(event.target.value)} required disabled={banks.isLoading}>
            <option value="">{banks.isLoading ? 'Loading banks...' : 'Choose a bank'}</option>
            {banks.data?.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
          </select>
        </FormField>
        <p className="form-error" role="alert">{retry.error?.message}</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={Send} disabled={retry.isPending || accountNumber.length < 6 || !bankId}>{retry.isPending ? 'Sending...' : 'Send refund'}</Button>
        </div>
      </form>
    </Modal>
  );
}
