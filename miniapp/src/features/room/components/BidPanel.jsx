import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gavel } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/format';
import { addMinor, compareMinor, majorToMinor, multiplyMinor } from '@/lib/money';
import { customBidSchema } from '../schemas/room.schema';

const QUICK_STEPS = [0, 1, 4]; // minimum, +1 increment, +4 increments

/** Pick an amount (quick chips or custom), then confirm with one clear button. */
export function BidPanel({ state, disabledReason, pending, onBid }) {
  const minimum = state.minimumNextBidMinor;
  const options = QUICK_STEPS.map((steps) => addMinor(minimum, multiplyMinor(state.minIncrementMinor, steps)));
  const [selected, setSelected] = useState(options[0]);
  const [custom, setCustom] = useState(false);
  const money = (minor) => formatMoney(minor, state.currency);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(customBidSchema(minimum)),
    defaultValues: { amount: '' },
  });

  // When someone outbids us, a selection below the new minimum is no longer valid.
  useEffect(() => {
    if (compareMinor(selected, minimum) < 0) setSelected(minimum);
  }, [minimum, selected]);

  if (disabledReason) return <section className="card bid-panel bid-panel-disabled"><p>{disabledReason}</p></section>;

  const submitCustom = handleSubmit(({ amount }) => { onBid(majorToMinor(amount)); reset(); });

  return (
    <section className="card bid-panel">
      <div className="bid-panel-head">
        <h2>Your bid</h2>
        <button type="button" className="link-button" onClick={() => setCustom((value) => !value)}>{custom ? 'Quick amounts' : 'Custom amount'}</button>
      </div>
      {custom ? (
        <form onSubmit={submitCustom} noValidate>
          <FormField label={`Amount (${state.currency})`} error={errors.amount?.message} hint={`Minimum ${money(minimum)}`}>
            <input inputMode="decimal" placeholder={formatMoney(minimum, state.currency)} {...register('amount')} />
          </FormField>
          <Button type="submit" icon={Gavel} block disabled={pending}>{pending ? 'Placing bid...' : 'Place bid'}</Button>
        </form>
      ) : (
        <>
          <div className="chips" role="radiogroup" aria-label="Bid amount">
            {options.map((amount) => (
              <button
                key={amount}
                type="button"
                role="radio"
                aria-checked={selected === amount}
                className={cn('chip', selected === amount && 'chip-selected')}
                onClick={() => setSelected(amount)}
              >
                {money(amount)}
              </button>
            ))}
          </div>
          <Button icon={Gavel} block disabled={pending} onClick={() => onBid(selected)}>
            {pending ? 'Placing bid...' : `Bid ${money(selected)}`}
          </Button>
        </>
      )}
    </section>
  );
}
