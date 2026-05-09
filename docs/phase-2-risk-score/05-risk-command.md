# Step 2.05: /risk Slash Command

## apps/api/src/bots/slack/commands/risk.ts

```typescript
import { slackApp } from '../app';
import { db } from '../../../db/client';
import { computeRiskScore, scoreToShield, scoreToLabel } from '../../../services/riskScorer';

slackApp.command('/risk', async ({ command, ack, respond }) => {
  await ack();

  const orgResult = await db.query(
    'SELECT id FROM organizations WHERE slack_team_id = $1', [command.team_id]
  );
  if (!orgResult.rows[0]) {
    await respond({ text: 'Organization not found.' });
    return;
  }
  const orgId: string = orgResult.rows[0].id;

  const userResult = await db.query(
    'SELECT id, streak, breach_count FROM users WHERE org_id = $1 AND provider_id = $2',
    [orgId, command.user_id]
  );
  if (!userResult.rows[0]) {
    await respond({ text: 'No data yet — answer your first daily puzzle to get a Risk Score!' });
    return;
  }
  const userId: string = userResult.rows[0].id;

  const { awareness, consistency, realWorldRisk, score } = await computeRiskScore(userId);
  const shield = scoreToShield(score);
  const label = scoreToLabel(score);

  await respond({
    text: `${shield} Your Risk Score: ${score}/100`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${shield} Human Risk Score: ${score}/100 — ${label}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Awareness*\n${awareness}/100` },
          { type: 'mrkdwn', text: `*Consistency*\n${consistency}/100` },
          { type: 'mrkdwn', text: `*Breach Exposure*\n${realWorldRisk}/100` },
          { type: 'mrkdwn', text: `*Streak*\n${userResult.rows[0].streak} days` },
        ],
      },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: score < 60
            ? '⚠️ Your score is below 60 — you\'re now receiving harder puzzles to sharpen your skills.'
            : '✅ Keep answering daily puzzles to maintain your score.',
        }],
      },
    ],
    response_type: 'ephemeral',
  });
});
```

Register: `import './bots/slack/commands/risk';` in index.ts

**Commit:**
```bash
git add apps/api/src/bots/slack/commands/risk.ts
git commit -m "feat(slack): implement /risk command with color-coded score breakdown"
```

**Update PROGRESS.md:** Check off 2.05. Set Last Completed to "2.05 — /risk command".
