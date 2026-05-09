# DefendDaily — Session Progress Tracker

> **IMPORTANT FOR CLAUDE:** When the user types "continue", read this file first.
> Find the first unchecked step (`- [ ]`) across all phases and resume from there.
> After completing each step, check it off (`- [x]`) and update "Last Completed" below.
> Commit PROGRESS.md after every step so sessions are always resumable.

## Last Completed
- **Phase:** 3 — Peer Phish
- **Step:** 3.11 — tracking webhooks + rate limiting (3.03, 3.04, 3.11 combined)
- **File:** `apps/api/src/routes/webhooks.ts`
- **Date:** 2026-05-09

## Overall Phase Status
- [x] Phase 1: Bot MVP (19 steps)
- [x] Phase 2: Risk Score & HIBP (10 steps)
- [ ] Phase 3: Peer Phish (12 steps)
- [ ] Phase 4: CISO Dashboard (15 steps)
- [ ] Phase 5: SentryLife & Family Mode (12 steps)
- [ ] Phase 6: Enterprise & IdP Automation (10 steps)

## Step-Level Checklist

### Phase 1 — Bot MVP
- [x] 1.01 Initialize pnpm monorepo (root package.json + pnpm-workspace.yaml)
- [x] 1.02 Configure root TypeScript (tsconfig.base.json)
- [x] 1.03 Create infra/docker-compose.yml (Postgres 16 + Redis 7)
- [x] 1.04 Create .env.example with all variables from CLAUDE.md §9
- [x] 1.05 Initialize apps/api (Express + TypeScript + ts-node-dev)
- [x] 1.06 Build apps/api/src/config/env.ts (Zod env validation)
- [x] 1.07 Build apps/api/src/db/client.ts (node-postgres Pool)
- [x] 1.08 Build apps/api/src/db/redis.ts (ioredis client)
- [x] 1.09 Write apps/api/src/db/migrations/001_init.sql (full schema)
- [x] 1.10 Write migration runner script (apps/api/src/db/migrate.ts)
- [x] 1.11 Set up BullMQ (apps/api/src/jobs/queue.ts)
- [x] 1.12 Initialize Slack Bolt app + OAuth install flow
- [x] 1.13 Build Block Kit message builders (spot_the_phish, true_false, scenario, breach_alert)
- [x] 1.14 Implement /defend slash command
- [x] 1.15 Implement answer handler (scoring formula + Redis streak)
- [x] 1.16 Create dailyPuzzle.ts BullMQ repeatable job (9 AM per org timezone)
- [x] 1.17 Seed packages/puzzle-bank with 30+ puzzles across all types/difficulties
- [x] 1.18 Implement /leaderboard slash command (top 10 weekly)
- [x] 1.19 Write Phase 1 integration tests (vitest + msw)

### Phase 2 — Risk Score & HIBP
- [x] 2.01 Build riskScorer.ts service (formula: Awareness×0.4 + Consistency×0.3 − RealWorldRisk×0.3)
- [x] 2.02 Build hibp.ts service (k-anonymity email lookup, Redis 24h TTL cache)
- [x] 2.03 Create hibpCheck.ts BullMQ weekly job (scan all users, update breach_records)
- [x] 2.04 Create riskScore.ts BullMQ nightly job (recalculate all scores, write risk_score_history)
- [x] 2.05 Implement /risk slash command (color-coded shield DM)
- [x] 2.06 Build weekly Monday summary message (score + streak + tip)
- [x] 2.07 Add puzzle difficulty escalation trigger (score < 60 → harder puzzles)
- [x] 2.08 Write Phase 2 unit tests (scoring formula) + msw HIBP mock
- [x] 2.09 Verify Redis key conventions (hibp:{email_hash} TTL, streak:{user_id})
- [x] 2.10 Audit log entries for job_failure on any job error

