import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { AUCTION_STATUSES, auctionFormSchema, toAuctionFormValues } from '../schemas/auction.schema';

/** Presentational form: validates with Zod and hands validated values to `onSubmit`. */
export function AuctionForm({ auction, onSubmit, onCancel, pending, serverError }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(auctionFormSchema),
    defaultValues: toAuctionFormValues(auction),
    mode: 'onTouched',
  });
  const currency = watch('currency')?.toUpperCase() || 'NGN';
  const moneyHint = `In ${currency} major units`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-grid">
        <FormField label="Title" error={errors.title?.message} wide>
          <input maxLength={200} {...register('title')} />
        </FormField>
        <FormField label="Currency" error={errors.currency?.message}>
          <input maxLength={3} autoCapitalize="characters" {...register('currency')} />
        </FormField>
        <FormField label="Status" error={errors.status?.message}>
          <select {...register('status')}>
            {AUCTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </FormField>
        <FormField label="Starting price" error={errors.startingPrice?.message} hint={moneyHint}>
          <input inputMode="decimal" {...register('startingPrice')} />
        </FormField>
        <FormField label="Reserve price" error={errors.reservePrice?.message} hint="Optional">
          <input inputMode="decimal" {...register('reservePrice')} />
        </FormField>
        <FormField label="Deposit" error={errors.deposit?.message} hint="Held to admit a bidder">
          <input inputMode="decimal" {...register('deposit')} />
        </FormField>
        <FormField label="Minimum increment" error={errors.increment?.message}>
          <input inputMode="decimal" {...register('increment')} />
        </FormField>
        <FormField label="Starts" error={errors.startsAt?.message}>
          <input type="datetime-local" {...register('startsAt')} />
        </FormField>
        <FormField label="Ends" error={errors.endsAt?.message}>
          <input type="datetime-local" {...register('endsAt')} />
        </FormField>
      </div>
      <p className="form-error" role="alert">{serverError}</p>
      <div className="dialog-actions">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save auction'}</Button>
      </div>
    </form>
  );
}
