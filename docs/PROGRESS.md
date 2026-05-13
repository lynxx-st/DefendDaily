# DefendDaily — Session Progress Tracker

> **IMPORTANT FOR CLAUDE:** When the user types "continue", read this file first.
> Find the first unchecked step (`- [ ]`) across all phases and resume from there.
> After completing each step, check it off (`- [x]`) and update "Last Completed" below.
> Commit PROGRESS.md after every step so sessions are always resumable.

## Last Completed
- **Phase:** 5 — SentryLife & Family Mode
- **Step:** 6.08 — Skeleton components (Toast, Modal, Tooltip, DataTable, MobileNav, Skeleton)
- **File:** `apps/dashboard/src/components/ui/{Toast,Modal,Tooltip,DataTable,Skeleton}.tsx`, `apps/dashboard/src/components/app/MobileNav.tsx`
- **Date:** 2026-05-13

## Overall Phase Status
- [x] Phase 1: Bot MVP (19 steps)
- [x] Phase 2: Risk Score & HIBP (10 steps)
- [x] Phase 3: Peer Phish (12 steps)
- [x] Phase 4: CISO Dashboard (15 steps)
- [x] Phase 5: SentryLife & Family Mode (12 steps)
- [ ] Phase 6: UI/UX & Design System Overhaul (20 steps)
- [ ] Phase 7: Bot & Engagement Upgrades (22 steps)
- [ ] Phase 8: Question Quality & Content Intelligence (20 steps)
- [ ] Phase 9: Analytics, Gamification & Platform (24 steps)
- [ ] Phase 10: Enterprise & IdP Automation (10 steps)

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
- [x] 3.05 Seed 10 phish templates (fake_invoice, mfa_request, hr_update, package_delivery, etc.)
- [x] 3.06 Build /phish-a-friend Slack modal (template browser + opt-in target dropdown)
- [x] 3.07 Implement pre-send assertions (is_peer_phish_target, peer_phish_enabled, audit_log entry)
- [x] 3.08 Build TOS acknowledgment modal (log with timestamp + user_id)
- [x] 3.09 Implement /report-phish command (Defense Points, check campaign token match)
- [x] 3.10 Build smishing service (TextBelt — open source SMS gateway, explicit consent check before send)
- [x] 3.11 Add rate limiting to all webhook endpoints (express-rate-limit)
- [x] 3.12 Write Phase 3 integration tests (msw mocks for Nodemailer, TextBelt)

