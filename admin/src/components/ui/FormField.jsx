import { Children, cloneElement, isValidElement, useId } from 'react';
import { cn } from '@/lib/cn';

/** Label + control + validation message. Wires id/aria attributes onto its single child control. */
export function FormField({ label, error, hint, wide = false, children }) {
  const id = useId();
  const messageId = `${id}-message`;
  const control = Children.only(children);
  const message = error || hint;

  return (
    <div className={cn('field', wide && 'wide', error && 'has-error')}>
      <label htmlFor={id}>{label}</label>
      {isValidElement(control) && cloneElement(control, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && <span id={messageId} className={error ? 'field-error' : 'field-hint'}>{message}</span>}
    </div>
  );
}
