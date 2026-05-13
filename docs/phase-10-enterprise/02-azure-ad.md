# Steps 10.03–10.04 — Azure AD Integration

## 10.03 azure-ad.ts service

**Install:** `pnpm add @microsoft/microsoft-graph-client @azure/identity` in `apps/api`

Add to `env.ts`:
```typescript
AZURE_TENANT_ID: z.string().optional(),
AZURE_CLIENT_ID: z.string().optional(),
AZURE_CLIENT_SECRET: z.string().optional(),
AZURE_CA_POLICY_ID: z.string().optional(),
```

**File:** `apps/api/src/services/azureAd.ts`

```typescript
import { Client } from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential } from '@azure/identity'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import { env } from '../config/env'
import { logger } from '../config/logger'

function getGraphClient(): Client | null {
  if (!env.AZURE_TENANT_ID || !env.AZURE_CLIENT_ID || !env.AZURE_CLIENT_SECRET) return null
  const credential = new ClientSecretCredential(env.AZURE_TENANT_ID, env.AZURE_CLIENT_ID, env.AZURE_CLIENT_SECRET)
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  })
  return Client.initWithMiddleware({ authProvider })
}

export async function applyConditionalAccess(aadUserId: string): Promise<void> {
  const client = getGraphClient()
  if (!client || !env.AZURE_CA_POLICY_ID) {
    logger.warn('Azure AD not configured — skipping Conditional Access')
    return
  }
  try {
    // Add user to the Conditional Access named locations exclusion list (requires MFA)
    // The CA policy requires MFA for all users NOT in a trusted named location
    // Removing a user from the exclusion list = requiring MFA
    const policy = await client.api(`/identity/conditionalAccess/policies/${env.AZURE_CA_POLICY_ID}`).get() as {
      conditions: { users: { excludeUsers: string[] } }
    }
    const excludeUsers = policy.conditions.users.excludeUsers.filter(id => id !== aadUserId)
    await client.api(`/identity/conditionalAccess/policies/${env.AZURE_CA_POLICY_ID}`).patch({
      conditions: { users: { excludeUsers } },
    })
    logger.info({ aadUserId }, 'Applied Azure CA: removed from MFA exclusion')
  } catch (err) {
    logger.error({ err, aadUserId }, 'Failed to apply Azure Conditional Access')
    throw err
  }
}

export async function removeConditionalAccess(aadUserId: string): Promise<void> {
  const client = getGraphClient()
  if (!client || !env.AZURE_CA_POLICY_ID) return
  try {
    const policy = await client.api(`/identity/conditionalAccess/policies/${env.AZURE_CA_POLICY_ID}`).get() as {
      conditions: { users: { excludeUsers: string[] } }
    }
    const excludeUsers = [...new Set([...policy.conditions.users.excludeUsers, aadUserId])]
    await client.api(`/identity/conditionalAccess/policies/${env.AZURE_CA_POLICY_ID}`).patch({
      conditions: { users: { excludeUsers } },
    })
    logger.info({ aadUserId }, 'Removed Azure CA enforcement: added back to MFA exclusion')
  } catch (err) {
    logger.error({ err, aadUserId }, 'Failed to remove Azure Conditional Access')
    throw err
  }
}

export async function getAadUserIdByEmail(email: string): Promise<string | null> {
  const client = getGraphClient()
  if (!client) return null
  try {
    const user = await client.api(`/users/${email}`).select('id').get() as { id: string }
    return user.id
  } catch {
    return null
  }
}
```

---

## 10.04 Azure risk-triggered job

**File:** `apps/api/src/jobs/azureRiskPolicy.ts`

```typescript
import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'
import { applyConditionalAccess, removeConditionalAccess, getAadUserIdByEmail } from '../services/azureAd'

const HIGH_RISK_THRESHOLD = 40
const RECOVERY_THRESHOLD = 60

export const azureRiskQueue = new Queue('azure-risk', { connection })

export const azureRiskWorker = new Worker(
  'azure-risk',
  async () => {
    const users = await db.query<{ id: string; email: string; risk_score: number; azure_ca_applied: boolean }>(
      `SELECT u.id, u.email, u.risk_score,
              COALESCE((u.metadata->>'azure_ca_applied')::boolean, false) AS azure_ca_applied
       FROM users u
       JOIN organizations o ON o.id = u.org_id
       WHERE o.plan = 'enterprise'
         AND o.teams_tenant_id IS NOT NULL
         AND u.role = 'employee'
         AND (u.risk_score < $1 OR (u.risk_score > $2 AND (u.metadata->>'azure_ca_applied')::boolean = true))`,
      [HIGH_RISK_THRESHOLD, RECOVERY_THRESHOLD],
    )

    for (const user of users.rows) {
      const aadUserId = await getAadUserIdByEmail(user.email)
      if (!aadUserId) continue

      try {
        if (user.risk_score < HIGH_RISK_THRESHOLD && !user.azure_ca_applied) {
          await applyConditionalAccess(aadUserId)
          await db.query(
            `UPDATE users SET metadata = COALESCE(metadata, '{}') || '{"azure_ca_applied": true}' WHERE id = $1`,
            [user.id],
          )
          await db.query(
            `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ((SELECT org_id FROM users WHERE id = $1), $1, 'azure_ca_applied', $2)`,
            [user.id, JSON.stringify({ score: user.risk_score })],
          )
        } else if (user.risk_score > RECOVERY_THRESHOLD && user.azure_ca_applied) {
          await removeConditionalAccess(aadUserId)
          await db.query(
            `UPDATE users SET metadata = COALESCE(metadata, '{}') || '{"azure_ca_applied": false}' WHERE id = $1`,
            [user.id],
          )
          await db.query(
            `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ((SELECT org_id FROM users WHERE id = $1), $1, 'azure_ca_removed', $2)`,
            [user.id, JSON.stringify({ score: user.risk_score })],
          )
        }
      } catch (err) {
        logger.error({ err, userId: user.id }, 'Azure risk policy update failed')
        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'job_failure', $2)`,
          [user.id, JSON.stringify({ job: 'azure-risk', error: String(err) })],
        )
      }
    }
    logger.info({ processed: users.rows.length }, 'Azure risk policy run complete')
  },
  { connection, concurrency: 2, timeout: 60_000 },
)

azureRiskWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'azure-risk job failed')
})

await azureRiskQueue.add('nightly', {}, {
  repeat: { pattern: '45 2 * * *' },
  removeOnComplete: { count: 30 },
  removeOnFail: { count: 30 },
})
```

**Commit:** `feat(api): Azure AD Conditional Access service and risk-triggered job (#10.03-10.04)`
