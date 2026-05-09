# Step 1.18: /leaderboard Slash Command

## apps/api/src/bots/slack/commands/leaderboard.ts

```typescript
import { slackApp } from '../app';
import { redis } from '../../../db/redis';
import { db } from '../../../db/client';

slackApp.command('/leaderboard', async ({ command, ack, respond }) => {
  await ack();

  const orgResult = await db.query(
    'SELECT id FROM organizations WHERE slack_team_id = $1',
    [command.team_id]
  );
  if (!orgResult.rows[0]) {
    await respond({ text: 'Organization not found.' });
    return;
  }
  const orgId: string = orgResult.rows[0].id;

  // Top 10 from Redis sorted set (highest score = rank 0)
  const raw = await redis.zrevrange(`leaderboard:${orgId}`, 0, 9, 'WITHSCORES');

  // raw = [userId, score, userId, score, ...]
  const entries: { userId: string; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ userId: raw[i]!, score: parseInt(raw[i + 1]!, 10) });
  }

  if (entries.length === 0) {
    await respond({ text: 'No scores yet this week. Be the first to answer a puzzle! 🛡️' });
    return;
  }

  const userIds = entries.map(e => e.userId);
  const usersResult = await db.query<{ provider_id: string; display_name: string }>(
    'SELECT provider_id, display_name FROM users WHERE provider_id = ANY($1::text[])',
    [userIds]
  );
  const nameMap = new Map(usersResult.rows.map(u => [u.provider_id, u.display_name]));

  const MEDALS = ['🥇', '🥈', '🥉'];
  const lines = entries.map((e, i) => {
    const medal = MEDALS[i] ?? `${i + 1}.`;
    const name = nameMap.get(e.userId) ?? 'Unknown Defender';
    return `${medal} *${name}* — ${e.score} pts`;
  });

  await respond({
    text: '🏆 Top Defenders This Week',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🏆 Top Defenders This Week' },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: lines.join('\n') },
      },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: 'Scores reset every Monday. Answer daily to climb the ranks! _DefendDaily_',
        }],
      },
    ],
    response_type: 'in_channel',
  });
});
```

Register in `apps/api/src/index.ts`: `import './bots/slack/commands/leaderboard';`

## Weekly leaderboard reset (add to queue.ts + a new job)

Leaderboard resets every Monday at midnight. Add to scheduled jobs in Phase 2 when the
nightly job infrastructure is in place. For now, manual reset via Redis CLI:
```bash
redis-cli -u redis://localhost:6379 DEL "leaderboard:<org_id>"
```

**Verify:** In Slack, type `/leaderboard` — should show top 10 or "No scores yet" message.

**Commit:**
```bash
git add apps/api/src/bots/slack/commands/leaderboard.ts apps/api/src/index.ts
git commit -m "feat(slack): implement /leaderboard command with Redis sorted set top-10"
```

**Update PROGRESS.md:** Check off 1.18. Set Last Completed to "1.18 — /leaderboard command".
