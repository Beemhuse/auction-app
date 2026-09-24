import { cn } from '@/lib/cn';

export function Button({ variant = 'primary', icon: Icon, block = false, className, children, type = 'button', ...props }) {
  return (
    <button type={type} className={cn('btn', `btn-${variant}`, block && 'btn-block', className)} {...props}>
      {Icon && <Icon size={18} aria-hidden="true" />}
      {children}
    </button>
  );
}
