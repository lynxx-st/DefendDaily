# Step 5.05: Guardian Alert Nightly Job

## apps/api/src/jobs/guardianAlert.ts

```typescript
import { Worker, Job } from 'bullmq';
import { guardianAlertQueue, connection } from './queue';
import { db } from '../db/client';
import { slackApp } from '../bots/slack/app';

export async function scheduleGuardianAlertJob(): Promise<void> {
  const existing = await guardianAlertQueue.getRepeatableJobs();
  for (const job of existing) await guardianAlertQueue.removeRepeatableByKey(job.key);

  await guardianAlertQueue.add('check-family-scores', {}, {
    repeat: { cron: '0 3 * * *', tz: 'UTC' }, // 3 AM daily
    removeOnComplete: 10,
  });
  console.log('👨‍👩‍👧 Guardian Alert job scheduled (3 AM UTC daily)');
}

type FamilyMember = {
  member_id: string;
  member_name: string | null;
  member_score: number;
  consecutive_incorrect: string;
  inviter_id: string;
  inviter_provider_id: string;
  family_group_id: string;
};

export const guardianAlertWorker = new Worker(
  'guardian-alert',
  async (_job: Job) => {
    // Find family members whose score dropped below 50 OR failed 3 in a row
    const result = await db.query<FamilyMember>(`
      SELECT
        m.id AS member_id,
        m.display_name AS member_name,
        m.risk_score AS member_score,
        m.family_group_id,
        (
          SELECT COUNT(*)
          FROM puzzle_deliveries pd
          WHERE pd.user_id = m.id
            AND pd.is_correct = false
            AND pd.delivered_at > NOW() - INTERVAL '3 days'
        ) AS consecutive_incorrect,
        inviter.id AS inviter_id,
        inviter.provider_id AS inviter_provider_id
      FROM users m
      JOIN users inviter ON (
        inviter.family_group_id = m.family_group_id
        AND inviter.role = 'employee'
      )
      WHERE m.role IN ('senior', 'child')
        AND m.family_group_id IS NOT NULL
        AND (m.risk_score < 50 OR (
          SELECT COUNT(*) FROM puzzle_deliveries pd
          WHERE pd.user_id = m.id AND pd.is_correct = false
          AND pd.delivered_at > NOW() - INTERVAL '3 days'
        ) >= 3)
    `);

    for (const member of result.rows) {
      try {
        const reason = member.member_score < 50
          ? `Their Risk Score dropped to *${member.member_score}*`
          : `They failed *3 puzzles in a row* recently`;

        await slackApp.client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: member.inviter_provider_id,
          text: `Guardian Alert: ${member.member_name ?? 'A family member'} needs attention`,
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🚨 Guardian Alert — Family Member Needs Help' },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${member.member_name ?? 'A linked family member'}* may need support. ${reason}.\n\nConsider reaching out to help them with their daily security challenges.`,
              },
            },
            {
              type: 'context',
              elements: [{
                type: 'mrkdwn',
                text: 'View family details at your SentryLife dashboard.',
              }],
            },
          ],
        });

        await db.query(
          `INSERT INTO audit_log (user_id, action, metadata) VALUES ($1, 'guardian_alert_sent', $2)`,
          [member.inviter_id, JSON.stringify({ memberId: member.member_id, score: member.member_score })]
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await db.query(
          `INSERT INTO audit_log (action, metadata) VALUES ('job_failure', $1)`,
          [JSON.stringify({ job: 'guardian-alert', error: message })]
        );
      }
    }
  },
  { connection }
);
```

Register `scheduleGuardianAlertJob()` in index.ts.

**Commit:**
```bash
git add apps/api/src/jobs/guardianAlert.ts
git commit -m "feat(jobs): add Guardian Alert nightly job — alerts employees when family scores drop"
```

**Update PROGRESS.md:** Check off 5.05. Set Last Completed to "5.05 — guardianAlert.ts".
