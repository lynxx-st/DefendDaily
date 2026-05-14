import { z } from 'zod'
import dotenv from 'dotenv'
dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-'),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SLACK_CLIENT_ID: z.string().min(1),
  SLACK_CLIENT_SECRET: z.string().min(1),
  SLACK_STATE_SECRET: z.string().min(1).default('dev-state-secret-change-in-prod'),
  TRACKING_BASE_URL: z.string().url().default('http://localhost:3001'),
  // HS256 secret shared with the dashboard (NEXTAUTH_SECRET) for Bearer JWTs.
  // Optional in dev so existing tests/scripts boot without it; required for
  // protected endpoints — apiAuth rejects requests when absent.
  NEXTAUTH_SECRET: z.string().optional(),
  TEAMS_APP_ID: z.string().optional(),
  TEAMS_APP_PASSWORD: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  TEXTBELT_API_URL: z.string().url().default('https://textbelt.com'),
  TEXTBELT_API_KEY: z.string().default('textbelt'),
  // SMTP — used for both phish simulations and transactional email (breach monitor, family alerts)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().default('alerts@defenddaily.com'),
  PHISH_FROM_DOMAIN: z.string().default('mail.defenddaily.com'),
  CANARY_WEBHOOK_BASE: z.string().url().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().default('alerts@defenddaily.com'),
  // MinIO — open source S3-compatible object storage (https://github.com/minio/minio, AGPL)
  // Self-host via Docker; SDK works with any S3-compatible endpoint
  MINIO_ENDPOINT: z.string().url().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
  MINIO_BUCKET: z.string().optional(),
  // Keycloak — open source identity provider for enterprise SSO (Apache 2.0)
  // Used in Phase 6 for OIDC/SAML enterprise tier (https://github.com/keycloak/keycloak)
  KEYCLOAK_URL: z.string().url().optional(),
  KEYCLOAK_REALM: z.string().optional(),
  KEYCLOAK_CLIENT_ID: z.string().optional(),
  KEYCLOAK_CLIENT_SECRET: z.string().optional(),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment variables:', result.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = result.data
export type Env = z.infer<typeof envSchema>
