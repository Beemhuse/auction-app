/**
 * API origin from VITE_API_URL (baked in at build time). Empty means same origin, which is what the
 * Vite dev proxy provides. Values pasted into hosting dashboards are forgiven: surrounding quotes and
 * whitespace, a missing https://, and a trailing slash or /api/v1 are all cleaned up.
 */
export function normalizeApiUrl(raw) {
  let value = String(raw ?? '').trim().replace(/^['"]|['"]$/g, '').trim();
  if (!value) return { origin: '' };
  if (!/^[a-z]+:\/\//i.test(value)) value = `https://${value}`;
  let url;
  try { url = new URL(value); } catch { return { origin: '', error: `VITE_API_URL is not a valid URL: "${raw}"` }; }
  if (!['http:', 'https:'].includes(url.protocol)) return { origin: '', error: `VITE_API_URL must start with https:// (got "${raw}")` };
  const path = url.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  return { origin: `${url.origin}${path}` };
}

const { origin, error } = normalizeApiUrl(import.meta.env.VITE_API_URL);

/** Set when VITE_API_URL is unusable; the app shows it instead of failing silently. */
export const CONFIG_ERROR = error ?? null;

export const API_BASE = `${origin}/api/v1`;

/** Same host as the API; in development the Vite proxy forwards /ws to the server. */
export const WS_BASE = origin
  ? origin.replace(/^http/, 'ws')
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
