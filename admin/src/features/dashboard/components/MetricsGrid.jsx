import { formatNumber } from '@/lib/format';

export function MetricsGrid({ totals, isLoading }) {
  const metrics = [
    { label: 'Auctions', value: totals?.auctions },
    { label: 'Active now', value: totals?.active },
    { label: 'Registrations', value: totals?.registrations },
    { label: 'Bids', value: totals?.bids },
  ];

  return (
    <section className="metrics" aria-label="Auction totals" aria-busy={isLoading || undefined}>
      {metrics.map((metric) => (
        <div key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value == null ? '—' : formatNumber(metric.value)}</strong>
        </div>
      ))}
    </section>
  );
}
