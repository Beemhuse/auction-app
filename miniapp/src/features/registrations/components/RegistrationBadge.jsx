import { StatusPill } from '@/components/ui/StatusPill';
import { registrationStage } from '../schemas/registration.schema';

const BADGES = {
  pending: { tone: 'warning', label: 'Payment pending' },
  paid: { tone: 'info', label: 'Enter your code' },
  admitted: { tone: 'positive', label: 'Joined' },
};

export function RegistrationBadge({ registration }) {
  const badge = BADGES[registrationStage(registration)];
  return badge ? <StatusPill tone={badge.tone}>{badge.label}</StatusPill> : null;
}
