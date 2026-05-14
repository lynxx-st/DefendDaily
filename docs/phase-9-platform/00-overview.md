# Phase 9 — Analytics, Gamification & Platform

**Goal:** Turn DefendDaily into a full platform. Ship advanced CISO analytics, Stripe billing,
a public API, Zapier integration, white-label customization, gamification expansion, seasonal
events, SCIM provisioning, and compliance exports that satisfy cyber insurance questionnaires
and SOC 2 auditors.

**Exit criteria:** Stripe checkout flow creates a subscription and gates features correctly.
Public API returns data with JWT API keys and enforces 1000/hr rate limit. Zapier trigger
fires on `phish.clicked` event. SCIM endpoint auto-creates users from an Okta push. SOC 2
evidence package downloads with full audit trail. All Phase 9 tests pass.

**Estimated effort:** 6 weeks

**Prerequisites:** Phase 4 (CISO Dashboard), Phase 6 (UI overhaul), Phase 7 (engagement).

## Steps (24 total)

| #    | Detail File                    | Description |
|------|--------------------------------|-------------|
| 9.01 | 01-advanced-analytics.md       | Cohort analysis dashboard (new hire vs 30/90-day vs veteran) |
| 9.02 | 01-advanced-analytics.md       | Behavioral change score (90-day before/after diff) |
| 9.03 | 01-advanced-analytics.md       | Department risk sparklines (7/30/90-day trend per dept) |
| 9.04 | 01-advanced-analytics.md       | ROI calculator page (breach cost avoided, insurance discount) |
| 9.05 | 01-advanced-analytics.md       | Campaign management (admin schedules themed training weeks) |
| 9.06 | 02-billing-and-growth.md       | Custom puzzle campaigns (assign sets to specific teams) |
| 9.07 | 02-billing-and-growth.md       | Stripe billing integration (checkout + subscription tiers) |
| 9.08 | 02-billing-and-growth.md       | Seat-based metered billing + Stripe webhook handlers |
| 9.09 | 02-billing-and-growth.md       | In-app upgrade flow (feature gates + upsell banners) |
| 9.10 | 02-billing-and-growth.md       | Customer success portal (health score, adoption, renewal) |
| 9.11 | 02-billing-and-growth.md       | Referral program (unique links, commission tracking) |
| 9.12 | 03-integrations.md             | Outbound webhook framework (retry, delivery log, event types) |
| 9.13 | 03-integrations.md             | Zapier integration (phish_click, streak_milestone, score_drop) |
| 9.14 | 03-integrations.md             | Public API v1 (JWT API keys, rate limiting 1000/hr) |
| 9.15 | 03-integrations.md             | OpenAPI 3.1 spec auto-generation |
| 9.16 | 03-integrations.md             | Developer documentation site (Mintlify) |
| 9.17 | 04-gamification-expansion.md   | Seasonal events (Security Awareness Month — 2× points) |
| 9.18 | 04-gamification-expansion.md   | Monthly Security Champion award (auto-nominate, Slack post) |
| 9.19 | 04-gamification-expansion.md   | Anonymous industry benchmark (percentile rank vs cohort) |
| 9.20 | 04-gamification-expansion.md   | White-label customization (org logo, colors, custom domain) |
| 9.21 | 04-gamification-expansion.md   | SCIM 2.0 provisioning endpoint (auto-create/deactivate users) |
| 9.22 | 05-compliance-and-reporting.md | Advanced compliance reports (HIPAA, PCI-DSS, ISO 27001 mapping) |
| 9.23 | 05-compliance-and-reporting.md | Audit trail export (SOC 2 Type II evidence package) |
| 9.24 | 05-compliance-and-reporting.md | Phase 9 tests (billing, webhooks, API rate limiting) |

## Key Architecture Notes

- **Stripe billing:** `stripe` SDK in `apps/api`. Products created in Stripe dashboard.
  `organizations` table gains `stripe_customer_id`, `stripe_subscription_id`, `plan_status`.
  Feature gates are checked via `requirePlan('growth')` middleware in route handlers.
- **Public API keys:** `api_keys` table (`id`, `org_id`, `key_hash`, `last_used_at`,
  `requests_this_hour`). Rate limit enforced via Redis counter `api_rate:{key_id}` with
  1-hour TTL. Never store raw key — only SHA-256 hash. Show key once on creation.
- **Webhooks:** `webhook_endpoints` table stores URL + secret + event_types[]. Delivery
  uses BullMQ with `attempts: 5` exponential backoff. Logs to `webhook_deliveries` table
  with status code + response body (truncated at 1KB).
- **SCIM:** Implements SCIM 2.0 `Users` endpoint at `/scim/v2/Users`. Okta and Azure AD
  push user create/update/deactivate events here. Maps SCIM `userName` → `users.email`,
  `active: false` → `users.deactivated_at`.
- **White-label:** Org uploads logo to MinIO. A Next.js API route generates a CSS file
  with `--color-primary` and `--org-logo-url` CSS custom properties, served at
  `/api/theme/{orgId}.css`. The dashboard root layout loads this if `org.white_label_enabled`.

## Revenue Impact at Phase 9 Completion

- Stripe integration unlocks self-serve revenue — no sales motion required for < 200 seats.
- Zapier listing opens a distribution channel of 5M+ Zapier users.
- SCIM provisioning is a hard requirement for most Enterprise security policies — unlocks
  deals > 500 seats that were previously blocked.
- White-label unlocks MSP channel at full margin.
