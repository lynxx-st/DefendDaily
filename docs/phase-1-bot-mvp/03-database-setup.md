# Steps 1.05–1.10: Database Setup

## 1.05 Initialize apps/api

```bash
cd apps/api
pnpm init
# Set name to "api" in package.json
pnpm add express @slack/bolt bullmq ioredis pg zod nodemailer axios
pnpm add -D @types/express @types/pg @types/nodemailer typescript ts-node-dev vitest @vitest/coverage-v8 msw
```

Create `apps/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

Create `apps/api/package.json` scripts block:
```json
{
  "name": "api",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "migrate": "ts-node-dev --transpile-only src/db/migrate.ts",
    "seed": "ts-node-dev --transpile-only src/db/seed.ts",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 1.06 apps/api/src/config/env.ts

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-'),
  SLACK_SIGNING_SECRET: z.string().min(1),
  SLACK_CLIENT_ID: z.string().min(1),
  SLACK_CLIENT_SECRET: z.string().min(1),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  TRACKING_BASE_URL: z.string().url().default('http://localhost:3001'),
  HIBP_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  PHISH_FROM_DOMAIN: z.string().default('mail.defenddaily.com'),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().default('alerts@defenddaily.com'),
  CANARY_WEBHOOK_BASE: z.string().url().optional(),
  OKTA_DOMAIN: z.string().optional(),
  OKTA_API_TOKEN: z.string().optional(),
  OKTA_RISK_POLICY_GROUP_ID: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
```

Add `dotenv` dependency: `pnpm add dotenv`

## 1.07 apps/api/src/db/client.ts

```typescript
import { Pool } from 'pg';
import { env } from '../config/env';

export const db = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

db.on('error', (err) => {
  console.error('Unexpected pg pool error:', err);
});
```

## 1.09 apps/api/src/db/migrations/001_init.sql

Paste the COMPLETE SQL from CLAUDE.md §6 verbatim — all CREATE TABLE statements
(organizations, users, puzzles, puzzle_deliveries, phish_campaigns, phish_templates,
risk_score_history, breach_records, canary_tokens, audit_log) plus all CREATE INDEX statements.

The SQL is ready to copy from CLAUDE.md §6. Do not abbreviate or skip tables.

## 1.10 apps/api/src/db/migrate.ts

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './client';

async function migrate() {
  console.log('Running migrations...');
  const sql = readFileSync(join(__dirname, 'migrations/001_init.sql'), 'utf8');
  await db.query(sql);
  console.log('✅ Migration complete');
  await db.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

Run migration:
```bash
cd apps/api
pnpm migrate
```

Expected output: `✅ Migration complete`

Verify tables exist:
```bash
psql postgresql://postgres:postgres@localhost:5432/defenddaily -c "\dt"
# Should list: audit_log, breach_records, canary_tokens, organizations,
# phish_campaigns, phish_templates, puzzle_deliveries, puzzles,
# risk_score_history, users
```

**Commit:**
```bash
git add apps/api/
git commit -m "feat(api): set up Express app, Zod env validation, pg Pool, and DB migration"
```

**Update PROGRESS.md:** Check off 1.05–1.10. Set Last Completed to "1.10 — migrate.ts".
