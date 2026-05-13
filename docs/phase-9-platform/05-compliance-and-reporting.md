# Steps 9.22–9.24 — Compliance & Reporting

## 9.22 Advanced compliance reports

**File:** `apps/api/src/services/complianceReport.ts` (extends existing)

```typescript
import { db } from '../db/client'

export type ComplianceFramework = 'hipaa' | 'pci_dss' | 'iso27001' | 'soc2' | 'cyber_insurance'

const FRAMEWORK_CONTROLS: Record<ComplianceFramework, Array<{ id: string; title: string; description: string }>> = {
  hipaa: [
    { id: 'HIPAA-164.308(a)(5)', title: 'Security Awareness Training', description: 'Workforce training on malicious software, log-in monitoring, and password management' },
    { id: 'HIPAA-164.308(a)(1)', title: 'Security Management Process', description: 'Risk analysis and risk management to protect ePHI' },
  ],
  pci_dss: [
    { id: 'PCI-12.6', title: 'Security Awareness Program', description: 'Formal security awareness program for all personnel' },
    { id: 'PCI-12.6.1', title: 'Training Frequency', description: 'Awareness training at hire and at least annually' },
  ],
  iso27001: [
    { id: 'ISO-A.7.2.2', title: 'Information Security Awareness', description: 'All employees receive awareness education and regular updates' },
    { id: 'ISO-A.7.2.3', title: 'Disciplinary Process', description: 'Evidence of formal process for personnel who commit violations' },
  ],
  soc2: [
    { id: 'CC1.4', title: 'Human Resources Policies', description: 'Security awareness training for all personnel with system access' },
    { id: 'CC9.2', title: 'Risk Mitigation', description: 'Third-party and vendor risk management through training evidence' },
  ],
  cyber_insurance: [
    { id: 'CI-TRAIN', title: 'Annual Security Training', description: 'Documented completion of security awareness training for all employees' },
    { id: 'CI-PHISH', title: 'Phishing Simulation', description: 'Evidence of regular phishing simulation testing' },
    { id: 'CI-RISK', title: 'Risk Metrics', description: 'Quantitative risk scoring for all employees' },
  ],
}

export async function buildFrameworkReport(orgId: string, framework: ComplianceFramework): Promise<{
  controls: Array<{ id: string; title: string; description: string; status: string; evidence: string }>
  summary: { total: number; passed: number; coverage_pct: number }
}> {
  const stats = await db.query<{
    total_users: string; trained_users: string; avg_score: string; phish_campaigns: string
  }>(
    `SELECT
       COUNT(DISTINCT u.id)::text AS total_users,
       COUNT(DISTINCT CASE WHEN pd.delivered_at IS NOT NULL THEN u.id END)::text AS trained_users,
       ROUND(AVG(u.risk_score))::text AS avg_score,
       COUNT(DISTINCT pc.id)::text AS phish_campaigns
     FROM users u
     LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id
     LEFT JOIN phish_campaigns pc ON pc.sender_id = u.id OR pc.target_id = u.id
     WHERE u.org_id = $1`,
    [orgId],
  )
  const s = stats.rows[0]!
  const trainedPct = Math.round((parseInt(s.trained_users) / Math.max(parseInt(s.total_users), 1)) * 100)

  const controls = FRAMEWORK_CONTROLS[framework].map(control => ({
    ...control,
    status: trainedPct >= 80 ? 'PASS' : trainedPct >= 50 ? 'PARTIAL' : 'FAIL',
    evidence: `${s.trained_users}/${s.total_users} users trained (${trainedPct}%). Avg risk score: ${s.avg_score}/100. Phishing campaigns: ${s.phish_campaigns}.`,
  }))

  const passed = controls.filter(c => c.status === 'PASS').length
  return {
    controls,
    summary: { total: controls.length, passed, coverage_pct: Math.round((passed / controls.length) * 100) },
  }
}
```

---

## 9.23 Audit trail export (SOC 2 evidence package)

**File:** `apps/api/src/routes/auditExport.ts`

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, requireRole } from '../middleware/auth'
import { requirePlan } from '../middleware/planGate'
import { db } from '../db/client'

export const auditExportRouter = Router()
auditExportRouter.use(requireAuth, requireRole('ciso', 'admin'), requirePlan('enterprise'))

const QuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['json', 'csv']).default('json'),
})

