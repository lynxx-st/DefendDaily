# Step 1.16: Daily Puzzle BullMQ Repeatable Job

## apps/api/src/jobs/dailyPuzzle.ts

```typescript
import { Worker, Job } from 'bullmq';
import { dailyPuzzleQueue, connection } from './queue';
import { db } from '../db/client';
import { redis } from '../db/redis';
import { selectPuzzle } from '../services/puzzleEngine';
import { buildPuzzleBlocks } from '../bots/slack/messages/puzzleMessage';
import { slackApp } from '../bots/slack/app';

type OrgRow = {
  id: string;
  slack_team_id: string;
  timezone: string;
  puzzle_time: string; // HH:MM:SS
  slack_bot_token: string;
};

type UserRow = {
  id: string;
  provider_id: string; // Slack user ID
};

export async function scheduleDailyPuzzleJob(): Promise<void> {
  // Remove existing repeatable jobs first to avoid duplicates on restart
  const repeatableJobs = await dailyPuzzleQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await dailyPuzzleQueue.removeRepeatableByKey(job.key);
  }

  await dailyPuzzleQueue.add(
    'deliver-puzzles',
    {},
    {
      repeat: { cron: '0 9 * * *', tz: 'UTC' },
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );
  console.log('📅 Daily puzzle job scheduled (9:00 AM UTC)');
}

export const dailyPuzzleWorker = new Worker(
  'daily-puzzle',
  async (_job: Job) => {
    const orgs = await db.query<OrgRow>(
      `SELECT id, slack_team_id, timezone, puzzle_time, slack_bot_token
       FROM organizations
       WHERE slack_team_id IS NOT NULL`
    );

    for (const org of orgs.rows) {
      await deliverPuzzlesForOrg(org).catch(async (err: Error) => {
        await db.query(
          `INSERT INTO audit_log (org_id, action, metadata) VALUES ($1, 'job_failure', $2)`,
          [org.id, JSON.stringify({ job: 'daily-puzzle', org: org.id, error: err.message })]
        );
      });
    }
  },
  { connection }
);

async function deliverPuzzlesForOrg(org: OrgRow): Promise<void> {
  const users = await db.query<UserRow>(
    `SELECT id, provider_id FROM users
     WHERE org_id = $1 AND role = 'employee' AND provider_id IS NOT NULL`,
    [org.id]
  );

  for (const user of users.rows) {
    const alreadySent = await redis.get(`puzzle:today:${org.id}:${user.id}`);
    if (alreadySent) continue;

    const puzzle = await selectPuzzle(user.id, org.id);
    if (!puzzle) continue;

    const delivery = await db.query(
      `INSERT INTO puzzle_deliveries (user_id, puzzle_id, status)
       VALUES ($1, $2, 'pending') RETURNING id`,
      [user.id, puzzle.id]
    );
    const deliveryId: string = delivery.rows[0].id;

    await redis.set(`puzzle:today:${org.id}:${user.id}`, puzzle.id, 'EX', 86400);

    await slackApp.client.chat.postMessage({
      token: org.slack_bot_token || process.env.SLACK_BOT_TOKEN,
      channel: user.provider_id,
      text: '🛡️ Your daily security puzzle is ready!',
      blocks: buildPuzzleBlocks(puzzle as any, deliveryId),
    });
  }
}

// Register failure logging
dailyPuzzleWorker.on('failed', async (job, err) => {
  console.error(`Daily puzzle job failed:`, err.message);
  await db.query(
    `INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`,
    [JSON.stringify({ job: job?.name ?? 'unknown', error: err.message })]
  );
});
```

## Register in apps/api/src/index.ts

Add after existing imports:
```typescript
import { scheduleDailyPuzzleJob } from './jobs/dailyPuzzle';

// Inside the async IIFE, after slackApp.start():
await scheduleDailyPuzzleJob();
```

## Testing the job manually (without waiting for 9 AM)

```typescript
// Add to a test script: apps/api/src/scripts/triggerDailyPuzzle.ts
import { dailyPuzzleQueue } from '../jobs/queue';

async function main() {
  await dailyPuzzleQueue.add('deliver-puzzles-test', {}, { jobId: 'manual-test' });
  console.log('Job queued');
  process.exit(0);
}
main().catch(console.error);
```

Run: `pnpm ts-node src/scripts/triggerDailyPuzzle.ts`

**Commit:**
```bash
git add apps/api/src/jobs/dailyPuzzle.ts apps/api/src/index.ts
git commit -m "feat(jobs): add daily puzzle BullMQ repeatable job with per-org delivery"
```

**Update PROGRESS.md:** Check off 1.16. Set Last Completed to "1.16 — dailyPuzzle.ts job".
