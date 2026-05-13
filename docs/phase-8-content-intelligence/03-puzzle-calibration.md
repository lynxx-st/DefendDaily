# Steps 8.08–8.11 — Puzzle Calibration

## 8.08 Elo-style puzzle difficulty calibration

**Migration:** `apps/api/src/db/migrations/011_elo.sql`

```sql
ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS elo_rating SMALLINT DEFAULT 1200;
ALTER TABLE users ADD COLUMN IF NOT EXISTS elo_level SMALLINT DEFAULT 1200;
CREATE INDEX IF NOT EXISTS idx_puzzles_elo ON puzzles(elo_rating);
```

**File:** `apps/api/src/services/eloCalibration.ts`

```typescript
import { db } from '../db/client'

const K = 32

function expectedScore(playerElo: number, puzzleElo: number): number {
  return 1 / (1 + Math.pow(10, (puzzleElo - playerElo) / 400))
}

export async function updateEloRatings(
  userId: string,
  puzzleId: string,
  isCorrect: boolean,
): Promise<void> {
  const result = await db.query<{ user_elo: number; puzzle_elo: number }>(
    `SELECT u.elo_level AS user_elo, p.elo_rating AS puzzle_elo
     FROM users u, puzzles p WHERE u.id = $1 AND p.id = $2`,
    [userId, puzzleId],
  )
  const row = result.rows[0]
  if (!row) return

  const actualScore = isCorrect ? 1 : 0
  const expected = expectedScore(row.user_elo, row.puzzle_elo)

  const newUserElo = Math.round(row.user_elo + K * (actualScore - expected))
  const newPuzzleElo = Math.round(row.puzzle_elo + K * ((1 - actualScore) - (1 - expected)))

  await db.query(
    `UPDATE users SET elo_level = $1 WHERE id = $2`,
    [Math.max(800, Math.min(2400, newUserElo)), userId],
  )
  await db.query(
    `UPDATE puzzles SET elo_rating = $1 WHERE id = $2`,
    [Math.max(800, Math.min(2400, newPuzzleElo)), puzzleId],
  )
}

export async function selectEloMatchedPuzzle(userId: string, excludeIds: string[]): Promise<string | null> {
  const userRow = await db.query<{ elo_level: number }>(
    `SELECT elo_level FROM users WHERE id = $1`,
    [userId],
  )
  const userElo = userRow.rows[0]?.elo_level ?? 1200

  const result = await db.query<{ id: string }>(
    `SELECT id FROM puzzles
     WHERE active = true
       AND id != ALL($1)
     ORDER BY ABS(elo_rating - $2) ASC
     LIMIT 1`,
    [excludeIds.length > 0 ? excludeIds : ['00000000-0000-0000-0000-000000000000'], userElo],
  )
  return result.rows[0]?.id ?? null
}
```

Call `updateEloRatings` from the answer handler. Use `selectEloMatchedPuzzle` as a fallback puzzle selection strategy in `dailyPuzzle.ts`.

---

## 8.09 A/B testing framework for puzzle variants

**Migration:** Add to `011_elo.sql`:

```sql
CREATE TABLE IF NOT EXISTS puzzle_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_group   VARCHAR(100) NOT NULL,
  variant_label   VARCHAR(10) NOT NULL, -- 'A' or 'B'
  puzzle_id       UUID REFERENCES puzzles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(variant_group, variant_label)
);

CREATE TABLE IF NOT EXISTS ab_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_group   VARCHAR(100) NOT NULL,
  variant_label   VARCHAR(10) NOT NULL,
  user_id         UUID REFERENCES users(id),
  is_correct      BOOLEAN NOT NULL,
  response_time_ms INT,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);
```

**File:** `apps/api/src/services/abTesting.ts`

