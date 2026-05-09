# Steps 6.01 + 6.02 + 6.03: Okta Management API Integration

## Install

```bash
cd apps/api && pnpm add @okta/okta-sdk-nodejs
```

## apps/api/src/services/okta.ts

```typescript
import { Client } from '@okta/okta-sdk-nodejs';
import { env } from '../config/env';

function getOktaClient(): Client {
  if (!env.OKTA_DOMAIN || !env.OKTA_API_TOKEN) {
    throw new Error('Okta credentials not configured');
  }
  return new Client({
    orgUrl: `https://${env.OKTA_DOMAIN}`,
    token: env.OKTA_API_TOKEN,
  });
}

export async function enforceHardwareMfa(oktaUserId: string): Promise<void> {
  if (!env.OKTA_RISK_POLICY_GROUP_ID) throw new Error('OKTA_RISK_POLICY_GROUP_ID not set');
  const client = getOktaClient();
  await client.group.assignUserToGroup(env.OKTA_RISK_POLICY_GROUP_ID, oktaUserId);
}

export async function removeHardwareMfa(oktaUserId: string): Promise<void> {
  if (!env.OKTA_RISK_POLICY_GROUP_ID) throw new Error('OKTA_RISK_POLICY_GROUP_ID not set');
  const client = getOktaClient();
  await client.group.removeUserFromGroup(env.OKTA_RISK_POLICY_GROUP_ID, oktaUserId);
}
```

## Add okta_user_id column (new migration: 005_okta_azure.sql)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS okta_user_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS azure_object_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS idp_mfa_enforced BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS okta_domain VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS azure_tenant_id VARCHAR(100);
```

## Risk-triggered Okta BullMQ job (add to riskScore.ts worker, after score update)

```typescript
// Add inside the riskScore worker loop, after computing and saving score:

const idpResult = await db.query<{ okta_user_id: string | null; idp_mfa_enforced: boolean }>(
  'SELECT okta_user_id, idp_mfa_enforced FROM users WHERE id = $1',
  [user.id]
);
const idpData = idpResult.rows[0];

if (idpData?.okta_user_id && env.OKTA_API_TOKEN) {
  // Step 6.02: score < 40 → enforce
  if (score < 40 && !idpData.idp_mfa_enforced) {
    await enforceHardwareMfa(idpData.okta_user_id);
    await db.query(
      'UPDATE users SET idp_mfa_enforced = true WHERE id = $1', [user.id]
    );
    await db.query(
      `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'idp_mfa_enforced', $2)`,
      [user.id, JSON.stringify({ score, okta_user_id: idpData.okta_user_id })]
    );
  }

  // Step 6.03: score > 60 → reverse enforcement
  if (score >= 60 && idpData.idp_mfa_enforced) {
    await removeHardwareMfa(idpData.okta_user_id);
    await db.query(
      'UPDATE users SET idp_mfa_enforced = false WHERE id = $1', [user.id]
    );
    await db.query(
      `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'idp_mfa_removed', $2)`,
      [user.id, JSON.stringify({ score, okta_user_id: idpData.okta_user_id })]
    );
  }
}
```

**Commit:**
```bash
git add apps/api/src/services/okta.ts apps/api/src/db/migrations/005_okta_azure.sql apps/api/src/jobs/riskScore.ts
git commit -m "feat(enterprise): add Okta MFA enforcement triggered by risk score threshold"
```

**Update PROGRESS.md:** Check off 6.01, 6.02, 6.03. Set Last Completed to "6.03 — Okta integration".
