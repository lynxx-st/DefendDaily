# Steps 9.12–9.16 — Integrations & Public API

## 9.12 Outbound webhook framework

**Migration:** Add to `013_billing.sql`:

```sql
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  secret      VARCHAR(64) NOT NULL,
  event_types TEXT[] NOT NULL,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id     UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_type      VARCHAR(100) NOT NULL,
  payload         JSONB NOT NULL,
  status_code     SMALLINT,
  response_body   TEXT,
  delivered_at    TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  attempts        SMALLINT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**File:** `apps/api/src/services/webhooks.ts`

```typescript
import { createHmac } from 'crypto'
import axios from 'axios'
import { db } from '../db/client'
import { logger } from '../config/logger'

export type WebhookEventType = 'phish.clicked' | 'streak.milestone' | 'score.drop' | 'achievement.unlocked'

export async function fireWebhookEvent(orgId: string, eventType: WebhookEventType, payload: Record<string, unknown>): Promise<void> {
  const endpoints = await db.query<{ id: string; url: string; secret: string }>(
    `SELECT id, url, secret FROM webhook_endpoints WHERE org_id = $1 AND active = true AND $2 = ANY(event_types)`,
    [orgId, eventType],
  )

  for (const endpoint of endpoints.rows) {
    const deliveryRow = await db.query<{ id: string }>(
      `INSERT INTO webhook_deliveries (endpoint_id, event_type, payload) VALUES ($1, $2, $3) RETURNING id`,
      [endpoint.id, eventType, JSON.stringify(payload)],
    )
    const deliveryId = deliveryRow.rows[0]!.id
    void deliverWebhook(deliveryId, endpoint.url, endpoint.secret, eventType, payload)
  }
}

async function deliverWebhook(
  deliveryId: string,
  url: string,
  secret: string,
  eventType: string,
  payload: Record<string, unknown>,
  attempt = 1,
): Promise<void> {
  const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() })
  const signature = createHmac('sha256', secret).update(body).digest('hex')

  try {
    const response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json', 'X-DefendDaily-Signature': signature },
      timeout: 10_000,
    })
    await db.query(
      `UPDATE webhook_deliveries SET status_code = $1, response_body = $2, delivered_at = NOW(), attempts = $3 WHERE id = $4`,
      [response.status, String(response.data).slice(0, 1024), attempt, deliveryId],
    )
  } catch (err) {
    const status = axios.isAxiosError(err) ? (err.response?.status ?? 0) : 0
    const respBody = axios.isAxiosError(err) ? String(err.response?.data ?? '').slice(0, 1024) : String(err)
    const nextAttempt = attempt < 5 ? new Date(Date.now() + Math.pow(2, attempt) * 1000) : null

    await db.query(
      `UPDATE webhook_deliveries SET status_code = $1, response_body = $2, attempts = $3, next_attempt_at = $4 WHERE id = $5`,
      [status, respBody, attempt, nextAttempt?.toISOString() ?? null, deliveryId],
    )
    if (nextAttempt) {
      setTimeout(() => void deliverWebhook(deliveryId, url, secret, eventType, payload, attempt + 1), nextAttempt.getTime() - Date.now())
    } else {
      logger.warn({ deliveryId, url }, 'Webhook delivery exhausted all attempts')
    }
  }
}
```

---

## 9.13 Zapier integration

Register the following trigger events that Zapier polls via REST hooks:

**File:** `apps/api/src/routes/zapier.ts`

```typescript
import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { db } from '../db/client'

export const zapierRouter = Router()
zapierRouter.use(requireAuth)

// Zapier subscribe: register webhook endpoint
zapierRouter.post('/subscribe', async (req, res) => {
  const { orgId } = res.locals.principal!
  const { targetUrl, event } = req.body as { targetUrl: string; event: string }
  const { randomBytes } = await import('crypto')
  const secret = randomBytes(32).toString('hex')

  const result = await db.query<{ id: string }>(
    `INSERT INTO webhook_endpoints (org_id, url, secret, event_types) VALUES ($1, $2, $3, $4) RETURNING id`,
    [orgId, targetUrl, secret, [event]],
  )
  res.json({ id: result.rows[0]!.id })
})

