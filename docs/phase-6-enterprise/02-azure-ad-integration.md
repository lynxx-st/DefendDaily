# Steps 6.04 + 6.05: Azure AD / Microsoft Graph Integration

## Install

```bash
cd apps/api && pnpm add @microsoft/microsoft-graph-client @azure/identity
```

## apps/api/src/services/azure-ad.ts

```typescript
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { env } from '../config/env';

function getGraphClient(tenantId: string): Client {
  const clientId = env.OKTA_DOMAIN ?? ''; // Reuse pattern — add AZURE_CLIENT_ID to env schema
  // TODO: Add AZURE_CLIENT_ID and AZURE_CLIENT_SECRET to env.ts and .env.example
  const credential = new ClientSecretCredential(
    tenantId,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!,
  );

  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => {
        const token = await credential.getToken('https://graph.microsoft.com/.default');
        return token?.token ?? '';
      },
    },
  });
}

export async function enforceConditionalAccess(
  azureObjectId: string,
  tenantId: string
): Promise<void> {
  const client = getGraphClient(tenantId);
  // Add user to a "Require MFA" Conditional Access group
  const groupId = process.env.AZURE_MFA_GROUP_ID!;
  await client.api(`/groups/${groupId}/members/$ref`).post({
    '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${azureObjectId}`,
  });
}

export async function removeConditionalAccess(
  azureObjectId: string,
  tenantId: string
): Promise<void> {
  const client = getGraphClient(tenantId);
  const groupId = process.env.AZURE_MFA_GROUP_ID!;
  await client.api(`/groups/${groupId}/members/${azureObjectId}/$ref`).delete();
}
```

## Integrate into riskScore.ts worker (Step 6.05 — mirrors Okta logic)

```typescript
// After Okta block, add:
if (idpData?.azure_object_id && process.env.AZURE_CLIENT_ID) {
  const orgResult = await db.query<{ azure_tenant_id: string | null }>(
    'SELECT azure_tenant_id FROM organizations WHERE id = (SELECT org_id FROM users WHERE id = $1)',
    [user.id]
  );
  const tenantId = orgResult.rows[0]?.azure_tenant_id;

  if (tenantId) {
    if (score < 40 && !idpData.idp_mfa_enforced) {
      await enforceConditionalAccess(idpData.azure_object_id, tenantId);
    } else if (score >= 60 && idpData.idp_mfa_enforced) {
      await removeConditionalAccess(idpData.azure_object_id, tenantId);
    }
  }
}
```

**Commit:**
```bash
git add apps/api/src/services/azure-ad.ts apps/api/src/jobs/riskScore.ts
git commit -m "feat(enterprise): add Azure AD Conditional Access policy enforcement via Microsoft Graph API"
```

**Update PROGRESS.md:** Check off 6.04 and 6.05. Set Last Completed to "6.05 — Azure AD integration".
