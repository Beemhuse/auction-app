import { z } from 'zod';

export const loginSchema = z.object({
  adminKey: z.string().trim().min(1, 'Enter the admin key'),
});
