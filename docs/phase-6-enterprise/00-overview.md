# Phase 6 — Enterprise & IdP Automation

**Goal:** Close the loop from "awareness training" to "actual access control." Users with
score < 40 are automatically placed in MFA enforcement groups in Okta and Azure AD.
SSO for enterprise logins. MSP partner portal for white-label reselling.

**Exit criteria:** User risk score drops below 40 → Okta group assignment fires. Score
recovers to 60+ → group removed. SSO login works. MSP portal shows multi-org view.

**Estimated effort:** 4 weeks

**Prerequisites:** Phase 2 (risk scores), Phase 4 (dashboard + auth).

## Steps (10 total)

| # | Detail File | Description |
|---|-------------|-------------|
| 6.01 | 01-okta-integration.md | okta.ts service (Management API) |
| 6.02 | 01-okta-integration.md | Okta risk-triggered BullMQ job |
| 6.03 | 01-okta-integration.md | Okta policy reversal (score > 60) |
| 6.04 | 02-azure-ad-integration.md | azure-ad.ts (Graph API service) |
| 6.05 | 02-azure-ad-integration.md | Azure risk-triggered job |
| 6.06 | 03-sso-saml-oidc.md | SSO SAML/OIDC via NextAuth |
| 6.07 | 04-msp-partner-portal.md | MSP portal layout |
| 6.08 | 04-msp-partner-portal.md | Multi-org overview dashboard |
| 6.09 | 04-msp-partner-portal.md | White-label compliance PDF |
| 6.10 | 05-phase6-tests.md | Integration tests (msw mocks) |

## Key Thresholds

| Score | Action |
|-------|--------|
| < 40  | Enforce hardware MFA (Okta group + Azure CA policy) |
| 40–59 | Serve harder puzzles (from Phase 2) |
| 60+   | Reverse IdP enforcement if previously applied |

## API Requirements

- **Okta:** `@okta/okta-sdk-nodejs` — Group Member API to assign/remove users from MFA group
- **Microsoft Graph:** `@microsoft/microsoft-graph-client` — Conditional Access policies
- **SSO:** NextAuth enterprise providers (SAML via `next-auth/providers/credentials` + SAML library)
