import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { formatMoney } from '@/lib/format';
import { haptic, openExternalLink } from '@/lib/telegram';
import { useCreateRegistration } from '../api/queries';
import { registerFormSchema } from '../schemas/registration.schema';

/** Collects the receipt email and hands off to Paystack. `pending` means a registration already exists. */
export function RegisterPanel({ auction, pending }) {
  const register = useCreateRegistration();
  const [outcome, setOutcome] = useState(null); // 'checkout' | 'awaiting'
  const { register: field, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: '' },
  });

  const submit = handleSubmit(({ email }) => register.mutate({ auctionId: auction.id, email }, {
    onSuccess: (result) => {
      if (result.awaitingConfirmation) { setOutcome('awaiting'); return; }
      if (!result.checkoutUrl) return;
      haptic.tap();
      openExternalLink(result.checkoutUrl);
      setOutcome('checkout');
    },
    onError: () => haptic.error(),
  }));

  if (outcome === 'awaiting') {
    return (
      <section className="card panel">
        <MessageCircle size={28} className="panel-icon" aria-hidden="true" />
        <h2>Payment received</h2>
        <p className="muted">Paystack has your payment and we are confirming it. Your entry code will arrive in the bot chat shortly. There is no need to pay again.</p>
      </section>
    );
  }

  return (
    <section className="card panel">
      <h2>{pending ? 'Finish your registration' : 'Register to bid'}</h2>
      <p className="muted">
        Pay a refundable deposit of <strong>{formatMoney(auction.depositAmountMinor, auction.currency)}</strong> to get your private entry code.
      </p>
      {outcome === 'checkout' && (
        <p className="notice">
          Complete the payment in the page that just opened. Afterwards you will be taken back to the bot chat, and your entry code will arrive there.
        </p>
      )}
      <form onSubmit={submit} noValidate>
        <FormField label="Email for your receipt" error={errors.email?.message}>
          <input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" {...field('email')} />
        </FormField>
        <p className="form-error" role="alert">{register.error?.message}</p>
        <Button type="submit" icon={CreditCard} block disabled={register.isPending}>
          {register.isPending ? 'Preparing checkout...' : outcome === 'checkout' ? 'Open payment again' : 'Pay deposit'}
        </Button>
      </form>
    </section>
  );
}
