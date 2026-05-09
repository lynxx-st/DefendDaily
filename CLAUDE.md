# Session Continuation Protocol
> **READ THIS FIRST IN EVERY SESSION**

## When the user types "continue"
1. Read `docs/PROGRESS.md`
2. Find the first unchecked step (`- [ ]`) in the Step-Level Checklist
3. Read the corresponding detail file in `docs/phase-X-*/` for that step
4. If the step involves any UI — dashboard pages, Slack Block Kit messages, Next.js components, or any user-facing surface — **read `DESIGN.md` before writing a single line of UI code**
5. Implement the step completely (write all code, run all commands shown in the doc)
6. Check off the step in `docs/PROGRESS.md` (`- [ ]` → `- [x]`)
7. Update the "Last Completed" section in `docs/PROGRESS.md`
8. If the phase is now fully complete, check off the phase in "Overall Phase Status"
9. Commit `docs/PROGRESS.md` with: `chore(progress): complete step X.XX — <description>`
10. Tell the user: "Step X.XX complete. Ready for X.XX+1?"

## When starting a fresh session (no explicit "continue")
- Read `docs/PROGRESS.md` and show a one-line progress summary
- Ask: "Continue from step X.XX?" or "Start a different task?"

## File locations
- **Progress tracker:** `docs/PROGRESS.md` — source of truth for what's done
- **Phase detail files:** `docs/phase-1-bot-mvp/` through `docs/phase-6-enterprise/`
- **Each numbered .md file** contains full code, exact commands, and commit messages
- **Design system:** `DESIGN.md` — authoritative source for all colors, typography, spacing, and components

---

# UI/UX Standards
> **MANDATORY for every user-facing surface — dashboard, bot messages, landing pages.**

## Design system source of truth
All UI work **must** reference `DESIGN.md` before writing code. Never inline raw hex values or ad-hoc font sizes — always map to design tokens:

- Colors → `{colors.*}` (e.g. `{colors.primary}` = `#0007cd`, `{colors.canvas}` = `#0f0f0f`)
- Typography → `{typography.*}` (e.g. `{typography.display-mega}` = 72px / weight 500)
- Spacing → `{spacing.*}` (e.g. `{spacing.section}` = 96px between major bands)
- Border radius → `{rounded.*}` (e.g. `{rounded.md}` = 8px for CTAs, `{rounded.xl}` = 16px for cards)
- Components → `{components.*}` (e.g. `{components.feature-card}`, `{components.terminal-pane}`)

