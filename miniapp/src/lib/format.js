const LOCALE = 'en-NG';

const moneyFormatters = new Map();
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

export function formatMoney(minor, currency) {
  if (minor == null) return '-';
  const key = currency;
  if (!moneyFormatters.has(key)) {
    moneyFormatters.set(key, new Intl.NumberFormat(LOCALE, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }));
  }
  return moneyFormatters.get(key).format(Number(minor) / 100);
}

export const formatDate = (value) => dateFormatter.format(new Date(value));
export const formatTime = (value) => timeFormatter.format(new Date(value));

/** 3725000 -> "1:02:05", 65000 -> "01:05". */
export function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (total >= 86_400) {
    const days = Math.floor(total / 86_400);
    return `${days}d ${Math.floor((total % 86_400) / 3600)}h`;
  }
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