```typescript
import { createHash } from 'crypto'
import { db } from '../db/client'

export function assignVariant(userId: string, variantGroup: string): 'A' | 'B' {
  const hash = createHash('sha256').update(userId + variantGroup).digest('hex')
  return parseInt(hash.slice(0, 8), 16) % 2 === 0 ? 'A' : 'B'
}

export async function getPuzzleForVariant(variantGroup: string, variant: 'A' | 'B'): Promise<string | null> {
  const result = await db.query<{ puzzle_id: string }>(
    `SELECT puzzle_id FROM puzzle_variants WHERE variant_group = $1 AND variant_label = $2`,
    [variantGroup, variant],
  )
  return result.rows[0]?.puzzle_id ?? null
}

export async function recordAbResult(
  variantGroup: string,
  variant: 'A' | 'B',
  userId: string,
  isCorrect: boolean,
  responseTimeMs: number,
): Promise<void> {
  await db.query(
    `INSERT INTO ab_results (variant_group, variant_label, user_id, is_correct, response_time_ms) VALUES ($1, $2, $3, $4, $5)`,
    [variantGroup, variant, userId, isCorrect, responseTimeMs],
  )
}
```

---

## 8.10 Puzzle engagement analytics

**File:** `apps/api/src/routes/puzzleAnalytics.ts`

```typescript
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { db } from '../db/client'

export const puzzleAnalyticsRouter = Router()

puzzleAnalyticsRouter.use(requireAuth, requireRole('ciso', 'admin'))

puzzleAnalyticsRouter.get('/engagement', async (req, res) => {
  const { orgId } = res.locals.principal!

  const result = await db.query<{
    puzzle_id: string; type: string; difficulty: string; total_shown: string;
    skip_rate: string; avg_response_ms: string; accuracy: string
  }>(
    `SELECT
       pd.puzzle_id,
       p.type,
       p.difficulty,
       COUNT(*)::text AS total_shown,
       ROUND(COUNT(CASE WHEN pd.status = 'skipped' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1)::text AS skip_rate,
       ROUND(AVG(pd.response_time_ms))::text AS avg_response_ms,
       ROUND(COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric / NULLIF(COUNT(CASE WHEN pd.status != 'skipped' THEN 1 END), 0) * 100, 1)::text AS accuracy
     FROM puzzle_deliveries pd
     JOIN puzzles p ON p.id = pd.puzzle_id
     JOIN users u ON u.id = pd.user_id
     WHERE u.org_id = $1 AND pd.delivered_at >= CURRENT_DATE - 30
     GROUP BY pd.puzzle_id, p.type, p.difficulty
     ORDER BY total_shown DESC
     LIMIT 50`,
    [orgId],
  )

  res.json({ puzzles: result.rows })
})
```

Register in `apps/api/src/index.ts`:
```typescript
import { puzzleAnalyticsRouter } from './routes/puzzleAnalytics'
app.use('/api/analytics/puzzles', puzzleAnalyticsRouter)
```

---

## 8.11 AI-generated rich explanations

When a puzzle is created by the AI pipeline, the explanation is already generated. For existing hand-authored puzzles with short explanations, add a backfill script:

**File:** `apps/api/src/db/seeds/enrichExplanations.ts`

```typescript
import { db } from '../client'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../config/env'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const puzzles = await db.query<{ id: string; type: string; payload: { question: string }; explanation: string }>(
  `SELECT id, type, payload, explanation FROM puzzles WHERE char_length(explanation) < 200 LIMIT 100`,
)

for (const puzzle of puzzles.rows) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: 'You are a security awareness trainer. Expand the following security puzzle explanation to at least 150 words. Include: what the red flag is, why attackers use this technique, real-world examples, and 2-3 specific prevention tips. Return only the expanded explanation text.',
    messages: [{ role: 'user', content: `Original question: ${puzzle.payload.question}\n\nOriginal explanation: ${puzzle.explanation}` }],
  })

  const enriched = message.content[0]?.type === 'text' ? message.content[0].text : ''
  if (enriched.length > puzzle.explanation.length) {
    await db.query(`UPDATE puzzles SET explanation = $1 WHERE id = $2`, [enriched, puzzle.id])
  }
}

await db.query('SELECT pg_notify($1, $2)', ['puzzle_explanations_enriched', JSON.stringify({ count: puzzles.rows.length })])
```

Run with: `pnpm tsx apps/api/src/db/seeds/enrichExplanations.ts`

**Commit:** `feat(api): Elo calibration, A/B testing, engagement analytics, AI explanations (#8.08-8.11)`
