import { z } from 'zod';

export const envSchema = {
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),

  CALL_RATE_PER_MINUTE: z.coerce.number().min(1).default(50),

  JWT_ACCESS_SECRET: z.string().min(20),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1d'),

  MONNIFY_BASE_URL: z.string().default('https://sandbox.monnify.com'),
  MONNIFY_API_KEY: z.string().min(1),
  MONNIFY_SECRET_KEY: z.string().min(1),
  MONNIFY_CONTRACT_CODE: z.string().min(1),
  MONNIFY_REDIRECT_URL: z.string().url(),
  MONNIFY_WEBHOOK_SECRET: z.string().optional(),

  PAYMENTS_MODE: z.enum(['real', 'mock']).default('real'),
};

export type Env = {
  [K in keyof typeof envSchema]: z.infer<(typeof envSchema)[K]>;
};
