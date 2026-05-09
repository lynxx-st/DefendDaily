# Phase 4 — CISO Dashboard

**Goal:** Next.js 14 App Router dashboard. CISOs see Risk Heatmap, Phish Trend Chart,
Leaderboard. One-click Compliance PDF export. Post-install org setup wizard.

**Exit criteria:** CISO can log in via magic link, see their org's risk heatmap, and download
a compliance PDF. Slack install wizard routes to dashboard on first install.

**Estimated effort:** 4 weeks

**Prerequisites:** Phase 1 (data in DB), Phase 2 (risk scores), Phase 3 (phish campaign data).

## Steps (15 total)

| # | Detail File | Description |
|---|-------------|-------------|
| 4.01 | 01-nextjs-init.md | Next.js 14 + Tailwind CSS init |
| 4.02 | 02-nextauth-setup.md | NextAuth.js magic link + OAuth |
| 4.03 | 03-shared-types-package.md | packages/shared-types TypeScript interfaces |
| 4.04 | 04-api-client.md | Dashboard → API fetch wrapper |
| 4.05 | 05-risk-heatmap.md | RiskHeatmap.tsx |
| 4.06 | 06-phish-trend-chart.md | PhishTrendChart.tsx (Recharts) |
| 4.07 | 07-leaderboard-table.md | LeaderboardTable.tsx |
| 4.08 | 08-risk-score-gauge.md | RiskScoreGauge.tsx |
| 4.09 | 09-compliance-export.md | ComplianceExportButton.tsx |
| 4.10 | 10-compliance-pdf-route.md | PDF generation (@react-pdf/renderer) |
| 4.11 | 11-slack-install-wizard.md | /setup org wizard page |
| 4.12 | 02-nextauth-setup.md | CISO/admin role middleware |
| 4.13 | 10-compliance-pdf-route.md | Compliance route: session guard |
| 4.14 | 10-compliance-pdf-route.md | Risk Heatmap PNG export |
| 4.15 | 12-phase4-tests.md | Smoke tests |

## Key Architecture Decisions

- **App Router** — server components fetch data directly; only interactive charts are client components
- **NextAuth.js** — magic link for most users, Google/Microsoft OAuth for enterprise SSO
- **Recharts** — smaller bundle than Chart.js, React-native, good TypeScript support
- **@react-pdf/renderer** — renders React to PDF server-side; streamed via Express route
- **Route groups** — `(auth)/`, `(ciso)/`, `(sentrylife)/` separate concerns without URL segments

## Dashboard Route Map

```
/login                  → magic link / OAuth
/setup                  → post-Slack-install org wizard
/dashboard              → CISO overview (heatmap + summary)
/team                   → per-user risk scores table
/simulations            → phish campaign results + click rate chart
/compliance             → export center
/settings               → integrations, billing, peer phish toggle
/sentrylife/family      → family member management (Phase 5)
/sentrylife/home-defense → canary kit download (Phase 5)
```
