import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useSendMessage } from '../api/mutations';

const MAX_LENGTH = 3500;

/** Compose a message that the bot delivers to one user's chat, headed with the auction title. */
export function MessageDialog({ auction, recipient, initialText = '', onClose }) {
  const [text, setText] = useState(initialText);
  const send = useSendMessage(auction.id);
  const toast = useToast();
  const who = recipient.name || (recipient.username ? `@${recipient.username}` : recipient.telegramUserId);

  const submit = (event) => {
    event.preventDefault();
    send.mutate({ telegramUserId: recipient.telegramUserId, text: text.trim() }, {
      onSuccess: () => { toast.success(`Message sent to ${who}`); onClose(); },
    });
  };

  return (
    <Modal title={`Message ${who}`} eyebrow="TELEGRAM" size="sm" onClose={onClose}>
      <form onSubmit={submit}>
        <FormField label="Message" hint={`Sent by the bot, starting with "Message about ${auction.title}:"`}>
          <textarea value={text} onChange={(event) => setText(event.target.value)} rows={7} maxLength={MAX_LENGTH} required autoFocus />
        </FormField>
        <p className="form-error" role="alert">{send.error?.message}</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" icon={Send} disabled={send.isPending || !text.trim()}>{send.isPending ? 'Sending...' : 'Send'}</Button>
        </div>
      </form>
    </Modal>
  );
}
