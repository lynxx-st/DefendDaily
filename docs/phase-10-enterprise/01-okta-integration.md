# Steps 10.01–10.02 — Okta Integration

## 10.01 okta.ts service

**Install:** `pnpm add @okta/okta-sdk-nodejs` in `apps/api`

Add to `env.ts`:
```typescript
OKTA_DOMAIN: z.string().optional(),
OKTA_API_TOKEN: z.string().optional(),
OKTA_RISK_POLICY_GROUP_ID: z.string().optional(),
```

**File:** `apps/api/src/services/okta.ts`

```typescript
import { Client } from '@okta/okta-sdk-nodejs'
import { env } from '../config/env'
import { logger } from '../config/logger'

function getOktaClient(): Client | null {
  if (!env.OKTA_DOMAIN || !env.OKTA_API_TOKEN) return null
  return new Client({ orgUrl: `https://${env.OKTA_DOMAIN}`, token: env.OKTA_API_TOKEN })
}

export async function assignMfaEnforcementGroup(oktaUserId: string): Promise<void> {
  const client = getOktaClient()
  if (!client || !env.OKTA_RISK_POLICY_GROUP_ID) {
    logger.warn('Okta not configured — skipping MFA enforcement assignment')
    return
  }
  try {
    await client.groupApi.assignUserToGroup({ groupId: env.OKTA_RISK_POLICY_GROUP_ID, userId: oktaUserId })
    logger.info({ oktaUserId }, 'Assigned user to Okta MFA enforcement group')
  } catch (err) {
    logger.error({ err, oktaUserId }, 'Failed to assign Okta MFA enforcement group')
    throw err
  }
}

export async function removeMfaEnforcementGroup(oktaUserId: string): Promise<void> {
  const client = getOktaClient()
  if (!client || !env.OKTA_RISK_POLICY_GROUP_ID) return
  try {
    await client.groupApi.unassignUserFromGroup({ groupId: env.OKTA_RISK_POLICY_GROUP_ID, userId: oktaUserId })
    logger.info({ oktaUserId }, 'Removed user from Okta MFA enforcement group')
  } catch (err) {
    logger.error({ err, oktaUserId }, 'Failed to remove Okta MFA enforcement group')
    throw err
  }
}

export async function getUserIdByEmail(email: string): Promise<string | null> {
  const client = getOktaClient()
  if (!client) return null
  try {
    const user = await client.userApi.getUser({ userId: email })
    return user.id ?? null
  } catch {
    return null
  }
}
```

---

## 10.02 Okta risk-triggered BullMQ job

**File:** `apps/api/src/jobs/oktaRiskPolicy.ts`

```typescript
import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'
import { assignMfaEnforcementGroup, removeMfaEnforcementGroup, getUserIdByEmail } from '../services/okta'

const HIGH_RISK_THRESHOLD = 40
const RECOVERY_THRESHOLD = 60

export const oktaRiskQueue = new Queue('okta-risk', { connection })

export const oktaRiskWorker = new Worker(
  'okta-risk',
  async () => {
    const users = await db.query<{ id: string; email: string; risk_score: number; okta_mfa_enforced: boolean }>(
      `SELECT u.id, u.email, u.risk_score,
              COALESCE((u.metadata->>'okta_mfa_enforced')::boolean, false) AS okta_mfa_enforced
       FROM users u
       JOIN organizations o ON o.id = u.org_id
       WHERE o.plan = 'enterprise'
         AND u.role = 'employee'
         AND (u.risk_score < $1 OR (u.risk_score > $2 AND (u.metadata->>'okta_mfa_enforced')::boolean = true))`,
      [HIGH_RISK_THRESHOLD, RECOVERY_THRESHOLD],
    )

    for (const user of users.rows) {
      const oktaUserId = await getUserIdByEmail(user.email)
      if (!oktaUserId) continue

      try {
        if (user.risk_score < HIGH_RISK_THRESHOLD && !user.okta_mfa_enforced) {
          await assignMfaEnforcementGroup(oktaUserId)
          await db.query(
            `UPDATE users SET metadata = COALESCE(metadata, '{}') || '{"okta_mfa_enforced": true}' WHERE id = $1`,
            [user.id],
          )
          await db.query(
            `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ((SELECT org_id FROM users WHERE id = $1), $1, 'okta_mfa_enforced', $2)`,
            [user.id, JSON.stringify({ score: user.risk_score, threshold: HIGH_RISK_THRESHOLD })],
          )
        } else if (user.risk_score > RECOVERY_THRESHOLD && user.okta_mfa_enforced) {
          await removeMfaEnforcementGroup(oktaUserId)
          await db.query(
            `UPDATE users SET metadata = COALESCE(metadata, '{}') || '{"okta_mfa_enforced": false}' WHERE id = $1`,
            [user.id],
          )
          await db.query(
            `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ((SELECT org_id FROM users WHERE id = $1), $1, 'okta_mfa_removed', $2)`,
            [user.id, JSON.stringify({ score: user.risk_score, threshold: RECOVERY_THRESHOLD })],
          )
        }
      } catch (err) {
        logger.error({ err, userId: user.id }, 'Okta risk policy update failed')
        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'job_failure', $2)`,
          [user.id, JSON.stringify({ job: 'okta-risk', error: String(err) })],
        )
      }
    }
    logger.info({ processed: users.rows.length }, 'Okta risk policy run complete')
  },
  { connection, concurrency: 2, timeout: 60_000 },
)

oktaRiskWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'okta-risk job failed')
})

// Run nightly after riskScore job
await oktaRiskQueue.add('nightly', {}, {
  repeat: { pattern: '30 2 * * *' },
  removeOnComplete: { count: 30 },
  removeOnFail: { count: 30 },
})
```

**Migration:** Add to `014_enterprise.sql`:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
-- Stores: okta_mfa_enforced (bool), azure_ca_applied (bool), sso_subject (string)
```

**Commit:** `feat(api): Okta MFA enforcement service and risk-triggered job (#10.01-10.02)`
