import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.union([z.literal(''), z.url()]).default(''),
});

const env = envSchema.parse(import.meta.env);
const origin = env.VITE_API_URL.replace(/\/$/, '');

export const API_BASE = `${origin}/api/v1`;

/** Same host as the API; in development the Vite proxy forwards /ws to the server. */
export const WS_BASE = origin
  ? origin.replace(/^http/, 'ws')
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
