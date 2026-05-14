# Phase 7 — Bot & Engagement Upgrades

**Goal:** Transform the daily puzzle bot from a simple Q&A loop into a rich engagement
engine with achievements, social challenges, streak protection, boss fights, and full
Microsoft Teams parity. Every mechanic is designed to maximize daily return rate and
org-wide participation.

**Exit criteria:** Achievements fire correctly after qualifying answers. Streak freeze
tokens are consumed by `/freeze`. Monthly boss challenge delivers to the entire org with
a 2× multiplier. `/challenge @user` initiates a live head-to-head puzzle. Teams users
receive daily puzzles via Adaptive Card and can respond in-chat.

**Estimated effort:** 5 weeks

**Prerequisites:** Phase 1 (bot MVP), Phase 2 (risk scores), Phase 6 (UI/UX overhaul).

## Steps (22 total)

| # | Detail File | Description |
|---|-------------|-------------|
| 7.01 | 01-achievements-schema.md | DB migration 008_achievements.sql (achievements + user_achievements tables) |
| 7.02 | 01-achievements-schema.md | Achievement trigger engine (post-answer hook, 15+ achievement definitions) |
| 7.03 | 01-achievements-schema.md | /achievements Slack command (badge grid DM) |
| 7.04 | 02-streak-and-challenges.md | Streak freeze tokens (earn on 7-day streak, /freeze command) |
| 7.05 | 02-streak-and-challenges.md | Monthly boss challenge job (org-wide hard puzzle, 2× points, Block Kit reveal) |
| 7.06 | 02-streak-and-challenges.md | Team vs team dept leaderboard (weekly dept score comparison) |
| 7.07 | 02-streak-and-challenges.md | /stats command (personal deep stats: accuracy by type, best streak, rank history) |
| 7.08 | 03-social-commands.md | /challenge @user command (head-to-head puzzle battle) |
| 7.09 | 03-social-commands.md | Smart re-DM reminder at 3 PM local for unanswered puzzles |
| 7.10 | 03-social-commands.md | Bot welcome onboarding flow (day 1 / day 3 / day 7 nurture DMs) |
| 7.11 | 03-social-commands.md | /admin-report command (CISO instant org summary) |
| 7.12 | 03-social-commands.md | /send-now admin command (trigger immediate puzzle delivery) |
| 7.13 | 02-streak-and-challenges.md | Boss challenge Block Kit UI (cinematic reveal, live countdown) |
| 7.14 | 04-teams-bot.md | Microsoft Teams Adaptive Card puzzle delivery |
| 7.15 | 04-teams-bot.md | Teams /defend, /risk, /leaderboard, /achievements commands |
| 7.16 | 04-teams-bot.md | Weekly personal DM digest (score, streak, rank, tip of the week) |
| 7.17 | 05-advanced-engagement.md | Interactive leaderboard with rank-change arrows (↑N / ↓N) |
| 7.18 | 05-advanced-engagement.md | Puzzle type unlocks (new categories unlock at 30/60/90 correct) |
| 7.19 | 05-advanced-engagement.md | Milestone celebration DMs (100 puzzles, first perfect week, 30-day streak) |
| 7.20 | 05-advanced-engagement.md | Slack status context triggers (OOO → travel security puzzles) |
| 7.21 | 05-advanced-engagement.md | Multi-language routing framework (EN/ES/FR/DE) |
| 7.22 | 05-advanced-engagement.md | Phase 7 integration tests |

## Key Architecture Notes

- **Achievements engine:** Runs as a synchronous hook at the end of the answer handler in
  `actions/answer.ts`. Checks all eligibility predicates against the current user state.
  Fires a Slack DM for newly unlocked achievements (non-blocking — `setImmediate`).
- **Streak freeze tokens:** Stored in Redis as `streak_freeze:{user_id}` (integer count).
  Consumed atomically with `DECR`. Expire after 90 days (set TTL on each increment).
- **Boss challenge:** Scheduled on the 1st of each month via BullMQ repeatable job.
  Uses a single shared puzzle delivered to the entire org. Results aggregated by
  end-of-day cron that posts a winner announcement.
- **Head-to-head challenges:** Challenge state stored in Redis as
  `challenge:{challenge_id}` Hash with `sender_id`, `receiver_id`, `puzzle_id`,
  `sender_answered`, `receiver_answered`, TTL 3600s.
- **Teams parity:** All Teams functionality mirrors Slack exactly. Adaptive Cards use
  `Action.Submit` for interactive puzzle responses. The Bot Framework adapter routes
  incoming activities to the same service layer as the Slack handlers.
- **Multi-language:** Locale stored in `users.locale` (VARCHAR 5). Puzzle payload
  selects the correct locale key from the JSONB `payload` column. Falls back to `en`.
