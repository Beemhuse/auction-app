import { cn } from '@/lib/cn';

/** Controlled tab strip. tabs: [{ value, label, count? }] */
export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          className={cn('tab', tab.value === value && 'active')}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          {tab.count != null && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}
