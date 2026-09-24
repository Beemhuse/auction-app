import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { useLogin } from '../hooks/useLogin';
import { loginSchema } from '../schemas';

export function LoginForm({ onSuccess }) {
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { adminKey: '' },
  });

  const submit = handleSubmit((values) => login.mutate(values, { onSuccess }));
  const serverError = login.error?.status === 401 ? 'That admin key was not accepted.' : login.error?.message;

  return (
    <form className="auth-panel" onSubmit={submit} noValidate>
      <p className="brand-kicker">PROJECT HAMMER</p>
      <h1>Admin access</h1>
      <FormField label="Admin key" error={errors.adminKey?.message}>
        <input type="password" autoComplete="current-password" autoFocus {...register('adminKey')} />
      </FormField>
      <p className="form-error" role="alert">{serverError}</p>
      <Button type="submit" className="full-width" disabled={login.isPending}>
        {login.isPending ? 'Checking...' : 'Unlock dashboard'}
      </Button>
    </form>
  );
}
