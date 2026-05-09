# Step 3.09: /report-phish Command

## apps/api/src/bots/slack/commands/reportPhish.ts

```typescript
import { slackApp } from '../app';
import { db } from '../../../db/client';
import { redis } from '../../../db/redis';

slackApp.command('/report-phish', async ({ command, ack, respond }) => {
  await ack();

  const orgResult = await db.query(
    'SELECT id FROM organizations WHERE slack_team_id = $1', [command.team_id]
  );
  if (!orgResult.rows[0]) { await respond({ text: 'Org not found.' }); return; }
  const orgId: string = orgResult.rows[0].id;

  const userResult = await db.query(
    'SELECT id FROM users WHERE org_id = $1 AND provider_id = $2', [orgId, command.user_id]
  );
  if (!userResult.rows[0]) { await respond({ text: 'User not found.' }); return; }
  const userId: string = userResult.rows[0].id;

  // Check if user has an active phish campaign targeted at them (not yet reported or clicked)
  const campaignResult = await db.query(`
    SELECT id, tracking_token, sender_id FROM phish_campaigns
    WHERE target_id = $1
      AND sent_at > NOW() - INTERVAL '7 days'
      AND reported_at IS NULL
      AND clicked_at IS NULL
    ORDER BY sent_at DESC
    LIMIT 1
  `, [userId]);

  const campaign = campaignResult.rows[0];

  if (!campaign) {
    // No active campaign — still a good habit to report
    await respond({
      text: '✅ Report received! No active simulation found for your account. Stay vigilant — reporting suspicious emails is always the right move.',
      response_type: 'ephemeral',
    });
    return;
  }

  // Mark campaign as reported
  await db.query(
    `UPDATE phish_campaigns SET reported_at = NOW(), outcome = 'reported' WHERE id = $1`,
    [campaign.id]
  );

  // Award Defense Points (more than Attacker Points to incentivize vigilance)
  const defensePoints = 150; // larger than the 50 attacker points for clicks
  await redis.zincrby(`leaderboard:${orgId}`, defensePoints, userId);

  await db.query(
    `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ($1, $2, 'phish_reported', $3)`,
    [orgId, userId, JSON.stringify({ campaignId: campaign.id, points: defensePoints })]
  );

  await respond({
    text: `🛡️ *Excellent! You caught a phishing simulation!*\n\n+${defensePoints} Defense Points awarded to your score.`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🛡️ Phish Successfully Reported!' },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `You identified and reported a simulated phishing attempt before clicking.\n\n*+${defensePoints} Defense Points* added to your score! 🏆`,
        },
      },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: 'In a real attack, reporting saves your entire organization. Great work!',
        }],
      },
    ],
    response_type: 'ephemeral',
  });
});
```

Register: `import './bots/slack/commands/reportPhish';` in index.ts

**Commit:**
```bash
git add apps/api/src/bots/slack/commands/reportPhish.ts
git commit -m "feat(slack): implement /report-phish command with 150 Defense Points reward"
```

**Update PROGRESS.md:** Check off 3.09. Set Last Completed to "3.09 — /report-phish command".
