import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.union([z.literal(''), z.url()]).default(''),
});

export const env = envSchema.parse(import.meta.env);

export const API_BASE = `${env.VITE_API_URL.replace(/\/$/, '')}/api/v1`;
