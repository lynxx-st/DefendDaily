# Steps 10.09–10.10 — Reseller Billing & Tests

## 10.09 Stripe reseller billing webhook

**File:** `apps/api/src/services/resellerBilling.ts`

```typescript
import Stripe from 'stripe'
import { db } from '../db/client'
import { logger } from '../config/logger'
import { stripe } from './stripe'

export async function handleResellerTransfer(invoice: Stripe.Invoice): Promise<void> {
  if (!invoice.customer || invoice.status !== 'paid') return

  const orgRow = await db.query<{ msp_partner_id: string | null; id: string }>(
    `SELECT o.id, o.msp_partner_id FROM organizations o WHERE o.stripe_customer_id = $1`,
    [invoice.customer as string],
  )
  const org = orgRow.rows[0]
  if (!org?.msp_partner_id) return

  const partnerRow = await db.query<{ stripe_account_id: string | null; margin_pct: number }>(
    `SELECT stripe_account_id, margin_pct FROM msp_partners WHERE id = $1`,
    [org.msp_partner_id],
  )
  const partner = partnerRow.rows[0]
  if (!partner?.stripe_account_id) return

  const invoiceTotal = invoice.amount_paid
  const transferAmount = Math.floor(invoiceTotal * (partner.margin_pct / 100))
  if (transferAmount <= 0) return

  try {
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: invoice.currency,
      destination: partner.stripe_account_id,
      transfer_group: `invoice_${invoice.id}`,
      metadata: { orgId: org.id, invoiceId: invoice.id, marginPct: String(partner.margin_pct) },
    })

    await db.query(
      `INSERT INTO audit_log (org_id, action, metadata) VALUES ($1, 'reseller_transfer', $2)`,
      [org.id, JSON.stringify({ transferId: transfer.id, amount: transferAmount, currency: invoice.currency })],
    )
    logger.info({ orgId: org.id, transferAmount, currency: invoice.currency }, 'Reseller transfer created')
  } catch (err) {
    logger.error({ err, orgId: org.id }, 'Reseller transfer failed')
    throw err
  }
}
```

Update `apps/api/src/services/stripe.ts` webhook handler:

```typescript
case 'invoice.paid': {
  const invoice = event.data.object as Stripe.Invoice
  await handleResellerTransfer(invoice)
  break
}
```

---

## 10.10 Phase 10 integration tests

**File:** `apps/api/src/services/__tests__/okta.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@okta/okta-sdk-nodejs', () => ({
  Client: vi.fn().mockImplementation(() => ({
    groupApi: {
      assignUserToGroup: vi.fn().mockResolvedValue({}),
      unassignUserFromGroup: vi.fn().mockResolvedValue({}),
    },
    userApi: { getUser: vi.fn() },
  })),
}))

vi.mock('../../config/env', () => ({
  env: {
    OKTA_DOMAIN: 'test.okta.com',
    OKTA_API_TOKEN: 'test-token',
    OKTA_RISK_POLICY_GROUP_ID: 'group-123',
  },
}))

vi.mock('../../config/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { Client } from '@okta/okta-sdk-nodejs'
import { assignMfaEnforcementGroup, removeMfaEnforcementGroup } from '../okta'

describe('Okta MFA enforcement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('assigns user to MFA group', async () => {
    await assignMfaEnforcementGroup('user-okta-123')

    const instance = vi.mocked(Client).mock.results[0]?.value as { groupApi: { assignUserToGroup: ReturnType<typeof vi.fn> } }
    expect(instance.groupApi.assignUserToGroup).toHaveBeenCalledWith({
      groupId: 'group-123',
      userId: 'user-okta-123',
    })
  })

  it('removes user from MFA group', async () => {
    await removeMfaEnforcementGroup('user-okta-123')

    const instance = vi.mocked(Client).mock.results[0]?.value as { groupApi: { unassignUserFromGroup: ReturnType<typeof vi.fn> } }
    expect(instance.groupApi.unassignUserFromGroup).toHaveBeenCalledWith({
      groupId: 'group-123',
      userId: 'user-okta-123',
    })
  })
})
```

**File:** `apps/api/src/services/__tests__/azureAd.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware: vi.fn().mockReturnValue({
      api: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ conditions: { users: { excludeUsers: ['other-user'] } } }),
      patch: vi.fn().mockResolvedValue({}),
      select: vi.fn().mockReturnThis(),
    }),
  },
}))

vi.mock('@azure/identity', () => ({
  ClientSecretCredential: vi.fn(),
}))

vi.mock('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials', () => ({
  TokenCredentialAuthenticationProvider: vi.fn(),
}))

vi.mock('../../config/env', () => ({
  env: {
    AZURE_TENANT_ID: 'tenant-1',
    AZURE_CLIENT_ID: 'client-1',
    AZURE_CLIENT_SECRET: 'secret-1',
    AZURE_CA_POLICY_ID: 'policy-123',
  },
}))

vi.mock('../../config/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { applyConditionalAccess, removeConditionalAccess } from '../azureAd'
import { Client } from '@microsoft/microsoft-graph-client'

describe('Azure AD Conditional Access', () => {
  beforeEach(() => vi.clearAllMocks())

  it('removes user from exclusion list on applyConditionalAccess', async () => {
    const mockClient = vi.mocked(Client.initWithMiddleware).mock.results[0]?.value as {
      api: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn>
    }

    await applyConditionalAccess('aad-user-456')

    // User should be removed from excludeUsers
    expect(mockClient.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: { users: { excludeUsers: ['other-user'] } },
      }),
    )
  })

  it('adds user back to exclusion list on removeConditionalAccess', async () => {
    const mockClient = vi.mocked(Client.initWithMiddleware).mock.results[0]?.value as {
      api: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn>
    }

    await removeConditionalAccess('aad-user-456')

    expect(mockClient.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: expect.objectContaining({ users: expect.objectContaining({ excludeUsers: expect.arrayContaining(['aad-user-456']) }) }),
      }),
    )
  })
})
```

**Commit:** `feat(api): reseller billing transfer, Okta + Azure AD integration tests (#10.09-10.10)`
