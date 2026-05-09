# Step 1.14: /defend Slash Command

## apps/api/src/services/puzzleEngine.ts (selectPuzzle function)

```typescript
import { db } from '../db/client';
import { redis } from '../db/redis';

export async function selectPuzzle(userId: string, _orgId: string) {
  // Priority: unseen puzzles first, then weighted by difficulty vs user accuracy
  const result = await db.query<{
    id: string; type: string; difficulty: string;
    payload: Record<string, unknown>; correct_answer: string; explanation: string;
  }>(`
    SELECT p.*
    FROM puzzles p
    WHERE p.active = true
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

## apps/api/src/bots/slack/commands/defend.ts

```typescript
import { slackApp } from '../app';
import { db } from '../../../db/client';
import { redis } from '../../../db/redis';
import { buildPuzzleBlocks } from '../messages/puzzleMessage';
import { selectPuzzle } from '../../../services/puzzleEngine';

slackApp.command('/defend', async ({ command, ack, respond }) => {
  await ack();

  const { user_id, team_id } = command;

  const orgResult = await db.query(
    'SELECT id FROM organizations WHERE slack_team_id = $1',
    [team_id]
  );
  if (!orgResult.rows[0]) {
    await respond({ text: 'Organization not found. Please reinstall the app.' });
    return;
  }
  const orgId: string = orgResult.rows[0].id;

  // Upsert user (first /defend creates their record)
  const userResult = await db.query(`
    INSERT INTO users (org_id, email, display_name, provider_id, provider_type)
    VALUES ($1, $2, $3, $4, 'slack')
    ON CONFLICT (org_id, email) DO UPDATE SET provider_id = EXCLUDED.provider_id
    RETURNING id
  `, [orgId, `${user_id}@slack.local`, command.user_name, user_id]);
  const userId: string = userResult.rows[0].id;

  // Check if already received puzzle today
  const alreadySent = await redis.get(`puzzle:today:${orgId}:${userId}`);
  if (alreadySent) {
    await respond({ text: 'You already have today\'s puzzle! Come back tomorrow. 🛡️' });
    return;
  }

  const puzzle = await selectPuzzle(userId, orgId);
  if (!puzzle) {
    await respond({ text: 'No puzzles available right now. Check back soon!' });
    return;
  }

  const delivery = await db.query(
    `INSERT INTO puzzle_deliveries (user_id, puzzle_id, status)
     VALUES ($1, $2, 'pending') RETURNING id`,
    [userId, puzzle.id]
  );
  const deliveryId: string = delivery.rows[0].id;

  await redis.set(`puzzle:today:${orgId}:${userId}`, puzzle.id, 'EX', 86400);

  await respond({
    text: 'Here is your daily security puzzle:',
    blocks: buildPuzzleBlocks(puzzle as any, deliveryId),
    response_type: 'ephemeral',
  });
});
```

**Verify:** In your Slack workspace, type `/defend` — you should receive a puzzle message.

**Commit:**
```bash
git add apps/api/src/bots/slack/commands/defend.ts apps/api/src/services/puzzleEngine.ts
git commit -m "feat(slack): implement /defend slash command for on-demand puzzle delivery"
```

**Update PROGRESS.md:** Check off 1.14. Set Last Completed to "1.14 — /defend command".
