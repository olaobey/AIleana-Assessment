import 'dotenv/config';
import { parseEnv } from 'znv';
import { envSchema, type Env } from './env.schema';

export const env: Env = parseEnv(process.env, envSchema);