## Visual identity rules
- **Canvas:** near-black `{colors.canvas}` (#0f0f0f) top to bottom — no light-mode surfaces
- **Single accent:** `{colors.primary}` (#0007cd) for primary CTAs, wordmark, spotlight glows only — never overuse
- **Typography family:** `abcDiatype` (fallback: Inter) for all text; JetBrains Mono for every code/terminal surface
- **Display weight:** always 500 — never 400 on headlines, never 700
- **Elevation:** brightness-step ladder only (`{colors.surface-card}` → `{colors.surface-card-elevated}`) — no drop shadows
- **CTA geometry:** `{rounded.md}` (8px) — never full pills on buttons
- **Hero signature:** every hero band gets a centered radial blue spotlight glow using `{colors.primary-glow}`
- **Section rhythm:** 96px (`{spacing.section}`) between major page bands; 24px between cards

## Component checklist (for any new UI)
Before shipping any new page or component, verify:
- [ ] All color values reference `{colors.*}` tokens — no raw hex
- [ ] Font family is abcDiatype / Inter; code surfaces use JetBrains Mono
- [ ] Primary CTA uses `{components.button-primary}` spec exactly (40px height, 8px radius, `{colors.primary}` bg)
- [ ] Cards use `{components.feature-card}` or `{components.toolkit-card}` — not custom padding/radius
- [ ] Any hero section has the radial spotlight glow backdrop
- [ ] Terminal/code mockups use `{components.terminal-mockup-grid}` (2×2 grid, canvas-deep bg)
- [ ] Responsive: hero h1 scales 72→56→36px across desktop→tablet→mobile
- [ ] Touch targets ≥ 40px height (WCAG AA)

## Slack Block Kit UI rules
Block Kit messages are also UI — apply the same craft:
- Use `mrkdwn` sparingly; lead with a bold headline and a single clear CTA button
- Button colors: `primary` style for the correct-answer action; `danger` style only for destructive confirms
- Every interactive message must include `fallback_text` for notification previews
- Expired puzzles return a graceful "This puzzle has expired. Your next one arrives tomorrow!" message — never an error
- Leaderboard messages use emoji rank medals (🥇🥈🥉) and monospace alignment for scores

---

# DefendDaily & SentryLife — Project Master Brief
> Place this file in the root of an empty directory, then run `claude` to begin.

---

## 1. Executive Vision

**DefendDaily** is a B2B SaaS "Human Risk Management" platform that replaces stale annual security training with a **60-second daily micro-challenge** delivered directly inside Slack or Microsoft Teams. The core insight: 95% of breaches involve human error, yet the dominant training format (annual click-through videos) produces near-zero behavioral change.

**SentryLife** is the consumer/family-tier perk that companies offer employees as a retention benefit — think "bring your own household" security coverage. It extends the platform's reach without a separate sales motion.

**Business thesis:** Land with the CISO on a per-seat B2B subscription. Expand by (a) converting employees into SentryLife family subscribers and (b) upselling CISOs to premium tiers (phishing simulation orchestration, compliance exports, IdP policy automation). This creates two compounding revenue streams from a single acquisition event.

---

## 2. Market Context & Opportunity

The global security awareness training market is a confirmed high-growth segment:

- **Market size:** ~$5.6B in 2023, forecast to exceed **$10B annually by 2027** (Cybersecurity Ventures, 15% YoY CAGR). The broader cybersecurity training market, including technical certifications, is projected to reach **$19–40B by 2035** depending on scope.
- **Human error** is the root cause of 95%+ of breaches, yet 36% of CISOs are cutting training budgets to fund tools — creating an opening for a platform that proves ROI through measurable behavioral metrics rather than completion rates.
- **Gamified security awareness** is the fastest-growing sub-segment at 8.8% CAGR, precisely the format DefendDaily occupies.
- **SME segment** (10–500 seats) is growing at 15.4% CAGR — faster than enterprise — because cyber insurance carriers now require demonstrated training programs as a coverage condition.
- **Competitive gap:** KnowBe4 (the market leader) charges $18–$30.50 per user per year and is perceived as heavy, compliance-oriented, and not native to Slack/Teams. DefendDaily's target price is **$6–$14/user/year** (B2B) with a daily-habit loop that KnowBe4 cannot easily replicate without a rebuild.

---

## 3. Revised Business Model (Feasibility-Adjusted)

The original plan has been refined in three areas: the Shadow Phish feature, the Gophish dependency, and the SentryLife monetization path.

### 3.1 Revenue Streams

**Stream 1 — B2B Seat Subscription (Primary)**

| Tier | Price | Includes |
|------|-------|----------|
| Starter | $6/user/year | Daily puzzles, Slack/Teams bot, basic reporting |
| Growth | $10/user/year | + Phishing simulation (built-in, no Gophish), CISO dashboard, Risk Score |
| Enterprise | $14/user/year | + Compliance PDF exports, Okta/Azure AD automation, SSO, SLA |

Minimum viable deal: 50-seat SME at Growth tier = **$500 ARR**. Target ICP: 50–2,000 seat companies in finance, healthcare, SaaS, and legal — all sectors with cyber insurance requirements.

**Stream 2 — SentryLife Consumer Add-On**

Employees opt in to extend coverage to family members. Pricing: **$4.99/month per family** (billed to the individual, not the employer). This creates direct B2C revenue that compounds with every corporate customer added. At 20% family conversion on a 1,000-seat company, that's 200 × $59.88 = **~$12K incremental ARR per corporate account** at zero additional sales cost.

**Stream 3 — Compliance & Insurance Reports (Upsell)**

One-click PDF compliance reports (SOC 2, HIPAA workforce training evidence, cyber insurance proof). Charged as an add-on at **$99/report** or included in Enterprise tier. Insurance brokers are a potential referral channel — they benefit from clients having documented training histories.

**Stream 4 — Channel / Reseller Margin**

Security-focused MSPs and IT consultancies resell DefendDaily to their SME books of business at a 20–30% margin. This is a capital-efficient growth lever that requires a partner portal and white-label reporting.

### 3.2 Unit Economics (Conservative Case)

- **CAC target:** $300 (inbound-led, PLG through free 14-day trial)
- **LTV at Growth tier, 200-seat customer:** $2,000/year × 3-year avg. retention = $6,000 LTV
- **LTV:CAC ratio:** 20:1 (very strong for SaaS — achievable because the Slack/Teams distribution channel is near-zero marginal cost)
- **Payback period:** < 2 months

---

## 4. Technical Architecture

### 4.1 Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| API Server | **Node.js + Express** | Best ecosystem for Slack/Teams SDKs; easier real-time webhooks |
| Database | **PostgreSQL** (primary) + **Redis** (leaderboards, sessions, caching) | Battle-tested; Redis sorted sets are perfect for live leaderboards |
| Bot — Slack | **Slack Bolt for Node.js** | Official, event-driven, supports modals and interactive components |
| Bot — Teams | **Bot Framework SDK v4 (Node.js)** | Official Microsoft SDK; Adaptive Cards for rich UI |
| Dashboard | **Next.js 14 (App Router)** | SSR for compliance reports; React for interactive CISO views |
| Auth | **NextAuth.js** with Google/Microsoft SSO + magic links | Enterprise SSO via SAML/OIDC in Enterprise tier |
| Background Jobs | **BullMQ** (Redis-backed) | Reliable daily cron, retry logic, priority queues |
| File Storage | **AWS S3** (or Cloudflare R2) | Compliance PDFs, canary documents, puzzle images |
| Hosting | **Railway.app** (early stage) → **AWS ECS/Fargate** (scale) | Railway for zero-ops MVP; migrate to ECS at $10K MRR |
| Observability | **Sentry** (errors) + **PostHog** (product analytics) | Both have generous free tiers |

### 4.2 External API Integrations

**HaveIBeenPwned API** — Real breach data lookup, used to populate the Real-World Risk component of the Human Risk Score. Rate-limited; results cached in Redis with a 24-hour TTL per email. Use the v3 enterprise API key for higher throughput.

**Twilio API** — Smishing (SMS phishing) simulations for Growth/Enterprise tiers. Requires careful compliance handling: users must explicitly opt in to receive simulated SMS attacks as part of their training plan. Store explicit consent with timestamp in the database.

**Canarytokens.org API** — Generate "honey token" files (Word docs, PDFs, URLs) that ping home if opened. Used in the SentryLife "Home Defense" feature and as an enterprise "Canary Document" generator. Canarytoken generation is free via their API; no key required for basic tokens.

**Gophish (REVISED):** Rather than depending on a self-hosted Gophish instance (which creates an infrastructure burden for each customer), **build phishing simulation natively** using Nodemailer + custom tracking pixels and redirect URLs. This is more controllable, reduces ops cost, and avoids requiring customers to run their own Gophish servers. Reserve Gophish integration as an optional "bring your own" advanced mode for security-mature Enterprise customers.

**Okta / Azure AD (Phase 4):** Use Okta's Management API and Microsoft Graph API to write policy changes when a user's Risk Score drops below threshold. This is the highest-value enterprise upsell — it closes the loop from "awareness training" to "actual access control."

---

## 5. Feature Modules (Detailed)

### Module A — The Daily Engine

A BullMQ repeatable job fires every day at 9:00 AM in each organization's configured timezone. The job:

1. Queries all active users for that org who have not yet received today's puzzle.
2. Selects a puzzle from the bank using a weighted algorithm: puzzles the user has never seen get priority; difficulty scales with the user's rolling accuracy over the past 30 puzzles.
3. Delivers an interactive Slack Block Kit message (or Teams Adaptive Card) to the user's DM.
4. Sets a 24-hour expiry in Redis — if no response, marks as `skipped` (which breaks the streak but does not count as incorrect).

**Puzzle types to implement (in priority order):**

- **Spot the Phish (Image):** A screenshot of a fake login page, email header, or URL bar with subtle red flags. User taps the correct anomaly from 3–4 options.
- **True/False Scenario:** "You receive a Teams message from 'IT Support' asking you to approve an MFA push you didn't request. What do you do?" Two-button response.
- **Context-Aware Scenario:** If the user's Slack status contains keywords like "OOO," "traveling," or "conference," trigger a travel-security scenario ("You're on hotel Wi-Fi…"). This feature requires the Slack Users API to read status.
- **Breach Alert Puzzle:** Once a week, if HaveIBeenPwned returns a new breach for the user's email domain, the puzzle is replaced with: "Your company's credentials appeared in the [X] breach. Which of these passwords should you change first?" This is the highest-engagement puzzle type.

**Scoring formula:**

```
Points = (BasePoints × DifficultyMultiplier × SpeedBonus) × StreakMultiplier

BasePoints: 100 (correct) | 0 (incorrect) | -10 (skipped)
DifficultyMultiplier: 1.0 (Easy) | 1.5 (Medium) | 2.0 (Hard)
SpeedBonus: 1.5 if answered < 30s | 1.2 if < 60s | 1.0 if > 60s
StreakMultiplier: 1 + (streak_days * 0.02), capped at 1.5
```

### Module B — Peer Phish (Formerly "Shadow Phish")

**Renamed to "Peer Phish" for marketing clarity and legal safety.** This feature allows employees to send pre-approved, sandboxed phishing simulations to opted-in coworkers. Key guardrails:

- Only users who have explicitly opted into the "Peer Phish" program can be targeted. The opt-in is presented during onboarding: "Join the Defender League — allow coworkers to test you."
- Templates are admin-approved only. Users select from a curated library; they cannot craft custom lures.
- Every simulated email contains an invisible tracking pixel and a redirect link through DefendDaily's own domain (e.g., `click.defenddaily.com/track/[token]`).
- If the target **clicks**: sender earns Attacker Points (shown on a separate "Top Phishers" leaderboard). The target immediately receives a non-judgmental teachable moment in Slack: "You clicked a simulated phishing link! Here's what gave it away…"
- If the target **reports** via the `/report-phish` bot command before clicking: target earns Defense Points (larger reward to encourage vigilance over gotcha culture).
- The CISO dashboard shows the Peer Phish click rate as a department-level metric — the primary sales demo hook.

**Legal note in the codebase:** Add a mandatory Terms of Service acknowledgment before any Peer Phish send. Log the acknowledgment with timestamp and user ID.

### Module C — Human Risk Score

Every user has a dynamic score `S` computed nightly:

```
S = clamp(
  ((Awareness * 0.4) + (Consistency * 0.3) - (RealWorldRisk * 0.3)),
  0, 100
)

Awareness     = rolling 30-day puzzle accuracy (0–100)
Consistency   = streak_score = min(current_streak / 30, 1) * 100
RealWorldRisk = min(breach_count * 15, 100)  // from HIBP
```

The score is displayed as a color-coded shield icon in the Slack bot's weekly summary message. CISOs see a heatmap of scores by department. This score is the primary metric for:

- Triggering escalated puzzle difficulty (Score < 60 → harder puzzles).
- Triggering the Okta/Azure AD policy change (Score < 40 → enforce hardware MFA).
- Generating the compliance report evidence summary.

### Module D — SentryLife (Family Mode)

Activated when an employee shares an invite link with a family member. The family member creates a SentryLife account (separate app, same backend, different UI skin). Features:

- **Guardian Alerts:** If a linked Senior or Child account's score drops below 50, or if they fail 3 puzzles in a row, the primary user (the employee) receives a Slack DM: "Your linked family member is struggling with tech-support scam scenarios. Their Risk Score dropped to 38 this week."
- **Family Leaderboard:** Friendly score comparison within the family unit — gamifies household security without shaming.
- **Home Defense Kit:** Generates a zip file containing 5 canary documents (Word, PDF, Excel, PNG, a `.url` shortcut) via the Canarytokens API. Instructions: "Place these in your Documents folder. If you ever get an alert that one was opened, your computer may be compromised."
- **Breach Monitor:** Weekly email summarizing any new HIBP breaches detected for linked family email addresses.

### Module E — CISO Dashboard (Next.js)

Routes: `/dashboard` (overview), `/team` (per-user Risk Scores), `/simulations` (phish campaign results), `/compliance` (export center), `/settings` (integrations, billing).

Key views:

- **Risk Heatmap:** Department grid showing average Risk Score. Color-coded red/amber/green. Exportable as PNG for board presentations.
- **Phish Click Rate Trend:** Line chart showing weekly Peer Phish click rates over 90 days — the "before and after" chart that sells renewals.
- **Top Defenders / Top Vulnerabilities:** Leaderboard of highest-scoring users and a list of users who need intervention (score < 40).
- **Compliance Export:** Generates a PDF with: org name, reporting period, total training interactions, average score, phishing simulation results, and a signed attestation block. Satisfies most cyber insurance questionnaire requirements.

---

## 6. Database Schema (Complete)

```sql
-- Organizations
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slack_team_id VARCHAR(100) UNIQUE,
  teams_tenant_id VARCHAR(100) UNIQUE,
  plan          VARCHAR(50) DEFAULT 'starter', -- starter, growth, enterprise
  timezone      VARCHAR(100) DEFAULT 'UTC',
  puzzle_time   TIME DEFAULT '09:00:00',
  peer_phish_enabled BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  display_name    VARCHAR(255),
  role            VARCHAR(50) DEFAULT 'employee', -- employee, ciso, admin, senior, child
  provider_id     VARCHAR(100),                   -- Slack/Teams user ID
  provider_type   VARCHAR(20),                    -- slack | teams | web
  risk_score      SMALLINT DEFAULT 75,
  streak          INT DEFAULT 0,
  longest_streak  INT DEFAULT 0,
  last_active_date DATE,
  family_group_id UUID,                           -- links family members
  is_peer_phish_target BOOLEAN DEFAULT false,
  hibp_last_checked TIMESTAMPTZ,
  breach_count    SMALLINT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- Puzzle bank
CREATE TABLE puzzles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             VARCHAR(50) NOT NULL, -- spot_the_phish | true_false | scenario | breach_alert
  difficulty       VARCHAR(20) DEFAULT 'medium', -- easy | medium | hard
  context_trigger  VARCHAR(50),                  -- travel | finance | new_hire | breach | NULL
  payload          JSONB NOT NULL,               -- full Slack Block Kit / Adaptive Card JSON
  correct_answer   VARCHAR(100) NOT NULL,
  explanation      TEXT NOT NULL,                -- shown after answer
  tags             TEXT[],
  active           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Daily deliveries
CREATE TABLE puzzle_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id       UUID REFERENCES puzzles(id),
  delivered_at    TIMESTAMPTZ DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  is_correct      BOOLEAN,
  response_time_ms INT,
  status          VARCHAR(20) DEFAULT 'pending', -- pending | correct | incorrect | skipped | expired
  points_earned   INT DEFAULT 0
);

-- Peer phish campaigns
CREATE TABLE phish_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       UUID REFERENCES users(id),
  target_id       UUID REFERENCES users(id),
  template_id     UUID,
  tracking_token  VARCHAR(64) UNIQUE NOT NULL,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  reported_at     TIMESTAMPTZ,
  outcome         VARCHAR(20) -- clicked | reported | ignored
);

-- Phish templates (admin-curated)
CREATE TABLE phish_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  subject     VARCHAR(500),
  body_html   TEXT NOT NULL,
  lure_type   VARCHAR(50), -- fake_invoice | mfa_request | hr_update | package_delivery
  difficulty  VARCHAR(20) DEFAULT 'medium',
  active      BOOLEAN DEFAULT true
);

-- Risk score history (for trend charts)
CREATE TABLE risk_score_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  score       SMALLINT NOT NULL,
  recorded_at DATE DEFAULT CURRENT_DATE
);

-- Breach records
CREATE TABLE breach_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  breach_name VARCHAR(255) NOT NULL,
  breach_date DATE,
  data_classes TEXT[],
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Canary tokens
CREATE TABLE canary_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  token_id      VARCHAR(100) UNIQUE NOT NULL, -- Canarytokens.org ID
  file_type     VARCHAR(50),
  description   VARCHAR(255),
  triggered_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (for compliance exports)
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  org_id      UUID,
  user_id     UUID,
  action      VARCHAR(100) NOT NULL,
  metadata    JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_puzzle_deliveries_user_id ON puzzle_deliveries(user_id);
CREATE INDEX idx_puzzle_deliveries_delivered_at ON puzzle_deliveries(delivered_at);
CREATE INDEX idx_phish_campaigns_target_id ON phish_campaigns(target_id);
CREATE INDEX idx_risk_score_history_user_date ON risk_score_history(user_id, recorded_at);
CREATE INDEX idx_audit_log_org_id ON audit_log(org_id, occurred_at);
```

Redis key conventions:
- `leaderboard:{org_id}` — Sorted Set, score = total points, member = user_id
- `streak:{user_id}` — String, integer streak count (source of truth synced to Postgres nightly)
- `hibp:{email_hash}` — String, JSON breach summary, TTL 86400s
- `puzzle:today:{org_id}:{user_id}` — String, puzzle_id, TTL 86400s (prevents double-delivery)
- `session:{token}` — Hash, user session data, TTL 3600s

---

## 7. Project File Structure

```
defenddaily/
├── CLAUDE.md                    ← this file
├── .env.example
├── package.json                 ← root workspace (pnpm monorepo)
├── pnpm-workspace.yaml
│
├── apps/
│   ├── api/                     ← Express API server
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config/
│   │   │   │   └── env.ts
│   │   │   ├── db/
│   │   │   │   ├── client.ts    ← pg Pool setup
│   │   │   │   ├── redis.ts     ← ioredis setup
│   │   │   │   └── migrations/  ← SQL migration files
│   │   │   ├── bots/
│   │   │   │   ├── slack/
│   │   │   │   │   ├── app.ts       ← Bolt App init
│   │   │   │   │   ├── commands/    ← /defend, /risk, /report-phish
│   │   │   │   │   ├── actions/     ← button click handlers
│   │   │   │   │   └── messages/    ← Block Kit builders
│   │   │   │   └── teams/
│   │   │   │       ├── adapter.ts   ← Bot Framework adapter
│   │   │   │       ├── bot.ts
│   │   │   │       └── cards/       ← Adaptive Card JSON builders
│   │   │   ├── jobs/
│   │   │   │   ├── queue.ts         ← BullMQ setup
│   │   │   │   ├── dailyPuzzle.ts   ← main cron worker
│   │   │   │   ├── riskScore.ts     ← nightly score recalc
│   │   │   │   └── hibpCheck.ts     ← weekly breach scan
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── webhooks.ts      ← phish tracking pixel, canary callbacks
│   │   │   │   ├── orgs.ts
│   │   │   │   ├── users.ts
│   │   │   │   └── compliance.ts    ← PDF generation endpoint
│   │   │   ├── services/
│   │   │   │   ├── puzzleEngine.ts
│   │   │   │   ├── phishSimulator.ts
│   │   │   │   ├── riskScorer.ts
│   │   │   │   ├── hibp.ts
│   │   │   │   ├── canary.ts
│   │   │   │   ├── twilio.ts
│   │   │   │   └── okta.ts
│   │   │   └── middleware/
│   │   │       ├── auth.ts
│   │   │       └── rateLimiter.ts
│   │   └── package.json
│   │
│   └── dashboard/               ← Next.js 14 CISO & SentryLife dashboard
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── setup/page.tsx   ← post-Slack-install org setup
│       │   ├── (ciso)/
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── team/page.tsx
│       │   │   ├── simulations/page.tsx
│       │   │   └── compliance/page.tsx
│       │   └── (sentrylife)/
│       │       ├── family/page.tsx
│       │       └── home-defense/page.tsx
│       ├── components/
│       │   ├── RiskHeatmap.tsx
│       │   ├── PhishTrendChart.tsx
│       │   ├── LeaderboardTable.tsx
│       │   ├── RiskScoreGauge.tsx
│       │   └── ComplianceExportButton.tsx
│       └── package.json
│
├── packages/
│   ├── shared-types/            ← TypeScript interfaces shared across apps
│   └── puzzle-bank/             ← Static puzzle content (JSON files)
│       ├── spot-the-phish/
│       ├── true-false/
│       └── scenarios/
│
└── infra/
    ├── docker-compose.yml       ← local dev (Postgres + Redis)
    └── railway.toml             ← Railway deployment config
```

---

## 8. Implementation Roadmap

### Phase 1 — Bot MVP (Weeks 1–4)

Goal: A working Slack bot that delivers daily puzzles, tracks answers, and shows a leaderboard. This is the demo you show to your first 5 paying customers.

Tasks:
1. Initialize pnpm monorepo. Set up `apps/api` with Express + TypeScript + ts-node-dev.
2. Spin up local Postgres + Redis via `docker-compose.yml`.
3. Run schema migrations (use `node-postgres` with raw SQL migrations, no ORM — keeps it simple and fast).
4. Initialize Slack Bolt app. Handle OAuth install flow so organizations can add the bot from the Slack App Directory.
5. Implement `/defend` slash command: delivers a random puzzle to the caller immediately (for demo/testing).
6. Build Block Kit builders for each puzzle type. Interactive components must use `action_id` values that route to the correct handler.
7. Implement the answer handler: marks correct/incorrect in `puzzle_deliveries`, updates streak in Redis, posts a reply with the explanation.
8. Create BullMQ repeatable job for 9 AM delivery. Job reads all active org users, filters for today's timezone window, and sends puzzles.
9. Seed the `puzzles` table with at least 30 puzzles across all types and difficulty levels.
10. Build a minimal `/leaderboard` command that returns a formatted Slack message with the top 10 users by weekly points.

**Exit criteria:** A real Slack workspace can install the bot, receive daily puzzles, answer them interactively, and see a leaderboard.

### Phase 2 — Risk Score & HaveIBeenPwned (Weeks 5–6)

Tasks:
1. Build `riskScorer.ts` service implementing the score formula.
2. Create BullMQ job `hibpCheck.ts` that runs weekly, calls HIBP v3 API for each user's email, stores results in `breach_records`, and increments `breach_count`.
3. Add nightly `riskScore.ts` job that recalculates every user's score and writes to `risk_score_history`.
4. Add `/risk` slash command: sends the user their current Risk Score as a Slack message with a color-coded emoji shield.
5. Weekly summary message: every Monday, send each user their score, streak, and a 1-sentence tip.

### Phase 3 — Peer Phish (Weeks 7–9)

Tasks:
1. Build `phishSimulator.ts` using Nodemailer with a dedicated sending domain (e.g., `mail.defenddaily.com`) authenticated with SPF, DKIM, and DMARC.
2. Create phish templates table and seed 10 initial templates.
3. Build Slack modal (triggered by `/phish-a-friend`) that lets users browse templates and select a target from an opt-in dropdown.
4. Implement tracking: `webhooks.ts` handles `GET /track/open/{token}` (1x1 pixel) and `GET /track/click/{token}` (redirect + record click). Both update `phish_campaigns`.
5. Implement `/report-phish` command: user pastes a suspicious link or forwarded message. Bot checks if it matches an active campaign token. Awards Defense Points if correct.
6. Build Twilio SMS simulation path: optional flow where an admin can send a smishing text to opted-in users. Requires explicit user consent stored in DB.

### Phase 4 — CISO Dashboard (Weeks 10–13)

Tasks:
1. Initialize `apps/dashboard` with Next.js 14, Tailwind CSS, NextAuth.js.
2. Implement magic link + Google/Microsoft OAuth login. Route CISOs to their org dashboard automatically based on email domain.
3. Build the Risk Heatmap: fetch org users + scores from API, render a CSS grid color-coded by score bucket.
4. Build the Phish Trend Chart using Recharts (line chart of weekly click rates).
5. Build the Leaderboard Table (top defenders, most improved).
6. Build the Compliance Export: server action that queries audit logs + puzzle stats + phish results, generates a PDF via `@react-pdf/renderer`, and streams it to the client.
7. Implement the Slack App Directory listing setup wizard: post-install OAuth callback → collect org timezone + puzzle time → redirect to dashboard.

### Phase 5 — SentryLife & Family Mode (Weeks 14–16)

Tasks:
1. Add `family_group_id` linkage logic. Generate shareable invite tokens.
2. Build SentryLife dashboard pages (separate `/sentrylife` route group in Next.js, different UI theme).
3. Implement Guardian Alert job: runs nightly, checks family member scores, sends Slack DM to primary user if threshold crossed.
4. Implement Canary Token generation: call Canarytokens.org API, store token metadata, package into a zip via `archiver`, deliver download link.
5. Build family breach monitor: weekly email via SendGrid summarizing new HIBP results for all linked emails.

### Phase 6 — IdP Automation & Enterprise (Weeks 17–20)

Tasks:
1. Build Okta integration: use Okta Management API to assign an MFA enforcement policy group when a user's score drops below 40. Reverse the policy when score recovers above 60.
2. Build Microsoft Azure AD integration: use Microsoft Graph API to write Conditional Access policy exceptions (require compliant device / strong auth) for flagged users.
3. Add SSO (SAML/OIDC) support to the dashboard via NextAuth.js enterprise providers.
4. Build MSP partner portal: white-labeled reporting, multi-org management view, reseller billing integration.

---

## 9. Environment Variables

```bash
# .env.example

# Server
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/defenddaily
REDIS_URL=redis://localhost:6379

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# Microsoft Teams
TEAMS_APP_ID=...
TEAMS_APP_PASSWORD=...

# HaveIBeenPwned
HIBP_API_KEY=...

# Twilio (Smishing simulations)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# Email (Phish simulation sending domain)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
PHISH_FROM_DOMAIN=mail.defenddaily.com

# Canarytokens
# No API key required for basic tokens; use their webhook callback URL:
CANARY_WEBHOOK_BASE=https://api.defenddaily.com/webhooks/canary

# Tracking
TRACKING_BASE_URL=https://click.defenddaily.com

# Auth (Dashboard)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Okta (Enterprise)
OKTA_DOMAIN=...
OKTA_API_TOKEN=...
OKTA_RISK_POLICY_GROUP_ID=...

# SendGrid (Transactional email)
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=alerts@defenddaily.com

# AWS S3 / Cloudflare R2 (File storage)
S3_BUCKET=...
S3_REGION=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

---

## 10. Key Development Rules for Claude Code

### No AI Slop — Zero Tolerance
- **No filler code.** Every line written must be load-bearing. If a function, comment, type, or import is not directly required by the current step, do not add it.
- **No placeholder comments.** Never write `// TODO: implement this`, `// handle errors here`, `// add validation`. Either implement it or leave the space empty.
- **No boilerplate padding.** No `console.log('Server started')` banners, no `// ============` dividers, no JSDoc that restates the function name.
- **No defensive over-engineering.** Don't add retry logic, fallback branches, or abstraction layers for scenarios that don't exist in the current step. Build what the step requires; nothing more.
- **No vague variable names.** `data`, `result`, `temp`, `item`, `obj` are banned. Name things by what they actually are: `delivery`, `orgUser`, `breachCount`.
- **No redundant type annotations.** If TypeScript infers the type correctly, don't annotate it again. Only annotate when inference is wrong or the type is a public API surface.
- **Comments only for non-obvious WHY.** A hidden invariant, a Slack API quirk, a workaround for a known library bug. Never explain what the code does — the code does that.

**Code style:** TypeScript throughout. Use `zod` for all runtime validation of API inputs and environment variables. No `any` types.

**Error handling:** All async functions use try/catch. All job failures must log to the `audit_log` table with action `job_failure` and the error message in metadata. Never silently swallow errors.

**Bot message design:** Every Slack/Teams message must have a `fallback_text` for accessibility and notification previews. All interactive messages must expire gracefully if the user responds after 24 hours (check delivery timestamp, return a friendly "This puzzle has expired. Your next one arrives tomorrow!").

**Data privacy:** Never log raw email addresses to stdout in production. Hash email addresses before using them as Redis keys. The HIBP lookup must use the k-anonymity API (send only the first 5 chars of the SHA-1 hash of the password, or the full email for the email endpoint — check HIBP docs for the correct endpoint type).

**Phishing simulation ethics:** The `phish_campaigns` table is the legal record. Before any phishing send (peer or admin-initiated), assert that: (a) the target has `is_peer_phish_target = true`, (b) the org has `peer_phish_enabled = true`, and (c) there is a corresponding `audit_log` entry for the send. If any assertion fails, throw and do not send.

**Testing:** Write integration tests for the scoring formula and the puzzle delivery job using `vitest`. Mock external APIs (HIBP, Twilio, Canarytokens) with `msw` (Mock Service Worker). Aim for 80% coverage on `services/` directory.

**Database migrations:** Use plain numbered SQL files (`001_init.sql`, `002_add_canary_tokens.sql`, etc.) run by a simple migration runner script. No ORM. Query the database directly with parameterized queries via `node-postgres`.

**Security:** All webhook endpoints verify request signatures (Slack signing secret, Teams HMAC). The compliance PDF endpoint requires a valid session with role `ciso` or `admin`. The phish tracking endpoints must be rate-limited and must not reveal whether a token is valid in their HTTP response (return 200 with a pixel regardless).

---

## 13. Production Engineering Standards

### TypeScript Configuration
- `tsconfig.base.json` must enable all three: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`
- `noUncheckedIndexedAccess` is the one most codebases skip — it makes `array[n]` typed as `T | undefined` instead of `T`, catching crashes like `puzzles[0].id` when the array is empty
- `exactOptionalPropertyTypes` prevents `{ foo: undefined }` from satisfying `{ foo?: string }`, which matters for Zod schema output passed into `pool.query()` params

### API Error Envelope
Every Express route handler returns the same shape on error:
```ts
res.status(code).json({ error: string, code: string, requestId: string })
```
`requestId` is generated per-request in middleware via `crypto.randomUUID()`, stored on `res.locals.requestId`, and included in every `pino` log line for that request. Never return raw Postgres error messages — they leak table names and column names.

### Express Setup Rules
- Mount `express.json({ limit: '100kb' })` — without a limit, a crafted Slack payload retried by BullMQ can exhaust the process heap
- `GET /health` must return `{ status: 'ok', db: boolean, redis: boolean }` within 500ms by running `SELECT 1` on the pool and `redis.ping()` — Railway and ECS use this for container replacement decisions
- CORS: set `origin: env.CORS_ORIGIN` explicitly — do not use `origin: '*'` even in development

### List Endpoints
All list endpoints (`/users`, `/puzzle_deliveries`, etc.) must accept `limit` (max 100, default 20) and `cursor` (a `TIMESTAMPTZ` value from the last row's `created_at`). Use keyset pagination (`WHERE created_at < $cursor ORDER BY created_at DESC`) not offset — offset pagination returns duplicate or missing rows when concurrent inserts happen during pagination.

### PostgreSQL Connection Rules
- Pool config: `new Pool({ max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 })` in dev; raise `max` to 20 in production
- Multi-statement transactions must use `const client = await pool.connect()` in a `try/finally` block with `client.release()` in `finally` — never use `pool.query()` for transactions because it may route statements to different connections
- Migration runner must maintain a `schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())` table. Check it before running each file; this makes re-running the runner a no-op on already-applied migrations
- Validate all UUID route params with `z.string().uuid()` before the query. A malformed UUID doesn't cause SQL injection but does generate a Postgres error that leaks internal state in the error message

### Redis (ioredis) Rules
- Client config: `{ enableReadyCheck: true, maxRetriesPerRequest: 3, retryStrategy: (times) => Math.min(times * 100, 3_000) }`
- Leaderboard writes: `ZADD leaderboard:{org_id} GT {score} {user_id}` — the `GT` flag only updates if the new score is higher, so out-of-order job completions can't overwrite a better score with a stale one
- Never store email addresses, display names, or any PII in Redis values. Store `user_id` only; join to Postgres at read time
- Shutdown: call `await redis.quit()`, not `redis.disconnect()`. `quit()` sends the Redis `QUIT` command and waits for the acknowledgment; `disconnect()` drops the TCP socket immediately and loses any queued commands

### BullMQ Job Rules
- `dailyPuzzle` worker: set `concurrency: 5` — processing 500 users serially at ~200ms per Slack API call = 100 seconds per org, which exceeds BullMQ's default stall detection interval
- All queues must use: `defaultJobOptions: { removeOnComplete: { count: 100 }, removeOnFail: { count: 500 }, attempts: 3, backoff: { type: 'exponential', delay: 5_000 } }` — without `removeOnComplete`, Redis memory grows unboundedly
- Every `Worker` constructor must include `{ timeout: 30_000 }` — a hung Slack API call will otherwise lock the worker slot indefinitely
- Graceful shutdown: listen for `SIGTERM`, call `await worker.close()`, then exit. BullMQ needs to finish the current job and release its distributed lock before the process dies

### Structured Logging with pino
Replace all `console.log` / `console.error` with `pino`:
```ts
import pino from 'pino'
export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
})
```
Fields to **never** log: `email`, `password`, `token`, `signing_secret`, `hibp_api_key`, any Slack bot token, SMTP credentials. Use `userId` as the identifier instead of email in all log lines.

Log levels:
- `info`: job start/completion with duration ms, Slack command received (command name only, no payload), DB migration applied
- `warn`: rate limit hit, HIBP Redis cache miss, puzzle delivery skipped (no channel found)
- `error`: job failure (also written to `audit_log`), DB connection failure, unhandled promise rejection

### Graceful Shutdown Order
In `apps/api/src/index.ts`, `SIGTERM` handler must execute in this order — Railway sends SIGTERM 30 seconds before SIGKILL:
```
1. server.close()               // stop accepting new HTTP connections
2. await worker.close()         // finish current BullMQ jobs, release locks
3. await redis.quit()           // drain queued Redis commands
4. await pool.end()             // close Postgres connections
5. process.exit(0)
```

### Next.js Dashboard Rules
- Default to React Server Components. Add `'use client'` only for: DOM event handlers, browser-only APIs, or `useState`/`useEffect`. Recharts (`PhishTrendChart`) is a client component; wrap it in a Server Component that fetches data and passes it as props
- Dashboard data: `fetch('/api/...', { next: { revalidate: 60 } })` — 60-second ISR. Do not use `cache: 'no-store'` on every request; it generates a server round-trip on every pageview
- Every page segment that fetches data must have a sibling `loading.tsx` — Next.js won't stream the shell without it, and the user sees a blank page during fetch
- Set these headers in `next.config.js` via the `headers()` async function: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. Hold on CSP until Phase 4 is complete — Recharts uses inline styles that will break a strict CSP
- Never import from `apps/api/src/` inside dashboard components. The boundary is HTTP. Dashboard calls the Express API; shared TypeScript types come from `packages/shared-types` only

### Tailwind CSS Rules
- In `tailwind.config.ts`, all design token colors go under `theme.extend.colors` — do not replace `theme.colors` (that removes Tailwind's built-in palette, breaking `prose`, ring utilities, etc.)
- Never use arbitrary value syntax (`bg-[#0007cd]`, `text-[14px]`) in component files. Define named tokens in config and use them (`bg-primary`, `text-body`). Arbitrary values bypass the design system and can't be audited or refactored
- `content` array must include `'./app/**/*.{ts,tsx}'` and `'./components/**/*.{ts,tsx}'` — a missing path means those files' utility classes are stripped in the production build

### Environment Validation at Startup
`apps/api/src/config/env.ts` must call `envSchema.parse(process.env)` synchronously at module load, before any server code executes:
```ts
const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('Invalid environment:', result.error.flatten().fieldErrors)
  process.exit(1)
}
export const env = result.data
```
No other file in `apps/api/src/` may reference `process.env` directly — all access goes through the exported `env` object.

### Testing Rules
- Test database: set `DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/defenddaily_test` in the test environment. Never run tests against the dev DB — a truncate-in-afterEach will wipe real data
- msw: call `server.resetHandlers()` in `afterEach` — without this, a handler registered in one test bleeds into the next and causes false positives
- Time-dependent tests (streak calculation, puzzle expiry): use `vi.setSystemTime(new Date('2024-01-15'))` scoped inside the test block, paired with `vi.useRealTimers()` in `afterEach`
- DB fixture pattern: each test that needs rows must `INSERT` its own fixtures in `beforeEach` and `DELETE FROM table WHERE id = ANY($1)` in `afterEach` using the IDs it created. No global seed files that accumulate state across test runs

### Docker Compose (infra/docker-compose.yml)
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: defenddaily
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```
Without named volumes, `docker compose down` resets the DB. Without `--appendonly yes`, Redis loses all data on container restart. Without healthchecks, `docker compose up --wait` in CI exits before the DB is ready to accept connections.

### Git Rules
- `.gitignore` must include: `.env`, `.env.local`, `dist/`, `.next/`, `node_modules/`, `*.pdf`, `*.zip`, `infra/postgres-data/`, `infra/redis-data/`
- Commit convention: `type(scope): description` — type ∈ `feat | fix | chore | test | docs | refactor`, scope ∈ `api | dashboard | shared-types | puzzle-bank | infra`
- ESLint: add `'no-console': 'error'` to `apps/api/.eslintrc` — pino is the logger; a stray `console.log` in a hot path can generate gigabytes of unstructured stdout in production

### Slack Signing Secret Verification Detail
The signature check must also verify the request timestamp is within 5 minutes of `Date.now()`:
```ts
const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300
if (parseInt(timestamp) < fiveMinutesAgo) {
  return res.status(403).json({ error: 'Request timestamp too old' })
}
```
Without this check, a captured valid Slack request can be replayed indefinitely — the HMAC alone doesn't prevent replay attacks.

---

## 11. Monetization Launch Strategy

**Month 1–2 (Pre-revenue):** Build Phase 1. Get 3 friendly beta companies (aim for 50–200 seats each) to install via a Slack App Directory private distribution link. Offer free access in exchange for weekly feedback calls. Use this to validate puzzle engagement rates (target: 60%+ daily response rate).

**Month 3 (First revenue):** Launch Growth tier at $10/user/year. Convert 2 of the 3 beta companies. First MRR target: $2,000.

**Month 4–6:** Submit to Slack App Directory (public listing) and Microsoft AppSource. These are effectively free distribution channels. Prioritize inbound SEO content: "phishing simulation for small business," "security awareness training Slack," "cyber insurance training requirements."

**Month 6+:** Launch MSP partner program. Target 5 MSP partners who each manage 20+ SME clients. Each MSP partner can generate $50K+ ARR at your pricing without any direct sales effort on your part.

**18-month ARR targets:**
- 6 months: $50K ARR (50 companies × avg 100 users × $10)
- 12 months: $200K ARR
- 18 months: $500K ARR (mix of SME direct + MSP channel)

At $500K ARR with 80% gross margins (SaaS API costs are low), the business is profitable and fundable at a $5–10M seed valuation if you choose to raise.

---

## 12. First Commands to Run

After placing this file in an empty directory, run the following to start building:

```bash
# 1. Initialize the monorepo
pnpm init
pnpm add -D typescript @types/node ts-node-dev

# 2. Create workspace structure
mkdir -p apps/api/src apps/dashboard packages/shared-types packages/puzzle-bank infra

# 3. Start local infrastructure
docker compose -f infra/docker-compose.yml up -d

# 4. Initialize the API app
cd apps/api && pnpm init && pnpm add express @slack/bolt bullmq ioredis pg zod nodemailer axios
pnpm add -D @types/express @types/pg @types/nodemailer vitest

# 5. Run the first migration
# (after creating infra/docker-compose.yml and apps/api/src/db/migrations/001_init.sql)
psql $DATABASE_URL -f apps/api/src/db/migrations/001_init.sql
```

When in doubt about implementation order, always build the data layer first, then the job logic, then the bot surface, then the dashboard. The puzzle delivery job is the core of the product — everything else is downstream of it working reliably.
