# Steps 7.04 – 7.07 + 7.13: Streak Freeze, Boss Challenge, Dept Leaderboard, Stats

## 7.04 — Streak Freeze Tokens

Streak freeze tokens protect a user's streak when they miss a day. Earned automatically
on every 7-day streak milestone. Consumed by `/freeze` before the day's deadline.

### Redis key: `streak_freeze:{user_id}` → integer count

### Earning freeze tokens (add to answer handler post-streak-update)

```typescript
// apps/api/src/services/streakService.ts (add to existing file)
import { redis } from '../db/redis';

export async function maybeGrantFreezeToken(userId: string, streakDays: number): Promise<boolean> {
  // Grant 1 token on every 7-day streak milestone
  if (streakDays > 0 && streakDays % 7 === 0) {
    const key = `streak_freeze:${userId}`;
    const current = await redis.get(key);
    // Cap at 3 tokens
    if (!current || parseInt(current) < 3) {
      await redis.incr(key);
      // Tokens expire in 90 days
      await redis.expire(key, 90 * 86400);
      return true;
    }
  }
  return false;
}
```

### apps/api/src/bots/slack/commands/freeze.ts

```typescript
import { App } from '@slack/bolt';
import { redis } from '../../../db/redis';
import { db } from '../../../db/client';
import { getUserByProviderId } from '../../../services/userService';

export function registerFreezeCommand(app: App) {
  app.command('/freeze', async ({ command, ack, client }) => {
    await ack();

    const user = await getUserByProviderId(command.user_id, 'slack');
    if (!user) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'No DefendDaily account found.',
      });
      return;
    }

    const freezeKey = `streak_freeze:${user.id}`;
    const count = await redis.get(freezeKey);
    const tokens = count ? parseInt(count) : 0;

    if (tokens < 1) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: "You don't have any streak freeze tokens. Earn one by maintaining a 7-day streak!",
      });
      return;
    }

    // Check if today's puzzle is unanswered (pending/skipped)
    const deliveryResult = await db.query(`
      SELECT id, status FROM puzzle_deliveries
      WHERE user_id = $1
        AND delivered_at::date = CURRENT_DATE
        AND status IN ('pending', 'skipped')
      LIMIT 1
    `, [user.id]);

    if (!deliveryResult.rows[0]) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: "No puzzle to freeze today — you've already answered it, or it hasn't been delivered yet.",
      });
      return;
    }

    // Consume the token and mark the delivery as 'frozen' (counts as skipped but preserves streak)
    await redis.decr(freezeKey);
    await db.query(`
      UPDATE puzzle_deliveries SET status = 'frozen' WHERE id = $1
    `, [deliveryResult.rows[0].id]);

    const remaining = tokens - 1;
    await client.chat.postMessage({
      channel: command.user_id,
      text: `🧊 Streak freeze applied! Your ${user.streak}-day streak is safe. ${remaining} freeze token${remaining !== 1 ? 's' : ''} remaining.`,
    });
  });
}
```

**Commit:**
```bash
git add apps/api/src/services/streakService.ts apps/api/src/bots/slack/commands/freeze.ts
git commit -m "feat(api): add streak freeze token system — earn on 7-day milestone, consume with /freeze"
```

**Update PROGRESS.md:** Check off 7.04.

---

## 7.05 — Monthly Boss Challenge Job

### apps/api/src/jobs/bossChallenge.ts

