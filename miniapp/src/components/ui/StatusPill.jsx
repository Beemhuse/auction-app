import { cn } from '@/lib/cn';

export function StatusPill({ tone = 'neutral', live = false, children }) {
  return <span className={cn('pill', `pill-${tone}`, live && 'pill-live')}>{children}</span>;
}
