# Steps 2.04 + 2.07 + 2.10: Nightly Risk Score Job

## apps/api/src/jobs/riskScore.ts

```typescript
import { Worker, Job } from 'bullmq';
import { riskScoreQueue, connection } from './queue';
import { db } from '../db/client';
import { computeRiskScore } from '../services/riskScorer';

export async function scheduleRiskScoreJob(): Promise<void> {
  const existing = await riskScoreQueue.getRepeatableJobs();
  for (const job of existing) await riskScoreQueue.removeRepeatableByKey(job.key);

  await riskScoreQueue.add('recalculate-scores', {}, {
    repeat: { cron: '0 2 * * *', tz: 'UTC' }, // 2 AM UTC daily
    removeOnComplete: 10,
    removeOnFail: 5,
  });
  console.log('📊 Risk score job scheduled (2 AM UTC daily)');
}

export const riskScoreWorker = new Worker(
  'risk-score',
  async (_job: Job) => {
    const users = await db.query<{ id: string; risk_score: number }>(
      'SELECT id, risk_score FROM users'
    );

    for (const user of users.rows) {
      try {
        const { score } = await computeRiskScore(user.id);

        // Update score on user
        await db.query(
          'UPDATE users SET risk_score = $1 WHERE id = $2',
          [score, user.id]
        );

        // Write to history for trend charts
        await db.query(`
          INSERT INTO risk_score_history (user_id, score, recorded_at)
          VALUES ($1, $2, CURRENT_DATE)
          ON CONFLICT (user_id, recorded_at) DO UPDATE SET score = EXCLUDED.score
        `, [user.id, score]);

        // Step 2.07: Difficulty escalation — flag users for harder puzzles
        // selectPuzzle() in puzzleEngine.ts should respect this when score < 60
        // (stored on users.risk_score; selectPuzzle reads it when filtering)

      } catch (err: unknown) {
        // Step 2.10: audit_log for ALL job failures (CLAUDE.md §10)
        const message = err instanceof Error ? err.message : String(err);
        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'job_failure', $2)`,
          [user.id, JSON.stringify({ job: 'risk-score', error: message })]
        );
      }
    }
  },
  { connection }
);

riskScoreWorker.on('failed', async (job, err) => {
  await db.query(
    `INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`,
    [JSON.stringify({ job: job?.name, error: err.message })]
  );
});
```

## Update risk_score_history uniqueness constraint

Add to migration or a new `002_risk_history_unique.sql`:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_score_history_user_date_unique
  ON risk_score_history(user_id, recorded_at);
```

## Update selectPuzzle in puzzleEngine.ts for difficulty escalation (Step 2.07)

Modify the `selectPuzzle` query to weight harder puzzles when score < 60:

```typescript
export async function selectPuzzle(userId: string, _orgId: string) {
  const userResult = await db.query<{ risk_score: number }>(
    'SELECT risk_score FROM users WHERE id = $1', [userId]
  );
  const riskScore = userResult.rows[0]?.risk_score ?? 75;

  // Low-risk users: all difficulties. High-risk: prefer harder puzzles.
  const difficultyFilter = riskScore < 60
    ? `AND p.difficulty IN ('medium', 'hard')`
    : '';

  const result = await db.query(`
    SELECT p.*
    FROM puzzles p
    WHERE p.active = true
      ${difficultyFilter}
      AND p.id NOT IN (
        SELECT puzzle_id FROM puzzle_deliveries
        WHERE user_id = $1 AND puzzle_id IS NOT NULL
      )
    ORDER BY RANDOM()
    LIMIT 1
  `, [userId]);

  return result.rows[0] ?? null;
}
```

Register `scheduleRiskScoreJob()` in `apps/api/src/index.ts`.

**Commit:**
```bash
git add apps/api/src/jobs/riskScore.ts apps/api/src/services/puzzleEngine.ts
git commit -m "feat(jobs): add nightly risk score recalculation job with difficulty escalation"
```

**Update PROGRESS.md:** Check off 2.04, 2.07, 2.10. Set Last Completed to "2.10 — riskScore.ts job".