```typescript
import { Queue, Worker } from 'bullmq';
import { redis } from '../db/redis';
import { db } from '../db/client';
import { logger } from '../config/logger';

const bossChallengeQueue = new Queue('boss-challenge', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
  },
});

// Schedule on 1st of each month at 9:00 AM UTC
export async function scheduleBossChallenge() {
  await bossChallengeQueue.add(
    'monthly-boss',
    {},
    {
      repeat: { pattern: '0 9 1 * *' },
    },
  );
}

export const bossChallengeWorker = new Worker(
  'boss-challenge',
  async () => {
    // Select the hardest available puzzle
    const puzzleResult = await db.query(`
      SELECT id FROM puzzles
      WHERE difficulty = 'hard' AND active = true
      ORDER BY RANDOM()
      LIMIT 1
    `);

    const puzzle = puzzleResult.rows[0];
    if (!puzzle) {
      logger.warn('Boss challenge: no hard puzzle found');
      return;
    }

    // Get all active orgs
    const orgsResult = await db.query(`SELECT id, slack_team_id FROM organizations WHERE slack_team_id IS NOT NULL`);

    for (const org of orgsResult.rows) {
      const usersResult = await db.query(
        'SELECT id, provider_id FROM users WHERE org_id = $1 AND provider_type = $2',
        [org.id, 'slack'],
      );

      for (const user of usersResult.rows) {
        await bossChallengeQueue.add('deliver-boss-puzzle', {
          userId: user.id,
          providerId: user.provider_id,
          puzzleId: puzzle.id,
          orgId: org.id,
          multiplier: 2,
        });
      }
    }

    logger.info({ puzzleId: puzzle.id, orgCount: orgsResult.rows.length }, 'boss challenge dispatched');
  },
  { connection: redis, concurrency: 5, timeout: 30_000 },
);
```

**Commit:**
```bash
git add apps/api/src/jobs/bossChallenge.ts
git commit -m "feat(api): add monthly boss challenge BullMQ job with 2x point multiplier"
```

**Update PROGRESS.md:** Check off 7.05.

---

## 7.06 — Team vs Team Department Leaderboard

### apps/api/src/routes/leaderboard.ts (add dept endpoint)

```typescript
// GET /api/orgs/:orgId/leaderboard/departments
leaderboardRouter.get('/:orgId/departments', requireAuth, async (req, res) => {
  const orgId = z.string().uuid().parse(req.params['orgId']);

  // Users grouped by department (from display_name prefix convention or a future dept column)
  // For now, group by the first segment of email domain
  const result = await db.query(`
    WITH weekly_scores AS (
      SELECT
        u.id AS user_id,
        split_part(u.email, '@', 2) AS dept_key,
        COALESCE(SUM(pd.points_earned), 0) AS user_points
      FROM users u
      LEFT JOIN puzzle_deliveries pd ON pd.user_id = u.id
        AND pd.responded_at >= NOW() - INTERVAL '7 days'
      WHERE u.org_id = $1
      GROUP BY u.id, u.email
    )
    SELECT
      dept_key,
      COUNT(*) AS member_count,
      SUM(user_points) AS total_points,
      ROUND(AVG(user_points), 0) AS avg_points
    FROM weekly_scores
    GROUP BY dept_key
    ORDER BY total_points DESC
    LIMIT 10
  `, [orgId]);

  res.json({ departments: result.rows });
});
```

### Slack command: /dept-leaderboard

```typescript
app.command('/dept-leaderboard', async ({ command, ack, client, context }) => {
  await ack();
  const org = await getOrgBySlackTeamId(context.teamId);
  const response = await fetch(`${env.API_BASE_URL}/api/orgs/${org.id}/leaderboard/departments`);
  const { departments } = await response.json();

  const lines = departments.map((dept: { dept_key: string; total_points: number; member_count: number }, i: number) =>
    `${i + 1}. *${dept.dept_key}* — ${dept.total_points} pts (${dept.member_count} members)`,
  );

  await client.chat.postMessage({
    channel: command.channel_id,
    text: 'Department Leaderboard (this week)',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🏢 Department Leaderboard — This Week', emoji: true },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: lines.join('\n') || '_No data yet._' },
      },
    ],
  });
});
```

**Commit:**
```bash
git add apps/api/src/routes/leaderboard.ts
git commit -m "feat(api): add department leaderboard endpoint and /dept-leaderboard Slack command"
```

**Update PROGRESS.md:** Check off 7.06.

---

## 7.07 — /stats Command (Personal Deep Stats)

### apps/api/src/bots/slack/commands/stats.ts

