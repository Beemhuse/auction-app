/**
 * Postgres TLS from DATABASE_SSL, shared by the app and the migration CLI so they always agree.
 * - unset / "disable": no TLS option (private networks such as Railway's or Render's internal URLs).
 *   An `sslmode` in DATABASE_URL still applies.
 * - "require": encrypt without verifying the certificate (most managed providers' public URLs).
 * - "verify": encrypt and verify the certificate chain.
 */
export function databaseSsl(mode: string | undefined): { rejectUnauthorized: boolean } | undefined {
  switch ((mode ?? '').trim().toLowerCase()) {
    case 'verify': return { rejectUnauthorized: true };
    case 'require': return { rejectUnauthorized: false };
    case '':
    case 'disable': return undefined;
    default: throw new Error(`DATABASE_SSL must be "disable", "require" or "verify" (got "${mode}")`);
  }
}
