import { Link } from 'react-router';
import { cn } from '@/lib/cn';

const VARIANTS = {
  primary: 'primary-button',
  secondary: 'secondary-button',
  danger: 'danger-button',
  ghost: 'ghost-button',
};

export function Button({ variant = 'primary', icon: Icon, className, children, type = 'button', ...props }) {
  return (
    <button type={type} className={cn(VARIANTS[variant], Icon && 'icon-text', className)} {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = 'secondary', icon: Icon, className, children, ...props }) {
  return (
    <Link className={cn(VARIANTS[variant], 'link-button', Icon && 'icon-text', className)} {...props}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </Link>
  );
}

/** Square icon-only button. `label` is required for screen readers and the tooltip. */
export function IconButton({ icon: Icon, label, size = 18, compact = false, className, type = 'button', ...props }) {
  return (
    <button type={type} className={cn(compact ? 'table-button' : 'icon-button', className)} title={label} aria-label={label} {...props}>
      <Icon size={size} aria-hidden="true" />
    </button>
  );
}
