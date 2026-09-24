import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { haptic } from '@/lib/telegram';
import { useRedeemCode } from '../api/queries';
import { entryCodeFormSchema } from '../schemas/registration.schema';

const MESSAGES = {
  400: 'That code is not right. Check the message from the bot and try again.',
  404: 'We could not find a paid registration for this auction on your account.',
  409: 'This code has already been used.',
};

export function EnterCodePanel({ auction }) {
  const redeem = useRedeemCode();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(entryCodeFormSchema),
    defaultValues: { code: '' },
  });

  const submit = handleSubmit(({ code }) => redeem.mutate({ auctionId: auction.id, code }, {
    onSuccess: () => haptic.success(),
    onError: () => haptic.error(),
  }));
  const serverError = redeem.error && (MESSAGES[redeem.error.status] ?? redeem.error.message);

  return (
    <section className="card panel">
      <KeyRound size={28} className="panel-icon" aria-hidden="true" />
      <h2>Deposit confirmed</h2>
      <p className="muted">Enter the private entry code the bot sent you. It works once, and only for your Telegram account.</p>
      <form onSubmit={submit} noValidate>
        <FormField label="Entry code" error={errors.code?.message}>
          <input className="code-input" autoComplete="one-time-code" autoCapitalize="characters" spellCheck="false" placeholder="HMR-XXXXXXXX" {...register('code')} />
        </FormField>
        <p className="form-error" role="alert">{serverError}</p>
        <Button type="submit" block disabled={redeem.isPending}>{redeem.isPending ? 'Checking...' : 'Enter auction'}</Button>
      </form>
    </section>
  );
}
