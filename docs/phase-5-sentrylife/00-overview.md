# Phase 5 — SentryLife & Family Mode

**Goal:** Consumer add-on. Employees invite family members. Guardian Alerts fire when family
scores drop. Home Defense Kit generates canary token zip files. Weekly breach monitor emails.

**Exit criteria:** Employee shares invite link. Family member creates SentryLife account (same
backend, purple UI skin). Guardian Alert fires when family score drops below 50.
Canary kit zip downloads successfully. Weekly breach email sends to family addresses.

**Estimated effort:** 3 weeks

**Prerequisites:** Phase 2 (risk scores), Phase 4 (dashboard).

## Steps (12 total)

| # | Detail File | Description |
|---|-------------|-------------|
| 5.01 | 01-family-invite-tokens.md | Invite token generation + linking |
| 5.02 | 02-sentrylife-ui.md | SentryLife Tailwind theme |
| 5.03 | 02-sentrylife-ui.md | /sentrylife/family page |
| 5.04 | 02-sentrylife-ui.md | /sentrylife/home-defense page |
| 5.05 | 03-guardian-alert-job.md | Guardian Alert nightly BullMQ job |
| 5.06 | 04-canary-token-service.md | Canarytokens.org API service |
| 5.07 | 05-home-defense-kit.md | Canary token zip (archiver) |
| 5.08 | 04-canary-token-service.md | Canary webhook callback route |
| 5.09 | 06-breach-monitor-email.md | Weekly breach email (SendGrid) |
| 5.10 | 01-family-invite-tokens.md | canary_tokens DB storage |
| 5.11 | 06-breach-monitor-email.md | Family HIBP scan integration |
| 5.12 | 07-phase5-tests.md | Integration tests |

## Key Architecture Notes

- **Same backend, different UI:** SentryLife is a route group `/sentrylife/*` in the Next.js app
  with a different Tailwind theme (purple `sentrylife` color palette)
- **Family roles:** `senior` and `child` roles in the `users` table link via `family_group_id`
- **Canarytokens.org API:** Free for basic tokens. No API key required.
  Endpoint: `POST https://canarytokens.org/generate`
- **Guardian Alert threshold:** score < 50 OR 3 consecutive incorrect answers
- **Consumer pricing:** $4.99/month per family unit (Stripe subscription in Phase 6)
