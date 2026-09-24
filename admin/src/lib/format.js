const LOCALE = 'en-NG';

const moneyFormatters = new Map();
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
const numberFormatter = new Intl.NumberFormat(LOCALE);

export function formatMoney(minor, currency) {
  if (minor == null) return '-';
  if (!moneyFormatters.has(currency)) {
    moneyFormatters.set(currency, new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 2 }));
  }
  return moneyFormatters.get(currency).format(Number(minor) / 100);
}

export const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : '-');

export const formatNumber = (value) => numberFormatter.format(value);

const UNITS = [['day', 86_400_000], ['hour', 3_600_000], ['minute', 60_000]];

export function formatRelative(value, now = Date.now()) {
  const diff = new Date(value).getTime() - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return relativeFormatter.format(Math.round(diff / ms), unit);
  }
  return relativeFormatter.format(Math.round(diff / 1000), 'second');
}

/** ISO/Date -> value for <input type="datetime-local"> in the browser's timezone. */
export function toLocalInput(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** "jane.doe@example.com" -> "ja******@example.com" */
export function maskEmail(email) {
  if (!email) return '-';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 3))}@${domain}`;
}