### Phase 3 — Peer Phish
- [x] 3.01 Document sending domain setup (SPF/DKIM/DMARC for mail.defenddaily.com)
- [x] 3.02 Build phishSimulator.ts (Nodemailer + tracking pixel + redirect URL injection)
- [x] 3.03 Build GET /track/open/:token (1×1 pixel, always 200, rate-limited)
- [x] 3.04 Build GET /track/click/:token (record click, redirect, always 200)
- [ ] 3.05 Seed 10 phish templates (fake_invoice, mfa_request, hr_update, package_delivery, etc.)
- [ ] 3.06 Build /phish-a-friend Slack modal (template browser + opt-in target dropdown)
- [ ] 3.07 Implement pre-send assertions (is_peer_phish_target, peer_phish_enabled, audit_log entry)
- [ ] 3.08 Build TOS acknowledgment modal (log with timestamp + user_id)
- [ ] 3.09 Implement /report-phish command (Defense Points, check campaign token match)
- [ ] 3.10 Build twilio.ts smishing service (explicit consent check before send)
- [x] 3.11 Add rate limiting to all webhook endpoints (express-rate-limit)
- [ ] 3.12 Write Phase 3 integration tests (msw mocks for Nodemailer, Twilio)

### Phase 4 — CISO Dashboard
- [ ] 4.01 Initialize apps/dashboard (Next.js 14 App Router + Tailwind CSS)
- [ ] 4.02 Configure NextAuth.js (magic link + Google OAuth + Microsoft OAuth)
- [ ] 4.03 Build packages/shared-types (TypeScript interfaces for all DB models)
- [ ] 4.04 Build dashboard API client (fetch wrapper with auth headers)
- [ ] 4.05 Build RiskHeatmap.tsx (department grid, color-coded red/amber/green)
- [ ] 4.06 Build PhishTrendChart.tsx (Recharts line chart, 90-day click rate)
- [ ] 4.07 Build LeaderboardTable.tsx (top defenders + vulnerabilities list)
- [ ] 4.08 Build RiskScoreGauge.tsx (color-coded shield icon)
- [ ] 4.09 Build ComplianceExportButton.tsx (triggers PDF generation)
- [ ] 4.10 Build compliance PDF (@react-pdf/renderer: org, period, scores, phish results, attestation)
- [ ] 4.11 Build compliance.ts Express route (streams PDF, requires ciso/admin session)
- [ ] 4.12 Build /setup page (post-Slack-install org wizard: timezone + puzzle time)
- [ ] 4.13 Add CISO/admin role middleware to all dashboard API routes
- [ ] 4.14 Build Risk Heatmap PNG export endpoint (for board presentations)
- [ ] 4.15 Write Phase 4 smoke tests (route accessibility, PDF generation)

### Phase 5 — SentryLife & Family Mode
- [ ] 5.01 Add family invite token generation + accept flow (family_group_id linking)
- [ ] 5.02 Build SentryLife Tailwind theme (separate color palette, /sentrylife route group)
- [ ] 5.03 Build /sentrylife/family/page.tsx (family leaderboard + linked accounts)
- [ ] 5.04 Build /sentrylife/home-defense/page.tsx (canary kit download)
- [ ] 5.05 Build Guardian Alert nightly BullMQ job (check family scores, send Slack DM)
- [ ] 5.06 Build canary.ts service (Canarytokens.org API — Word, PDF, Excel, PNG, .url)
- [ ] 5.07 Build canary token zip generation (archiver, deliver download link)
- [ ] 5.08 Build canary webhook callback (webhooks.ts — log triggered_at, alert owner)
- [ ] 5.09 Build breach monitor weekly email (SendGrid: HIBP summary for all family emails)
- [ ] 5.10 Store canary_tokens in DB, link to user
- [ ] 5.11 Update breach_records for family accounts (share HIBP job)
- [ ] 5.12 Write Phase 5 integration tests (Guardian Alert logic, canary token creation)

### Phase 6 — Enterprise & IdP Automation
- [ ] 6.01 Build okta.ts service (Okta Management API: assign/remove MFA enforcement group)
- [ ] 6.02 Implement Okta risk-triggered BullMQ job (score < 40 → assign group; score > 60 → remove)
- [ ] 6.03 Build azure-ad.ts service (Microsoft Graph API: Conditional Access policy mutation)
- [ ] 6.04 Implement Azure risk-triggered job (mirror Okta logic for Azure tenants)
- [ ] 6.05 Add SSO SAML/OIDC to NextAuth (enterprise provider config, org-level IdP mapping)
- [ ] 6.06 Build MSP partner portal layout (multi-org management, white-label header)
- [ ] 6.07 Build multi-org overview dashboard (aggregate stats across managed orgs)
- [ ] 6.08 Build white-label compliance PDF (org logo injection via S3 URL)
- [ ] 6.09 Implement reseller billing webhook (Stripe: partner margin calculation)
- [ ] 6.10 Write Phase 6 integration tests (msw mocks for Okta + Graph APIs)
