import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_CLIENT_ID: z.string().optional(),
  AZURE_AD_CLIENT_SECRET: z.string().optional(),
  AZURE_AD_TENANT_ID: z.string().optional(),
  API_URL: z.string().url().default('http://localhost:3001'),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid dashboard environment:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
export type Env = z.infer<typeof envSchema>;

export const hasGoogle = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const hasMicrosoft = Boolean(env.AZURE_AD_CLIENT_ID && env.AZURE_AD_CLIENT_SECRET);
