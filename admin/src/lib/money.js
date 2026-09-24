/** Convert a major-unit decimal string ("1250.5") to an integer minor-unit string ("125050") without floats. */
export function majorToMinor(value) {
  const [whole, fraction = ''] = String(value).trim().split('.');
  const minor = `${whole || '0'}${fraction.padEnd(2, '0').slice(0, 2)}`.replace(/^0+(?=\d)/, '');
  return minor;
}

/** Convert an integer minor-unit string to a major-unit decimal string for form inputs. */
export function minorToMajor(value) {
  if (value == null || value === '') return '';
  const digits = String(value).padStart(3, '0');
  const whole = digits.slice(0, -2).replace(/^0+(?=\d)/, '');
  const fraction = digits.slice(-2).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}
