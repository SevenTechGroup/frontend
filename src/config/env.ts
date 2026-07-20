import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const envSchema = z.object({
  VITE_API_URL: z
    .url()
    .default('http://localhost:8000/api')
    .refine((value) => {
      const url = new URL(value);
      return url.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname);
    }, 'VITE_API_URL doit utiliser HTTPS hors environnement local.'),
  VITE_ENABLE_OFFLINE_SYNC: booleanString,
});

const result = envSchema.safeParse(import.meta.env);

if (!result.success) {
  throw new Error(`Configuration frontend invalide : ${z.prettifyError(result.error)}`);
}

export const env = result.data;
