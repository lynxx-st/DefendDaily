# Phase 10 — Enterprise & IdP Automation

**Goal:** Close the loop from awareness training to actual access control. When a user's
Risk Score drops below 40, automatically enforce hardware MFA via Okta or Azure AD
Conditional Access — no manual CISO intervention required. Add SAML/OIDC SSO, a white-glove
MSP partner portal, and reseller billing infrastructure.

**Exit criteria:** A test user with score < 40 is assigned to the Okta MFA enforcement group.
Score recovery above 60 removes the policy. Azure AD Conditional Access exception is written
and reversed correctly. SAML login works with a test IdP. MSP portal shows aggregate stats
across 3+ orgs. Reseller billing webhook calculates partner margin correctly.

**Estimated effort:** 3 weeks

**Prerequisites:** Phase 9 (billing, API), Phase 2 (risk scores).

## Steps (10 total)

| #     | Detail File            | Description |
|-------|------------------------|-------------|
| 10.01 | 01-okta-integration.md | okta.ts service (assign/remove MFA enforcement group) |
| 10.02 | 01-okta-integration.md | Okta risk-triggered BullMQ job (score < 40 → on; > 60 → off) |
| 10.03 | 02-azure-ad.md         | azure-ad.ts service (Microsoft Graph Conditional Access) |
| 10.04 | 02-azure-ad.md         | Azure risk-triggered job (mirror Okta logic) |
| 10.05 | 03-sso.md              | SSO SAML/OIDC via NextAuth enterprise providers |
| 10.06 | 03-sso.md              | Org-level IdP URL mapping (each org has its own SAML metadata URL) |
| 10.07 | 04-msp-portal.md       | MSP partner portal layout (multi-org management) |
| 10.08 | 04-msp-portal.md       | Multi-org overview dashboard + white-label compliance PDF |
| 10.09 | 05-reseller-billing.md | Stripe reseller billing webhook (partner margin calculation) |
| 10.10 | 05-reseller-billing.md | Phase 10 integration tests (msw mocks for Okta + Graph APIs) |

## Key Architecture Notes

- **Okta integration:** Uses `@okta/okta-sdk-nodejs`. The `okta.ts` service calls
  `client.addUserToGroup(userId, riskPolicyGroupId)` and
  `client.removeUserFromGroup(userId, riskPolicyGroupId)`. The group enforces
  hardware MFA via an Okta Sign-On Policy — managed in the Okta admin console, not in code.
- **Azure AD:** Uses `@microsoft/microsoft-graph-client`. Writes a Conditional Access
  named location exception for the user. `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`,
  `AZURE_CLIENT_SECRET` must have `Policy.ReadWrite.ConditionalAccess` Graph permission.
- **SSO:** Each enterprise org stores `sso_type` ('saml' | 'oidc'), `sso_metadata_url`,
  and `sso_client_id` in the `organizations` table. NextAuth dynamically constructs the
  provider config at request time using these values.
- **MSP portal:** Accessible at `/msp/*` route group, gated by `role = 'msp_admin'`.
  MSP admin sees a table of all managed orgs with aggregate risk scores, seat counts,
  and renewal dates.
- **Reseller billing:** Stripe Connect used for partner payouts. When a managed customer
  pays, a `transfer` is created to the MSP's Stripe Connect account for their margin
  (configurable per-partner, stored in `msp_partners` table).
