# Phase 1 — Bot MVP

**Goal:** A working Slack bot that delivers daily puzzles, tracks answers, and shows a leaderboard.
This is the demo you show to your first 5 paying customers.

**Exit criteria:** A real Slack workspace can install the bot, receive daily puzzles,
answer them interactively, and see a leaderboard. All Phase 1 tests pass.

**Estimated effort:** 4 weeks

## Steps (19 total)

| # | Detail File | Description |
|---|-------------|-------------|
| 1.01 | 01-monorepo-init.md | Initialize pnpm monorepo |
| 1.02 | 01-monorepo-init.md | Root TypeScript config |
| 1.03 | 02-docker-and-env.md | infra/docker-compose.yml |
| 1.04 | 02-docker-and-env.md | .env.example |
| 1.05 | 03-database-setup.md | apps/api Express + TypeScript init |
| 1.06 | 03-database-setup.md | config/env.ts (Zod validation) |
| 1.07 | 03-database-setup.md | db/client.ts (node-postgres Pool) |
| 1.08 | 04-redis-and-queue.md | db/redis.ts (ioredis) |
| 1.09 | 03-database-setup.md | 001_init.sql migration (full schema) |
| 1.10 | 03-database-setup.md | Migration runner script |
| 1.11 | 04-redis-and-queue.md | BullMQ queue setup |
| 1.12 | 05-slack-bolt-init.md | Slack Bolt app + OAuth install flow |
| 1.13 | 06-block-kit-builders.md | Block Kit message builders |
| 1.14 | 07-defend-command.md | /defend slash command |
| 1.15 | 08-answer-handler.md | Answer handler + scoring formula |
| 1.16 | 09-daily-puzzle-job.md | Daily puzzle BullMQ repeatable job |
| 1.17 | 10-puzzle-bank-seed.md | Puzzle bank seed (30+ puzzles) |
| 1.18 | 11-leaderboard-command.md | /leaderboard slash command |
| 1.19 | 12-phase1-tests.md | Integration tests (vitest + msw) |

## Key Architecture Decisions

- **No ORM** — raw parameterized SQL via node-postgres. Keeps it fast, explicit, and auditable.
- **BullMQ over node-cron** — persisted queues survive restarts; built-in retry and dead-letter support.
- **Puzzles in DB** — the `puzzles` table, not hard-coded. Enables A/B testing difficulty, adding puzzles without deploys.
- **Redis sorted sets for leaderboard** — `ZINCRBY` and `ZREVRANGE` give O(log N) leaderboard ops.
- **Slack Bolt action routing** — all interactive components route via `action_id`; never parse raw payloads manually.

## File Structure After Phase 1

```
apps/api/src/
├── config/env.ts
├── db/
│   ├── client.ts
│   ├── redis.ts
│   ├── migrate.ts
│   ├── seed.ts
│   └── migrations/001_init.sql
├── bots/slack/
│   ├── app.ts
│   ├── commands/defend.ts
│   ├── commands/leaderboard.ts
│   ├── actions/answerHandler.ts
│   └── messages/puzzleMessage.ts
├── jobs/
│   ├── queue.ts
│   └── dailyPuzzle.ts
├── services/
│   └── puzzleEngine.ts
└── index.ts

packages/puzzle-bank/
├── spot-the-phish/   (10 JSON files)
├── true-false/       (10 JSON files)
└── scenarios/        (10+ JSON files)

infra/
└── docker-compose.yml
```