// Zapier unsubscribe: remove webhook endpoint
zapierRouter.delete('/unsubscribe/:id', async (req, res) => {
  const { orgId } = res.locals.principal!
  await db.query(`DELETE FROM webhook_endpoints WHERE id = $1 AND org_id = $2`, [req.params['id'], orgId])
  res.json({ deleted: true })
})

// Zapier polling fallback: last 10 events
zapierRouter.get('/events/:type', async (req, res) => {
  const { orgId } = res.locals.principal!
  const result = await db.query(
    `SELECT al.id, al.action, al.metadata, al.occurred_at FROM audit_log al WHERE al.org_id = $1 AND al.action = $2 ORDER BY occurred_at DESC LIMIT 10`,
    [orgId, req.params['type']],
  )
  res.json(result.rows)
})
```

---

## 9.14 Public API v1

**Migration:** Add to `013_billing.sql`:

```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash        VARCHAR(64) NOT NULL UNIQUE,
  name            VARCHAR(100),
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**File:** `apps/api/src/middleware/apiKeyAuth.ts`

```typescript
import { createHash } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { db } from '../db/client'
import { redis } from '../db/redis'

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawKey = req.headers['x-api-key'] as string | undefined
  if (!rawKey) {
    res.status(401).json({ error: 'API key required', code: 'API_KEY_REQUIRED', requestId: res.locals.requestId })
    return
  }

  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const rateLimitKey = `api_rate:${keyHash}`
  const count = await redis.incr(rateLimitKey)
  if (count === 1) await redis.expire(rateLimitKey, 3600)

  if (count > 1000) {
    res.status(429).json({ error: 'Rate limit exceeded', code: 'RATE_LIMIT', requestId: res.locals.requestId })
    return
  }

  const keyRow = await db.query<{ id: string; org_id: string }>(
    `SELECT id, org_id FROM api_keys WHERE key_hash = $1`,
    [keyHash],
  )
  if (!keyRow.rows[0]) {
    res.status(401).json({ error: 'Invalid API key', code: 'INVALID_API_KEY', requestId: res.locals.requestId })
    return
  }

  res.locals.principal = { orgId: keyRow.rows[0].org_id, userId: 'api', role: 'api' }
  void db.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [keyRow.rows[0].id])
  next()
}
```

Mount public API routes at `/api/v1/` with `apiKeyAuth` middleware. Expose read-only endpoints: `/v1/users`, `/v1/leaderboard`, `/v1/risk-scores`, `/v1/puzzle-deliveries`.

---

## 9.15 OpenAPI 3.1 spec auto-generation

**Install:** `pnpm add @asteasolutions/zod-to-openapi` in `apps/api`

**File:** `apps/api/src/openapi.ts`

```typescript
import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

export const registry = new OpenAPIRegistry()

registry.registerComponent('securitySchemes', 'ApiKeyAuth', {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-Key',
})

registry.registerPath({
  method: 'get',
  path: '/api/v1/leaderboard',
  summary: 'Get weekly leaderboard for your org',
  security: [{ ApiKeyAuth: [] }],
  responses: {
    200: {
      description: 'Leaderboard entries',
      content: { 'application/json': { schema: z.object({ entries: z.array(z.object({ rank: z.number(), display_name: z.string(), weekly_pts: z.number() })) }) } },
    },
  },
})

export function generateOpenApiSpec() {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  return generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'DefendDaily API', version: 'v1' },
    servers: [{ url: 'https://api.defenddaily.com' }],
  })
}
```

Serve at `GET /api/v1/openapi.json`.

---

## 9.16 Developer documentation site

Use Mintlify for documentation hosting. Create `docs.defenddaily.com` by:

1. Create `mint.json` in repo root:
```json
{
  "name": "DefendDaily",
  "logo": { "dark": "/logo.svg" },
  "api": { "baseUrl": "https://api.defenddaily.com", "auth": { "method": "key", "name": "X-API-Key" } },
  "navigation": [
    { "group": "Getting Started", "pages": ["introduction", "authentication", "rate-limits"] },
    { "group": "API Reference", "pages": ["api-reference/leaderboard", "api-reference/users", "api-reference/risk-scores"] }
  ]
}
```

2. Create `docs/introduction.mdx` with quickstart guide.
3. Connect Mintlify GitHub integration to auto-deploy on push.

**Commit:** `feat(api): outbound webhooks, Zapier integration, public API v1, OpenAPI spec (#9.12-9.16)`
