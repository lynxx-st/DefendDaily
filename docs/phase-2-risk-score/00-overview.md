# Phase 2 — Risk Score & HIBP Integration

**Goal:** Every user has a dynamic Human Risk Score. It recalculates nightly. Breaches from
HaveIBeenPwned flow into the score. `/risk` shows it. Monday summaries motivate improvement.

**Exit criteria:** `/risk` returns a color-coded shield with the user's score. Monday DMs
send automatically. HIBP breaches update `breach_records`. Score affects puzzle difficulty.

**Estimated effort:** 2 weeks

**Prerequisite:** Phase 1 complete (users table populated, daily puzzle job running).

## Steps (10 total)

| # | Detail File | Description |
|---|-------------|-------------|
| 2.01 | 01-risk-scorer-service.md | riskScorer.ts formula implementation |
| 2.02 | 02-hibp-service.md | hibp.ts — k-anonymity email lookup + Redis cache |
| 2.03 | 03-hibp-job.md | hibpCheck.ts — weekly BullMQ job |
| 2.04 | 04-nightly-score-job.md | riskScore.ts — nightly recalculation job |
| 2.05 | 05-risk-command.md | /risk slash command |
| 2.06 | 06-weekly-summary.md | Monday weekly summary DM |
| 2.07 | 04-nightly-score-job.md | Difficulty escalation (score < 60 → harder puzzles) |
| 2.08 | 07-phase2-tests.md | Unit tests for scoring formula |
| 2.09 | 02-hibp-service.md | Redis key convention verification |
| 2.10 | 04-nightly-score-job.md | audit_log job_failure for all job errors |

## Score Formula

```
S = clamp(
  (Awareness × 0.4) + (Consistency × 0.3) − (RealWorldRisk × 0.3),
  0, 100
)

Awareness     = rolling 30-day puzzle accuracy (0–100)
              = (correct answers in last 30 deliveries / total deliveries) × 100

Consistency   = min(current_streak / 30, 1) × 100
              = streak score capped at 30 days = 100%

RealWorldRisk = min(breach_count × 15, 100)
              = 1 breach → 15 points of risk, 7+ breaches → 100% risk
```

Score shield colors:
- 🟢 80–100: Strong defender
- 🟡 60–79: Improving
- 🟠 40–59: At risk (harder puzzles triggered here)
- 🔴 0–39: High risk (IdP enforcement in Phase 6)

## Key Implementation Notes

- **HIBP API:** `GET https://haveibeenpwned.com/api/v3/breachedaccount/{email}`
  - Header: `hibp-api-key: {HIBP_API_KEY}` and `User-Agent: DefendDaily`
  - Returns 200 + array of breach objects, or 404 if clean
- **Redis cache key:** `hibp:{sha256(email.toLowerCase()).substring(0,16)}` TTL 86400s
  - Never use raw email as Redis key (CLAUDE.md §10 privacy rule)
- **Nightly job:** runs at 2 AM UTC to avoid overlap with 9 AM puzzle delivery
- **Weekly job:** runs every Monday at 6 AM UTC