auditExportRouter.get('/', async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid params', code: 'VALIDATION_ERROR', requestId: res.locals.requestId })
    return
  }
  const { orgId } = res.locals.principal!
  const { start, end, format } = parsed.data

  const result = await db.query<{
    id: string; user_id: string; action: string; metadata: unknown; occurred_at: Date
  }>(
    `SELECT al.id, al.user_id, al.action, al.metadata, al.occurred_at
     FROM audit_log al
     WHERE al.org_id = $1 AND al.occurred_at >= $2 AND al.occurred_at < $3::date + INTERVAL '1 day'
     ORDER BY al.occurred_at DESC
     LIMIT 10000`,
    [orgId, start, end],
  )

  if (format === 'csv') {
    const rows = result.rows
    const header = 'id,user_id,action,metadata,occurred_at\n'
    const body = rows.map(r =>
      [r.id, r.user_id ?? '', r.action, JSON.stringify(r.metadata ?? {}).replace(/,/g, ';'), r.occurred_at.toISOString()].join(',')
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="audit_${start}_${end}.csv"`)
    res.send(header + body)
    return
  }

  res.json({ entries: result.rows, total: result.rowCount, period: { start, end } })
})
```

---

## 9.24 Phase 9 tests

**File:** `apps/api/src/services/__tests__/billing.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
  })),
}))
vi.mock('../../db/client', () => ({ db: { query: vi.fn() } }))
vi.mock('../../config/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('../../config/env', () => ({
  env: {
    STRIPE_SECRET_KEY: 'sk_test_fake',
    STRIPE_WEBHOOK_SECRET: 'whsec_fake',
    STRIPE_GROWTH_PRICE_ID: 'price_growth',
    STRIPE_ENTERPRISE_PRICE_ID: 'price_enterprise',
    NEXTAUTH_URL: 'http://localhost:3000',
  },
}))

import Stripe from 'stripe'
import { db } from '../../db/client'

const mockDb = vi.mocked(db)
const mockStripe = vi.mocked(Stripe)

describe('Stripe webhook handling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('activates subscription on checkout.session.completed', async () => {
    const stripeInstance = {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue({
          type: 'checkout.session.completed',
          data: { object: { metadata: { orgId: 'org-1', plan: 'growth' }, subscription: 'sub_123' } },
        }),
      },
    }
    mockStripe.mockImplementationOnce(() => stripeInstance as never)

    mockDb.query.mockResolvedValue({ rows: [] } as never)

    const { handleWebhook } = await import('../stripe')
    await handleWebhook(Buffer.from('{}'), 'sig_test')

    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE organizations SET stripe_subscription_id'),
      ['sub_123', 'growth', 'org-1'],
    )
  })
})
```

**File:** `apps/api/src/middleware/__tests__/apiKeyAuth.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../db/client', () => ({ db: { query: vi.fn() } }))
vi.mock('../../db/redis', () => ({ redis: { incr: vi.fn(), expire: vi.fn() } }))

import { createHash } from 'crypto'
import type { Request, Response } from 'express'
import { db } from '../../db/client'
import { redis } from '../../db/redis'
import { apiKeyAuth } from '../apiKeyAuth'

const mockDb = vi.mocked(db)
const mockRedis = vi.mocked(redis)

describe('apiKeyAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects missing API key', async () => {
    const req = { headers: {} } as Request
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), locals: { requestId: 'r1' } } as unknown as Response
    const next = vi.fn()

    await apiKeyAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects rate-limited key', async () => {
    mockRedis.incr.mockResolvedValue(1001 as never)
    mockRedis.expire.mockResolvedValue(1 as never)

    const req = { headers: { 'x-api-key': 'test-key' } } as Request
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), locals: { requestId: 'r1' } } as unknown as Response
    const next = vi.fn()

    await apiKeyAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('accepts valid key and sets principal', async () => {
    mockRedis.incr.mockResolvedValue(1 as never)
    mockRedis.expire.mockResolvedValue(1 as never)
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'key-1', org_id: 'org-1' }] } as never)
    mockDb.query.mockResolvedValue({ rows: [] } as never) // last_used_at update

    const req = { headers: { 'x-api-key': 'valid-key' } } as Request
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), locals: { requestId: 'r1' } } as unknown as Response
    const next = vi.fn()

    await apiKeyAuth(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.locals.principal).toEqual({ orgId: 'org-1', userId: 'api', role: 'api' })
  })
})
```

**Commit:** `feat(api): compliance frameworks, audit export, phase 9 tests (#9.22-9.24)`
