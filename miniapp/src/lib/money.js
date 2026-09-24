/** Major-unit decimal string ("1250.5") -> integer minor-unit string ("125050"), without floats. */
export function majorToMinor(value) {
  const [whole, fraction = ''] = String(value).trim().split('.');
  return `${whole || '0'}${fraction.padEnd(2, '0').slice(0, 2)}`.replace(/^0+(?=\d)/, '');
}

/** Integer minor-unit string -> major-unit decimal string, for inputs. */
export function minorToMajor(value) {
  if (value == null || value === '') return '';
  const digits = String(value).padStart(3, '0');
  const whole = digits.slice(0, -2).replace(/^0+(?=\d)/, '');
  const fraction = digits.slice(-2).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}

export const addMinor = (a, b) => (BigInt(a) + BigInt(b)).toString();
export const multiplyMinor = (a, factor) => (BigInt(a) * BigInt(factor)).toString();
export const compareMinor = (a, b) => (BigInt(a) === BigInt(b) ? 0 : BigInt(a) > BigInt(b) ? 1 : -1);
