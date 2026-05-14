<div align="center">

# 🛡️ DefendDaily

### *60-Second Security Training. Every Day. In Slack.*

<br>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-FF4438?logo=redis&logoColor=white)](https://redis.io/)
[![Slack](https://img.shields.io/badge/Slack_Bolt-2-4A154B?logo=slack&logoColor=white)](https://slack.dev/bolt/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5-FE2D55?logo=bullmq&logoColor=white)](https://bullmq.io/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-5-000000?logo=auth0&logoColor=white)](https://next-auth.js.org/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<br>

[**Read the docs**](docs/) &nbsp;·&nbsp; [**View roadmap**](#implementation-roadmap) &nbsp;·&nbsp; [**Dashboard**](apps/dashboard/) &nbsp;·&nbsp; [**API**](apps/api/)

</div>

---

## 📋 Table of Contents

- [Executive Summary](#executive-summary)
- [The Problem & Market Opportunity](#the-problem--market-opportunity)
- [Key Features](#key-features)
- [Business Model & Pricing](#business-model--pricing)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Design System](#design-system)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Implementation Roadmap](#implementation-roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Executive Summary

**DefendDaily** is a B2B SaaS **Human Risk Management** platform that replaces stale annual security training with a **60-second daily micro-challenge** delivered directly inside Slack or Microsoft Teams.

The core insight: **95% of breaches involve human error**, yet the dominant training format — annual click-through videos — produces near-zero behavioral change. DefendDaily shifts the paradigm from *completion metrics* to *behavioral metrics* by building a daily security habit loop.

**SentryLife** extends the platform to employees' families as a consumer-tier perk — turning every B2B seat into a potential B2C revenue stream.

---

## The Problem & Market Opportunity

### Market Landscape

| Metric | Value |
|--------|-------|
| Security awareness training market (2023) | **$5.6B** |
| Forecast (2027) | **$10B+** (15% YoY CAGR) |
| Breaches caused by human error | **95%+** |
| CISOs cutting training budgets for tools | **36%** |
| Fastest-growing sub-segment | Gamified awareness (8.8% CAGR) |
| SME segment growth (10–500 seats) | **15.4% CAGR** |

### Competitive Gap

[KnowBe4](https://www.knowbe4.com/) (market leader) charges **$18–$30.50/user/year** and is perceived as heavy, compliance-oriented, and not native to Slack/Teams. DefendDaily targets **$6–$14/user/year** with a daily-habit loop that incumbents cannot easily replicate without a full product rebuild.

The SME segment is growing fastest because **cyber insurance carriers now require demonstrated training programs** as a coverage condition — creating a compliance-driven purchase trigger.

---

## Key Features

### 🎯 The Daily Engine

A BullMQ repeatable job delivers one puzzle per day to every active user in their configured timezone:

```
Points = (BasePoints × DifficultyMultiplier × SpeedBonus) × StreakMultiplier
```

| Factor | Formula |
|--------|---------|
| **BasePoints** | 100 (correct) \| 0 (incorrect) \| -10 (skipped) |
| **DifficultyMultiplier** | 1.0 (Easy) · 1.5 (Medium) · 2.0 (Hard) |
| **SpeedBonus** | 1.5 (<30s) · 1.2 (<60s) · 1.0 (>60s) |
| **StreakMultiplier** | 1 + (streak_days × 0.02), capped at 1.5 |

**Puzzle types:** Spot the Phish (image-based), True/False Scenarios, Context-Aware scenarios (travel, finance, new-hire), Breach Alert puzzles (triggered by live HIBP data).

### 🕵️ Peer Phish

Employees send pre-approved, sandboxed phishing simulations to opted-in coworkers. Key guardrails:

- Templates are **admin-curated only** — users cannot craft custom lures
- Targets must have **explicitly opted in** (no surprises)
- Tracked via invisible pixels and redirect URLs through `click.defenddaily.com`
- Clickers receive a **teachable moment**, not punishment
- Reporters (via `/report-phish`) earn **Defense Points** — larger reward than sending

### 📊 Human Risk Score

Every user gets a dynamic **0–100 score** computed nightly:

```
S = clamp((Awareness × 0.4) + (Consistency × 0.3) - (RealWorldRisk × 0.3), 0, 100)
```

- **Awareness:** Rolling 30-day puzzle accuracy
- **Consistency:** Current streak ÷ 30 (as percentage)
- **RealWorldRisk:** Breach count from HaveIBeenPwned
- Displayed as a color-coded shield in Slack weekly summaries
- Score < 60 → harder puzzles; Score < 40 → IdP policy enforcement (Enterprise)

### 👨‍👩‍👧‍👦 SentryLife (Family Mode)

Employees share an invite link with family members to extend security training to their household:

- **Guardian Alerts:** Slack DM when a linked family member's score drops
- **Family Leaderboard:** Friendly competition without shaming
- **Home Defense Kit:** Canary documents (Word, PDF, Excel, PNG, `.url`) via Canarytokens.org
- **Breach Monitor:** Weekly HIBP summary for all linked emails

### 📈 CISO Dashboard

Next.js 14 dashboard with App Router, Tailwind CSS, and NextAuth.js:

| Route | View |
|-------|------|
| `/dashboard` | Org overview with risk heatmap |
| `/team` | Per-user Risk Scores |
| `/simulations` | Phish campaign results + trend charts |
| `/compliance` | PDF export center for SOC 2 / HIPAA / cyber insurance |
| `/settings` | Integrations, billing, timezone config |

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **API Server** | Node.js + Express | Best ecosystem for Slack/Teams SDKs |
| **Database** | PostgreSQL 16 + Redis 7 | Sorted sets for live leaderboards |
| **Slack Bot** | Slack Bolt for Node.js | Official SDK with event-driven architecture |
| **Teams Bot** | Bot Framework SDK v4 | Adaptive Cards for rich messaging |
| **Dashboard** | Next.js 14 (App Router) | SSR for compliance reports, ISR for dashboards |
| **Auth** | NextAuth.js v5 | Google/Microsoft SSO + magic links; SAML/OIDC in Enterprise |
| **Jobs** | BullMQ (Redis-backed) | Repeatable cron, retry logic, priority queues |
| **Storage** | AWS S3 / Cloudflare R2 | Compliance PDFs, canary documents |
| **Hosting** | Railway.app → AWS ECS/Fargate | Zero-ops MVP, scale at $10K MRR |
| **Observability** | Sentry + PostHog | Error tracking + product analytics |

### External APIs

- **HaveIBeenPwned** — Real breach lookups (k-anonymity SHA-1 for passwords, full email for breach count)
- **Twilio** — Smishing (SMS phishing) simulations with explicit consent tracking
- **Canarytokens.org** — Free honey-token file generation for Home Defense Kit
- **Okta / Azure AD** — Conditional Access policy enforcement tied to Risk Score (Enterprise)
- **SendGrid** — Transactional email (weekly summaries, breach alerts)
- **Nodemailer** — Native phishing simulation sending (custom tracking pixels + redirect URLs)

---

## Project Structure

```
defenddaily/
├── CLAUDE.md                     # Session continuation protocol & master brief
├── DESIGN.md                     # Design system (colors, typography, components)
├── README.md
├── package.json                  # Root workspace (pnpm monorepo)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── .gitignore
│
├── apps/
│   ├── api/                      # Express API server  (package name: "api")
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts          # Entry point + SIGTERM graceful shutdown
│   │       ├── config/
│   │       │   ├── env.ts        # Zod-validated environment (exits on invalid config)
│   │       │   └── logger.ts     # Pino structured logger
│   │       ├── db/
│   │       │   ├── client.ts     # pg Pool (max 10 dev / 20 prod)
│   │       │   ├── redis.ts      # ioredis (enableReadyCheck, retryStrategy)
│   │       │   ├── migrate.ts    # Migration runner (schema_migrations tracking)
│   │       │   ├── seed.ts       # Built-in puzzle bank seeder
│   │       │   ├── seeds/
│   │       │   │   ├── bulkGeneratePuzzles.ts   # AI-generated puzzles (Claude API)
│   │       │   │   └── enrichExplanations.ts    # AI explanation enrichment
│   │       │   └── migrations/
│   │       │       ├── 001_init.sql
│   │       │       ├── 002_slack_installation.sql
│   │       │       ├── 003_breach_records_unique.sql
│   │       │       ├── 004_risk_history_unique.sql
│   │       │       ├── 005_phish_templates_unique.sql
│   │       │       ├── 006_smishing_consent.sql
│   │       │       ├── 007_family_invites.sql
│   │       │       ├── 008_achievements.sql
│   │       │       ├── 009_locale.sql
│   │       │       ├── 010_spaced_repetition.sql
│   │       │       ├── 011_elo.sql
│   │       │       ├── 012_campaigns.sql
│   │       │       └── 013_billing.sql
│   │       ├── bots/
│   │       │   ├── slack/
│   │       │   │   ├── app.ts          # Bolt app initialization + OAuth
│   │       │   │   ├── commands/       # /defend /leaderboard /risk /phish-a-friend
│   │       │   │   │                   # /report-phish /achievements /stats /challenge
│   │       │   │   │                   # /freeze /suggest-puzzle /admin-report /send-now
│   │       │   │   ├── actions/        # answerHandler, phishSendHandler
│   │       │   │   └── messages/       # Block Kit builders
│   │       │   └── teams/              # Microsoft Teams Bot Framework SDK v4
│   │       │       ├── adapter.ts
│   │       │       ├── bot.ts
│   │       │       └── cards/          # Adaptive Card builders
│   │       ├── jobs/
│   │       │   ├── queue.ts            # BullMQ queues + default options
│   │       │   ├── dailyPuzzle.ts      # 9 AM puzzle delivery (concurrency: 5)
│   │       │   ├── riskScore.ts        # Nightly score recalculation
│   │       │   ├── hibpCheck.ts        # Weekly breach scan
│   │       │   ├── weeklySummary.ts    # Monday morning personal DM
│   │       │   ├── guardianAlert.ts    # Nightly family score alerts
│   │       │   ├── bossChallenge.ts    # Monthly org-wide hard puzzle
│   │       │   ├── cisaKevSync.ts      # Weekly CISA KEV feed pull
│   │       │   ├── puzzleRetirement.ts # Auto-retire >95% accuracy puzzles
│   │       │   └── seatSync.ts         # Nightly Stripe seat quantity sync
│   │       ├── routes/
│   │       │   ├── webhooks.ts         # Phish tracking pixels + canary callbacks
│   │       │   ├── orgs.ts             # Org CRUD
│   │       │   ├── users.ts            # User CRUD + /by-email
│   │       │   ├── compliance.ts       # PDF generation endpoint
│   │       │   ├── puzzles.ts          # Puzzle CRUD + suggestion approval
│   │       │   ├── puzzleAnalytics.ts  # Skip rate, time-to-answer, engagement
│   │       │   ├── weaknessMap.ts      # MITRE ATT&CK weakness map per user
│   │       │   ├── campaigns.ts        # Training campaign CRUD + puzzle assignment
│   │       │   ├── cohortAnalytics.ts  # Cohort, behavioral change, health score
│   │       │   ├── billing.ts          # Stripe checkout + status + webhook handler
│   │       │   └── referrals.ts        # Referral link generation + stats
│   │       ├── services/
│   │       │   ├── puzzleEngine.ts     # Puzzle selection (campaign-aware + spaced rep)
│   │       │   ├── riskScorer.ts       # Human Risk Score formula
│   │       │   ├── phishSimulator.ts   # Nodemailer phish sending + tracking
│   │       │   ├── hibp.ts             # HaveIBeenPwned (k-anonymity, Redis cache)
│   │       │   ├── compliancePdf.tsx   # @react-pdf/renderer PDF template
│   │       │   ├── smishing.ts         # Twilio SMS simulation (consent-gated)
│   │       │   ├── canary.ts           # Canarytokens.org API + zip delivery
│   │       │   ├── stripe.ts           # Stripe checkout + webhook handling
│   │       │   ├── spacedRepetition.ts # Leitner box scheduler (5 boxes)
│   │       │   ├── eloCalibration.ts   # Elo puzzle difficulty (K=32, 800–2400)
│   │       │   └── __tests__/          # spacedRepetition.test.ts, eloCalibration.test.ts
│   │       └── middleware/
│   │           ├── apiAuth.ts          # HS256 Bearer JWT + requireRole/requireOrgMatch
│   │           ├── planGate.ts         # requirePlan('growth'|'enterprise') → 402
│   │           └── __tests__/          # apiAuth.test.ts
│   │
│   └── dashboard/                 # Next.js 14 CISO & SentryLife dashboard
│       ├── package.json
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── globals.css
│           │   ├── (marketing)/page.tsx       # Landing page
│           │   ├── (auth)/login/page.tsx
│           │   ├── (auth)/setup/              # Post-Slack-install wizard
│           │   ├── (app)/                     # Authenticated routes
│           │   │   ├── layout.tsx             # Sidebar + TopBar
│           │   │   ├── dashboard/page.tsx
│           │   │   ├── team/page.tsx
│           │   │   ├── simulations/page.tsx
│           │   │   ├── compliance/page.tsx
│           │   │   ├── settings/
│           │   │   │   ├── page.tsx           # Tabs: General/Integrations/Billing/Notifications
│           │   │   │   └── billing/page.tsx   # Plan comparison + upgrade flow
│           │   │   ├── success/page.tsx        # Account health + subscription status
│           │   │   ├── roi/page.tsx            # ROI calculator
│           │   │   ├── campaigns/page.tsx      # Campaign management
│           │   │   └── puzzles/
│           │   │       ├── page.tsx            # Admin puzzle studio
│           │   │       └── effectiveness/page.tsx
│           │   └── (sentrylife)/
│           │       ├── family/page.tsx
│           │       └── home-defense/page.tsx
│           ├── components/
│           │   ├── analytics/
│           │   │   ├── RoiCalculator.tsx
│           │   │   └── RiskSparkline.tsx
│           │   ├── billing/
│           │   │   └── UpgradeBanner.tsx
│           │   ├── campaigns/
│           │   │   └── CampaignManager.tsx
│           │   ├── puzzles/
│           │   │   ├── PuzzleStudio.tsx
│           │   │   └── BlockKitPreview.tsx
│           │   ├── dashboard/
│           │   │   ├── RiskHeatmap.tsx
│           │   │   ├── PhishTrendChart.tsx
│           │   │   ├── LeaderboardTable.tsx
│           │   │   ├── RiskScoreGauge.tsx
│           │   │   └── ComplianceExportButton.tsx
│           │   └── ui/                  # Design system primitives
│           │       ├── Badge.tsx, Button.tsx, Card.tsx
│           │       ├── DataTable.tsx, EmptyState.tsx
│           │       ├── PageHeader.tsx, StatCard.tsx
│           │       ├── Skeleton.tsx, Spotlight.tsx
│           │       └── Terminal.tsx, Wordmark.tsx
│           └── lib/
│               ├── api.ts               # Typed fetch client to Express API
│               ├── api-jwt.ts           # JWT minting for server→API calls
│               ├── auth-guard.ts        # requireCisoOrAdmin() server helper
│               └── risk-colors.ts       # Score → color token mapping
│
├── packages/
│   ├── shared-types/               # TypeScript interfaces shared across apps
│   └── puzzle-bank/                # Static puzzle JSON (500+ puzzles)
│       ├── spot-the-phish/
│       ├── true-false/
│       ├── scenarios/
│       └── breach-alert/
│
├── infra/
│   ├── docker-compose.yml          # PostgreSQL 16 + Redis 7 (named volumes + healthchecks)
│   └── railway.toml                # Railway deployment config
│
└── docs/
    ├── PROGRESS.md                 # Live step-level progress tracker
    └── phase-*/                    # Per-step implementation guides
```

---

## Database Schema

<details>
<summary>Click to expand — 13 migrations, 15+ tables, Redis conventions</summary>

### Tables

```sql
-- Organizations
CREATE TABLE organizations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  slack_team_id    VARCHAR(100) UNIQUE,
  teams_tenant_id  VARCHAR(100) UNIQUE,
  plan             VARCHAR(50) DEFAULT 'starter',
  timezone         VARCHAR(100) DEFAULT 'UTC',
  puzzle_time      TIME DEFAULT '09:00:00',
  peer_phish_enabled BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email               VARCHAR(255) NOT NULL,
  display_name        VARCHAR(255),
  role                VARCHAR(50) DEFAULT 'employee',
  provider_id         VARCHAR(100),
  provider_type       VARCHAR(20),
  risk_score          SMALLINT DEFAULT 75,
  streak              INT DEFAULT 0,
  longest_streak      INT DEFAULT 0,
  last_active_date    DATE,
  family_group_id     UUID,
  is_peer_phish_target BOOLEAN DEFAULT false,
  hibp_last_checked   TIMESTAMPTZ,
  breach_count        SMALLINT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

-- Puzzle bank
CREATE TABLE puzzles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             VARCHAR(50) NOT NULL,
  difficulty       VARCHAR(20) DEFAULT 'medium',
  context_trigger  VARCHAR(50),
  payload          JSONB NOT NULL,
  correct_answer   VARCHAR(100) NOT NULL,
  explanation      TEXT NOT NULL,
  tags             TEXT[],
  active           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Daily deliveries
CREATE TABLE puzzle_deliveries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id        UUID REFERENCES puzzles(id),
  delivered_at     TIMESTAMPTZ DEFAULT NOW(),
  responded_at     TIMESTAMPTZ,
  is_correct       BOOLEAN,
  response_time_ms INT,
  status           VARCHAR(20) DEFAULT 'pending',
  points_earned    INT DEFAULT 0
);

-- Peer phish campaigns (legal record)
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
  outcome         VARCHAR(20)
);

-- Phish templates (admin-curated)
CREATE TABLE phish_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  subject     VARCHAR(500),
  body_html   TEXT NOT NULL,
  lure_type   VARCHAR(50),
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
  token_id      VARCHAR(100) UNIQUE NOT NULL,
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

-- Additional tables added in later migrations:
-- achievements, user_achievements (008)
-- leitner_boxes (010 — spaced repetition state per user/puzzle)
-- puzzle_ab_variants (A/B testing framework)
-- training_campaigns, campaign_puzzles (012)
-- referrals (013)
-- Billing columns on organizations: stripe_customer_id, stripe_subscription_id,
--   plan_status, plan_expires_at, seat_count, referral_code (013)
```

### Indexes

```sql
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_puzzle_deliveries_user_id ON puzzle_deliveries(user_id);
CREATE INDEX idx_puzzle_deliveries_delivered_at ON puzzle_deliveries(delivered_at);
CREATE INDEX idx_phish_campaigns_target_id ON phish_campaigns(target_id);
CREATE INDEX idx_risk_score_history_user_date ON risk_score_history(user_id, recorded_at);
CREATE INDEX idx_audit_log_org_id ON audit_log(org_id, occurred_at);
```

### Redis Key Conventions

| Key Pattern | Type | TTL | Purpose |
|------------|------|-----|---------|
| `leaderboard:{org_id}` | Sorted Set | ∞ | User scores for org leaderboard |
| `streak:{user_id}` | String | ∞ | Current streak (synced to Postgres nightly) |
| `hibp:{email_hash}` | String | 86400s | Cached breach summary |
| `puzzle:today:{org_id}:{user_id}` | String | 86400s | Prevents double-delivery |
| `session:{token}` | Hash | 3600s | User session data |

</details>

---

## Design System

The full design system is documented in [`DESIGN.md`](DESIGN.md). Key tokens:

```yaml
# Brand colors
primary: "#0007cd"       # Deep electric blue — CTAs, wordmark, spotlight glows
canvas: "#0f0f0f"        # Near-black page floor
surface-card: "#181818"  # Default card surface
surface-elevated: "#222222"  # Secondary buttons, terminal panes

# Typography
display-mega: 72px/500   # Hero h1
display-xl: 56px/500     # Subsidiary heroes
display-lg: 44px/500     # Section heads
body-md: 16px/400        # Default body
code: 13px/400 JetBrains Mono  # All code/terminal surfaces

# Spacing
section: 96px            # Between major page bands
card-gap: 24px           # Between cards in a band

# Border radius
md: 8px                  # CTAs, form inputs
lg: 12px                 # Toolkit cards, terminal panes
xl: 16px                 # Feature cards, terminal mockup grids
```

---

## Getting Started

### Prerequisites

- **Node.js** 22+
- **pnpm** 10+
- **Docker** (for local PostgreSQL + Redis)
- A **Slack workspace** with admin access for bot installation

### Setup

```bash
# 1. Clone & install
git clone https://github.com/your-org/defenddaily.git
cd defenddaily
pnpm install

# 2. Start local infrastructure
docker compose -f infra/docker-compose.yml up -d

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your Slack credentials, database URL, etc.

# 4. Run database migrations
pnpm --filter api migrate

# 5. Seed the puzzle bank (built-in puzzles)
pnpm --filter api seed

# 6. Start development servers
pnpm dev
```

The API server starts at `http://localhost:3001` and the dashboard at `http://localhost:3000`.

### Database Migrations & Seeds

> **Note:** The package name inside `apps/api/package.json` is `"name": "api"` — use `--filter api`, not `--filter @defenddaily/api`.

| Command | What it does |
|---------|-------------|
| `pnpm --filter api migrate` | Applies all pending SQL migrations in order |
| `pnpm --filter api seed` | Seeds the built-in puzzle bank (30+ puzzles) |
| `pnpm tsx apps/api/src/db/seeds/bulkGeneratePuzzles.ts` | AI-generates 20 additional puzzles (requires `ANTHROPIC_API_KEY`) |
| `pnpm tsx apps/api/src/db/seeds/enrichExplanations.ts` | Enriches existing puzzle explanations via Claude API |

Alternatively, from within `apps/api/` you can run `pnpm migrate` and `pnpm seed` directly.

All migrations live in `apps/api/src/db/migrations/` and are tracked in the `schema_migrations` table — re-running `migrate` is always safe (already-applied files are skipped).

---

## Environment Variables

<details>
<summary>Click to expand — all 35+ environment variables</summary>

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (`development`/`production`) | ✅ |
| `PORT` | API server port (default: `3001`) | |
| `CORS_ORIGIN` | Dashboard origin for CORS | ✅ |
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `REDIS_URL` | Redis connection string | ✅ |
| `SLACK_BOT_TOKEN` | Slack bot token (`xoxb-...`) | ✅ |
| `SLACK_SIGNING_SECRET` | Slack signing secret | ✅ |
| `SLACK_CLIENT_ID` | Slack OAuth client ID | ✅ |
| `SLACK_CLIENT_SECRET` | Slack OAuth client secret | ✅ |
| `TEAMS_APP_ID` | Microsoft Teams app ID | |
| `TEAMS_APP_PASSWORD` | Microsoft Teams app password | |
| `HIBP_API_KEY` | HaveIBeenPwned v3 API key | |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | |
| `TWILIO_FROM_NUMBER` | Twilio SMS sending number | |
| `SMTP_HOST` | SMTP server (phish sending) | |
| `SMTP_PORT` | SMTP port | |
| `SMTP_USER` | SMTP username | |
| `SMTP_PASS` | SMTP password | |
| `PHISH_FROM_DOMAIN` | Phish sending domain (`mail.defenddaily.com`) | |
| `CANARY_WEBHOOK_BASE` | Canarytokens callback URL | |
| `TRACKING_BASE_URL` | Tracking pixel base URL (`click.defenddaily.com`) | |
| `NEXTAUTH_SECRET` | NextAuth.js encryption secret | ✅ |
| `NEXTAUTH_URL` | Dashboard URL | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | |
| `OKTA_DOMAIN` | Okta domain (Enterprise) | |
| `OKTA_API_TOKEN` | Okta API token | |
| `OKTA_RISK_POLICY_GROUP_ID` | Okta MFA enforcement group | |
| `SENDGRID_API_KEY` | SendGrid API key | |
| `SENDGRID_FROM_EMAIL` | SendGrid from address | |
| `S3_BUCKET` | S3/R2 bucket name | |
| `S3_REGION` | S3 region | |
| `S3_ACCESS_KEY` | S3 access key | |
| `S3_SECRET_KEY` | S3 secret key | |

</details>

---

## Implementation Roadmap

<details>
<summary>Click to expand — 6 phases across 20 weeks</summary>

### Phase 1 — Bot MVP ✅ *Complete*

- [x] pnpm monorepo with Express + TypeScript
- [x] PostgreSQL 16 + Redis 7 via Docker Compose
- [x] Schema migrations tracked in `schema_migrations` table
- [x] Slack Bolt app with OAuth install flow
- [x] `/defend` slash command for on-demand puzzles
- [x] Block Kit builders for all puzzle types
- [x] Answer handler with score + streak tracking
- [x] BullMQ repeatable job for 9 AM delivery per org timezone
- [x] 30+ seeded puzzles (spot-the-phish, true/false, scenarios, breach alerts)
- [x] `/leaderboard` command with emoji rank medals

### Phase 2 — Risk Score & HIBP ✅ *Complete*

- [x] Dynamic Human Risk Score formula (Awareness×0.4 + Consistency×0.3 − RealWorldRisk×0.3)
- [x] HaveIBeenPwned integration (k-anonymity API, Redis 24h cache)
- [x] Weekly breach scan BullMQ job
- [x] Nightly score recalculation job → `risk_score_history`
- [x] `/risk` command with color-coded shield
- [x] Weekly Monday summary message per user

### Phase 3 — Peer Phish ✅ *Complete*

- [x] Native Nodemailer phishing simulator (no Gophish dependency)
- [x] Admin-curated phish template library (10 templates)
- [x] `/phish-a-friend` Slack modal with template browser
- [x] Tracking pixels + redirect webhooks (`/track/open/:token`, `/track/click/:token`)
- [x] `/report-phish` command with Defense Points
- [x] Twilio smishing path with explicit consent stored in DB
- [x] ToS acknowledgment + audit log assertions before every send

### Phase 4 — CISO Dashboard ✅ *Complete*

- [x] Next.js 14 App Router + Tailwind CSS
- [x] NextAuth.js with Google/Microsoft SSO + magic links
- [x] Shared types package
- [x] API client layer with HS256 Bearer JWT auth
- [x] Risk Heatmap (CSS grid, color-coded red/amber/green)
- [x] Phish Trend Chart (Recharts, 90-day click rate)
- [x] Leaderboard Table + Risk Score Gauge
- [x] Compliance PDF export (`@react-pdf/renderer`)
- [x] CISO/admin role middleware on all dashboard API routes
- [x] Heatmap PNG export (`next/og` ImageResponse)
- [x] Post-install Slack setup wizard

### Phase 5 — SentryLife & Family Mode ✅ *Complete*

- [x] Family invite token generation + accept flow
- [x] SentryLife Tailwind theme (separate `/sentrylife` route group)
- [x] Family leaderboard + linked accounts page
- [x] Guardian Alert nightly BullMQ job (score drops → Slack DM)
- [x] Canary token generation via Canarytokens.org API
- [x] Home Defense Kit zip download (Word, PDF, Excel, PNG, .url)
- [x] Weekly breach monitor email (SendGrid) for all family emails

### Phase 6 — UI/UX & Design System ✅ *Complete*

- [x] Full marketing homepage with hero, terminal mockup, spotlight glow
- [x] Toast (sonner), Modal (Radix Dialog), Tooltip (Radix Tooltip)
- [x] DataTable with keyset pagination, Skeleton loading, `loading.tsx` siblings
- [x] Framer Motion page transitions + card hover lifts
- [x] Mobile responsive + accessible keyboard navigation
- [x] Multi-step onboarding wizard, settings page redesign
- [x] Risk score trend sparklines (7-day per user on team page)

### Phase 7 — Bot & Engagement Upgrades ✅ *Complete*

- [x] Achievements system (15+ definitions, `/achievements` command, badge grid DM)
- [x] Streak freeze tokens (earn on 7-day streak, `/freeze` command)
- [x] Monthly boss challenge (org-wide hard puzzle, 2× points)
- [x] Team vs team department leaderboard
- [x] `/stats`, `/challenge @user`, smart 3 PM re-DM reminder
- [x] Bot onboarding nurture DMs (day 1/3/7)
- [x] Microsoft Teams Adaptive Card delivery + commands
- [x] Weekly personal DM digest, milestone celebration DMs
- [x] Multi-language routing framework (EN/ES/FR/DE)

### Phase 8 — Question Quality & Content Intelligence ✅ *Complete*

- [x] Claude API (claude-sonnet-4-6) puzzle generation with quality scoring
- [x] Spaced repetition (Leitner box scheduler, 5 boxes)
- [x] CISA KEV feed integration (weekly CVE puzzles)
- [x] Deepfake, physical security, supply chain attack puzzle categories
- [x] Elo-style difficulty calibration (K=32, clamped 800–2400)
- [x] A/B testing framework for puzzle variants
- [x] Puzzle engagement analytics (skip rate, time-to-answer)
- [x] Admin puzzle studio (create/edit/preview in dashboard)
- [x] `/suggest-puzzle` command + approval queue
- [x] MITRE ATT&CK tag taxonomy + user weakness map
- [x] Puzzle retirement system (auto-retire >95% accuracy after 100 responses)
- [x] DeepL translation pipeline (ES/FR/DE)
- [x] 500+ puzzle bank expansion (AI-assisted, human-reviewed)

### Phase 9 — Analytics, Gamification & Platform *(In Progress)*

- [x] Cohort analysis dashboard (new hire vs 30/90-day vs veteran)
- [x] Behavioral change score (90-day before/after diff)
- [x] Department risk sparklines (7/30/90-day trend)
- [x] ROI calculator page (breach cost avoided, insurance discount)
- [x] Campaign management (admin schedules themed training weeks)
- [x] Custom puzzle campaigns (assign sets to specific teams)
- [x] Stripe billing integration (checkout + subscription tiers)
- [x] Seat-based metered billing + Stripe webhook handlers
- [x] In-app upgrade flow (feature gates + upsell banners)
- [x] Customer success portal (health score, adoption, renewal)
- [x] Referral program (unique links, commission tracking)
- [ ] Outbound webhook framework (retry, delivery log)
- [ ] Zapier integration (phish_click, streak_milestone, score_drop)
- [ ] Public API v1 (JWT API keys, rate limiting 1000/hr)
- [ ] OpenAPI 3.1 spec + developer documentation site

### Phase 10 — Enterprise & IdP Automation

- [ ] Okta integration (MFA policy group assignment on score < 40)
- [ ] Azure AD integration (Conditional Access policies)
- [ ] SAML/OIDC SSO via NextAuth.js enterprise providers
- [ ] SCIM 2.0 provisioning endpoint
- [ ] MSP partner portal (white-label, multi-org management)
- [ ] Stripe reseller billing webhook (partner margin calculation)

</details>

---

## Contributing

This project follows strict engineering standards:

- **TypeScript** with `strict: true`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`
- **No ORM** — raw SQL via `node-postgres` with parameterized queries
- **Zod** for all runtime validation (API inputs, environment variables)
- **Pino** for structured logging — no `console.log` in production code
- **Vitest** + **msw** for testing with isolated DB fixtures per test
- **Commit convention:** `type(scope): description` — `feat | fix | chore | test | docs | refactor`

See [`docs/`](docs/) for detailed implementation guides for each phase.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**DefendDaily** — *Because the best security training is the one that actually happens.*

[Star](https://github.com/your-org/defenddaily/stargazers) · [Watch](https://github.com/your-org/defenddaily/watchers) · [Fork](https://github.com/your-org/defenddaily/forks) · [Report Bug](https://github.com/your-org/defenddaily/issues)

</div>
