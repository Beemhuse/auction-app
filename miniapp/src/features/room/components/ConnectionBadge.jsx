import { StatusPill } from '@/components/ui/StatusPill';

const STATES = {
  open: { tone: 'positive', label: 'Live', live: true },
  connecting: { tone: 'neutral', label: 'Connecting...' },
  reconnecting: { tone: 'warning', label: 'Reconnecting...' },
  closed: { tone: 'negative', label: 'Disconnected' },
};

export function ConnectionBadge({ status }) {
  const state = STATES[status] ?? STATES.connecting;
  return <StatusPill tone={state.tone} live={state.live}>{state.label}</StatusPill>;
}
