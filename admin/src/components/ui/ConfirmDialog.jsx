import { Button } from './Button';
import { Modal } from './Modal';

export function ConfirmDialog({ title, children, confirmLabel = 'Confirm', variant = 'primary', pending, error, onConfirm, onClose }) {
  return (
    <Modal title={title} eyebrow="CONFIRM" size="sm" onClose={onClose}>
      <div className="confirm-copy">{children}</div>
      <p className="form-error" role="alert">{error}</p>
      <div className="dialog-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={variant} onClick={onConfirm} disabled={pending}>{pending ? 'Working...' : confirmLabel}</Button>
      </div>
    </Modal>
  );
}
