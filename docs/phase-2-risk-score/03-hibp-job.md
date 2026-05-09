# Step 2.03: hibpCheck.ts — Weekly BullMQ Job

## apps/api/src/jobs/hibpCheck.ts

```typescript
import { Worker, Job } from 'bullmq';
import { hibpQueue, connection } from './queue';
import { db } from '../db/client';
import { checkEmailBreaches } from '../services/hibp';

export async function scheduleHibpJob(): Promise<void> {
  const existing = await hibpQueue.getRepeatableJobs();
  for (const job of existing) await hibpQueue.removeRepeatableByKey(job.key);

  await hibpQueue.add('scan-breaches', {}, {
    repeat: { cron: '0 6 * * 1', tz: 'UTC' }, // Every Monday 6 AM
    removeOnComplete: 5,
    removeOnFail: 3,
  });
  console.log('🔍 HIBP check job scheduled (Monday 6 AM UTC)');
}

export const hibpWorker = new Worker(
  'hibp-check',
  async (_job: Job) => {
    const users = await db.query<{ id: string; email: string; breach_count: number }>(
      `SELECT id, email, breach_count FROM users WHERE email NOT LIKE '%@slack.local'`
    );

    for (const user of users.rows) {
      try {
        const breaches = await checkEmailBreaches(user.email);

        // Insert new breach records (skip duplicates)
        for (const breach of breaches) {
          await db.query(`
            INSERT INTO breach_records (user_id, breach_name, breach_date, data_classes)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING
          `, [user.id, breach.Name, breach.BreachDate || null, breach.DataClasses]);
        }

        // Update breach_count on user
        const countResult = await db.query<{ count: string }>(
          'SELECT COUNT(*) AS count FROM breach_records WHERE user_id = $1',
          [user.id]
        );
        const newCount = parseInt(countResult.rows[0]?.count ?? '0', 10);

        if (newCount !== user.breach_count) {
          await db.query(
            'UPDATE users SET breach_count = $1, hibp_last_checked = NOW() WHERE id = $2',
            [newCount, user.id]
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'job_failure', $2)`,
          [user.id, JSON.stringify({ job: 'hibp-check', error: message })]
        );
      }
    }
  },
  { connection, concurrency: 1 } // HIBP rate limiting — process users serially
);

hibpWorker.on('failed', async (job, err) => {
  await db.query(
    `INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`,
    [JSON.stringify({ job: job?.name, error: err.message })]
  );
});
```

Register `scheduleHibpJob()` in `apps/api/src/index.ts`.

**Commit:**
```bash
git add apps/api/src/jobs/hibpCheck.ts
git commit -m "feat(jobs): add weekly HIBP breach scan job with breach_records persistence"
```

**Update PROGRESS.md:** Check off 2.03. Set Last Completed to "2.03 — hibpCheck.ts job".