### Phase 4 — CISO Dashboard
- [x] 4.01 Initialize apps/dashboard (Next.js 14 App Router + Tailwind CSS)
- [x] 4.02 Configure NextAuth.js (Google + Microsoft OAuth wired; magic link deferred to 4.13 with auth-table schema)
- [x] 4.03 Build packages/shared-types (TypeScript interfaces for all DB models)
- [x] 4.04 Build dashboard API client (fetch wrapper with auth headers)
- [x] 4.05 Build RiskHeatmap.tsx (department grid, color-coded red/amber/green)
- [x] 4.06 Build PhishTrendChart.tsx (Recharts line chart, 90-day click rate)
- [x] 4.07 Build LeaderboardTable.tsx (top defenders + vulnerabilities list)
- [x] 4.08 Build RiskScoreGauge.tsx (color-coded shield icon)
- [x] 4.09 Build ComplianceExportButton.tsx (triggers PDF generation)
- [x] 4.10 Build compliance PDF (@react-pdf/renderer: org, period, scores, phish results, attestation)
- [x] 4.11 Build compliance.ts Express route (streams PDF; ciso/admin role gate deferred to 4.13)
- [x] 4.12 Build /setup page (post-Slack-install org wizard: timezone + puzzle time)
- [x] 4.13 Add CISO/admin role middleware to all dashboard API routes (HS256 Bearer JWT minted by dashboard, verified by api; requireAuth/requireRole/requireOrgMatch on /api/orgs/* and /api/compliance/*; new GET /api/users/by-email for the NextAuth session callback)
- [x] 4.14 Build Risk Heatmap PNG export endpoint (next/og ImageResponse at /api/heatmap/[orgId]/png; auth-gated; "Download Heatmap PNG" link on the dashboard)
- [x] 4.15 Write Phase 4 smoke tests (compliancePdf.test.ts + apiAuth.test.ts; vitest.config.ts now excludes dist/)

### Phase 5 — SentryLife & Family Mode
- [x] 5.01 Add family invite token generation + accept flow (family_group_id linking)
- [x] 5.02 Build SentryLife Tailwind theme (separate color palette, /sentrylife route group)
- [x] 5.03 Build /sentrylife/family/page.tsx (family leaderboard + linked accounts)
- [x] 5.04 Build /sentrylife/home-defense/page.tsx (canary kit download)
- [x] 5.05 Build Guardian Alert nightly BullMQ job (check family scores, send Slack DM)
- [x] 5.06 Build canary.ts service (Canarytokens.org API — Word, PDF, Excel, PNG, .url)
- [x] 5.07 Build canary token zip generation (archiver, deliver download link)
- [x] 5.08 Build canary webhook callback (webhooks.ts — log triggered_at, alert owner)
- [x] 5.09 Build breach monitor weekly email (SendGrid: HIBP summary for all family emails)
- [x] 5.10 Store canary_tokens in DB, link to user
- [x] 5.11 Update breach_records for family accounts (share HIBP job)
- [x] 5.12 Write Phase 5 integration tests (Guardian Alert logic, canary token creation)

### Phase 6 — UI/UX & Design System Overhaul
- [x] 6.01 Full marketing homepage (hero + terminal mockup + spotlight glow)
- [x] 6.02 Pricing band + CTA spotlight + dark footer
- [x] 6.03 Toast notification system (sonner)
- [x] 6.04 Modal component (Radix Dialog)
- [x] 6.05 Tooltip component (Radix Tooltip)
- [x] 6.06 DataTable component (sortable, filterable, keyset-paginated)
- [x] 6.07 Mobile hamburger nav + drawer
- [x] 6.08 Skeleton loading components
- [ ] 6.09 loading.tsx siblings for all dashboard page segments
- [ ] 6.10 error.tsx, 404, and 500 pages
- [ ] 6.11 Dashboard overview activity feed (last 10 org puzzle answers)
- [ ] 6.12 Team page redesign (user cards + inline risk gauges)
- [ ] 6.13 Animated CountUp stat numbers
- [ ] 6.14 Framer Motion page transitions + card hover lifts
- [ ] 6.15 Mobile responsive audit + fix all breakpoints
- [ ] 6.16 Accessible keyboard navigation audit (focus rings, skip-to-content)
- [ ] 6.17 Multi-step onboarding wizard with progress bar
- [ ] 6.18 Settings page redesign (tabs: General / Integrations / Billing / Notifications)
- [ ] 6.19 Risk score trend sparkline chart (7-day inline chart per user on team page)
- [ ] 6.20 Phase 6 visual regression tests

### Phase 7 — Bot & Engagement Upgrades
- [ ] 7.01 DB migration 008_achievements.sql (achievements + user_achievements tables)
- [ ] 7.02 Achievement trigger engine (post-answer hook, 15+ achievement definitions)
- [ ] 7.03 /achievements Slack command (badge grid DM)
- [ ] 7.04 Streak freeze tokens (earn on 7-day streak, /freeze command)
- [ ] 7.05 Monthly boss challenge job (org-wide hard puzzle, 2x points, Block Kit reveal)
- [ ] 7.06 Team vs team dept leaderboard (weekly dept score comparison)
- [ ] 7.07 /stats command (personal deep stats: accuracy by type, best streak, rank history)
- [ ] 7.08 /challenge @user command (head-to-head puzzle battle)
- [ ] 7.09 Smart re-DM reminder at 3 PM local for unanswered puzzles
- [ ] 7.10 Bot welcome onboarding flow (day 1 / day 3 / day 7 nurture DMs)
- [ ] 7.11 /admin-report command (CISO instant org summary)
- [ ] 7.12 /send-now admin command (trigger immediate puzzle delivery)
- [ ] 7.13 Boss challenge Block Kit UI (cinematic reveal, live countdown)
- [ ] 7.14 Microsoft Teams Adaptive Card puzzle delivery
- [ ] 7.15 Teams /defend, /risk, /leaderboard, /achievements commands
- [ ] 7.16 Weekly personal DM digest (score, streak, rank, tip of the week)
- [ ] 7.17 Interactive leaderboard with rank-change arrows (up/down N)
- [ ] 7.18 Puzzle type unlocks (new categories unlock at 30/60/90 correct)
- [ ] 7.19 Milestone celebration DMs (100 puzzles, first perfect week, 30-day streak)
- [ ] 7.20 Slack status context triggers (OOO → travel security puzzles)
- [ ] 7.21 Multi-language routing framework (EN/ES/FR/DE)
- [ ] 7.22 Phase 7 integration tests

### Phase 8 — Question Quality & Content Intelligence
- [ ] 8.01 Claude API integration for AI puzzle generation (claude-sonnet-4-6)
- [ ] 8.02 Puzzle quality scoring pipeline (auto-reject low quality)
- [ ] 8.03 Spaced repetition algorithm (Leitner box scheduler)
- [ ] 8.04 CISA KEV feed integration (weekly pull, industry-matched CVE puzzles)
- [ ] 8.05 Deepfake & AI social engineering puzzle category
- [ ] 8.06 Physical security puzzle category (tailgating, badge cloning)
- [ ] 8.07 Supply chain attack puzzle category (malicious packages, fake updates)
- [ ] 8.08 Elo-style puzzle difficulty calibration
- [ ] 8.09 A/B testing framework for puzzle variants
- [ ] 8.10 Puzzle engagement analytics (skip rate, time-to-answer heatmap)
- [ ] 8.11 AI-generated rich explanations (150-word, red-flag callouts)
- [ ] 8.12 Admin puzzle studio (create/edit/preview in dashboard)
- [ ] 8.13 Community puzzle submissions (/suggest-puzzle command + approval queue)
- [ ] 8.14 MITRE ATT&CK tag taxonomy (tag puzzles, show user weakness map)
- [ ] 8.15 Puzzle retirement system (auto-retire > 95% accuracy after 100 responses)
- [ ] 8.16 DeepL API translation pipeline (ES/FR/DE)
- [ ] 8.17 AI-assisted phishing screenshot generation for Spot the Phish puzzles
- [ ] 8.18 500+ puzzle bank expansion (AI-assisted, human-reviewed)
- [ ] 8.19 Puzzle effectiveness dashboard (admin view: accuracy, skip, engagement per puzzle)
- [ ] 8.20 Phase 8 tests (spaced repetition, Elo calibration, A/B determinism)

### Phase 9 — Analytics, Gamification & Platform
- [ ] 9.01 Cohort analysis dashboard (new hire vs 30/90-day vs veteran)
- [ ] 9.02 Behavioral change score (90-day before/after diff)
- [ ] 9.03 Department risk sparklines (7/30/90-day trend per dept)
- [ ] 9.04 ROI calculator page (breach cost avoided, insurance discount)
- [ ] 9.05 Campaign management (admin schedules themed training weeks)
- [ ] 9.06 Custom puzzle campaigns (assign sets to specific teams)
- [ ] 9.07 Stripe billing integration (checkout + subscription tiers)
- [ ] 9.08 Seat-based metered billing + Stripe webhook handlers
- [ ] 9.09 In-app upgrade flow (feature gates + upsell banners)
- [ ] 9.10 Customer success portal (health score, adoption, renewal)
- [ ] 9.11 Referral program (unique links, commission tracking)
- [ ] 9.12 Outbound webhook framework (retry, delivery log, event types)
- [ ] 9.13 Zapier integration (phish_click, streak_milestone, score_drop)
- [ ] 9.14 Public API v1 (JWT API keys, rate limiting 1000/hr)
- [ ] 9.15 OpenAPI 3.1 spec auto-generation
- [ ] 9.16 Developer documentation site (Mintlify)
- [ ] 9.17 Seasonal events (Security Awareness Month — 2x points)
- [ ] 9.18 Monthly Security Champion award (auto-nominate, Slack post)
- [ ] 9.19 Anonymous industry benchmark (percentile rank vs cohort)
- [ ] 9.20 White-label customization (org logo, colors, custom domain)
- [ ] 9.21 SCIM 2.0 provisioning endpoint (auto-create/deactivate users)
- [ ] 9.22 Advanced compliance reports (HIPAA, PCI-DSS, ISO 27001 mapping)
- [ ] 9.23 Audit trail export (SOC 2 Type II evidence package)
- [ ] 9.24 Phase 9 tests (billing, webhooks, API rate limiting)

### Phase 10 — Enterprise & IdP Automation
- [ ] 10.01 okta.ts service (assign/remove MFA enforcement group)
- [ ] 10.02 Okta risk-triggered BullMQ job (score < 40 → on; > 60 → off)
- [ ] 10.03 azure-ad.ts service (Microsoft Graph Conditional Access)
- [ ] 10.04 Azure risk-triggered job (mirror Okta logic)
- [ ] 10.05 SSO SAML/OIDC via NextAuth enterprise providers
- [ ] 10.06 Org-level IdP URL mapping (each org has its own SAML metadata URL)
- [ ] 10.07 MSP partner portal layout (multi-org management)
- [ ] 10.08 Multi-org overview dashboard + white-label compliance PDF
- [ ] 10.09 Stripe reseller billing webhook (partner margin calculation)
- [ ] 10.10 Phase 10 integration tests (msw mocks for Okta + Graph APIs)