```typescript
import { App } from '@slack/bolt';
import { db } from '../../../db/client';
import { getUserByProviderId } from '../../../services/userService';

export function registerStatsCommand(app: App) {
  app.command('/stats', async ({ command, ack, client }) => {
    await ack();

    const user = await getUserByProviderId(command.user_id, 'slack');
    if (!user) return;

    const [accuracy, typeBreakdown, rankResult] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'correct')::float /
            NULLIF(COUNT(*) FILTER (WHERE status IN ('correct', 'incorrect')), 0) * 100 AS accuracy_pct,
          COUNT(*) FILTER (WHERE status = 'correct') AS correct_count,
          COUNT(*) AS total_count
        FROM puzzle_deliveries WHERE user_id = $1
      `, [user.id]),

      db.query(`
        SELECT p.type,
          COUNT(*) FILTER (WHERE pd.status = 'correct')::float /
            NULLIF(COUNT(*) FILTER (WHERE pd.status IN ('correct', 'incorrect')), 0) * 100 AS accuracy_pct,
          COUNT(*) FILTER (WHERE pd.status IN ('correct', 'incorrect')) AS attempts
        FROM puzzle_deliveries pd
        JOIN puzzles p ON p.id = pd.puzzle_id
        WHERE pd.user_id = $1
        GROUP BY p.type
      `, [user.id]),

      db.query(`
        SELECT COUNT(*) + 1 AS rank
        FROM users
        WHERE org_id = $1 AND risk_score > $2
      `, [user.org_id, user.risk_score]),
    ]);

    const stats = accuracy.rows[0];
    const breakdown = typeBreakdown.rows;
    const rank = rankResult.rows[0]?.rank ?? '—';

    const breakdownLines = breakdown.map((row: { type: string; accuracy_pct: number; attempts: number }) =>
      `• ${row.type.replace('_', ' ')}: ${Math.round(row.accuracy_pct ?? 0)}% (${row.attempts} attempts)`,
    );

    await client.chat.postMessage({
      channel: command.user_id,
      text: 'Your DefendDaily stats',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📊 Your Stats', emoji: true },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Overall Accuracy*\n${Math.round(stats.accuracy_pct ?? 0)}%` },
            { type: 'mrkdwn', text: `*Puzzles Completed*\n${stats.total_count}` },
            { type: 'mrkdwn', text: `*Current Streak*\n${user.streak} days 🔥` },
            { type: 'mrkdwn', text: `*Longest Streak*\n${user.longest_streak} days` },
            { type: 'mrkdwn', text: `*Risk Score*\n${user.risk_score} / 100` },
            { type: 'mrkdwn', text: `*Org Rank*\n#${rank}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Accuracy by puzzle type:*\n${breakdownLines.join('\n') || '_No data yet._'}`,
          },
        },
      ],
    });
  });
}
```

**Commit:**
```bash
git add apps/api/src/bots/slack/commands/stats.ts
git commit -m "feat(api): add /stats command with accuracy by puzzle type, streak, and org rank"
```

**Update PROGRESS.md:** Check off 7.07.

---

## 7.13 — Boss Challenge Block Kit UI (Cinematic Reveal, Live Countdown)

### apps/api/src/bots/slack/messages/bossChallenge.ts

```typescript
interface BossChallengePayload {
  puzzleId: string;
  question: string;
  options: Array<{ id: string; text: string }>;
  endsAt: string; // ISO timestamp — end of day
}

export function buildBossChallengeMessage(payload: BossChallengePayload) {
  const endsAt = new Date(payload.endsAt);
  const deadline = `<!date^${Math.floor(endsAt.getTime() / 1000)}^{date_short_pretty} at {time}|${endsAt.toISOString()}>`;

  return {
    text: '🔥 BOSS CHALLENGE — 2× points today only!',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '⚔️  BOSS CHALLENGE', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Today only — 2× points on every correct answer.*\nThe hardest puzzle of the month. Prove you belong on the leaderboard.\n\n⏰ Ends: ${deadline}`,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${payload.question}*` },
      },
      {
        type: 'actions',
        elements: payload.options.map((opt) => ({
          type: 'button',
          text: { type: 'plain_text', text: opt.text, emoji: true },
          action_id: `boss_answer_${opt.id}`,
          value: JSON.stringify({ puzzleId: payload.puzzleId, answerId: opt.id }),
        })),
      },
    ],
  };
}
```

**Commit:**
```bash
git add apps/api/src/bots/slack/messages/bossChallenge.ts
git commit -m "feat(api): add boss challenge Block Kit message builder with cinematic reveal and deadline"
```

**Update PROGRESS.md:** Check off 7.13. Set Last Completed to "7.13 — boss challenge UI".
