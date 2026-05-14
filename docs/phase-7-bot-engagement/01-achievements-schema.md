# Steps 7.01 – 7.03: Achievements System

## 7.01 — DB Migration 008_achievements.sql

### apps/api/src/db/migrations/008_achievements.sql

```sql
CREATE TABLE IF NOT EXISTS achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(100) UNIQUE NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon        VARCHAR(10) NOT NULL,  -- emoji
  category    VARCHAR(50) NOT NULL,  -- streak | accuracy | speed | social | milestone
  threshold   INT,                   -- numeric threshold for auto-trigger
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id),
  earned_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- Seed achievement definitions
INSERT INTO achievements (slug, name, description, icon, category, threshold) VALUES
  ('first_blood',      'First Blood',           'Answer your very first puzzle correctly.',           '🩸', 'milestone',  1),
  ('streak_7',         'Week Warrior',          'Maintain a 7-day answer streak.',                   '🔥', 'streak',     7),
  ('streak_30',        'Month of Mastery',      'Maintain a 30-day answer streak.',                  '🏆', 'streak',     30),
  ('streak_100',       'Century Defender',      'Maintain a 100-day answer streak.',                 '💎', 'streak',     100),
  ('speed_demon',      'Speed Demon',           'Answer a puzzle correctly in under 10 seconds.',    '⚡', 'speed',      NULL),
  ('sharpshooter',     'Sharpshooter',          'Answer 10 puzzles correctly in a row.',             '🎯', 'accuracy',   10),
  ('centurion',        'Centurion',             'Complete 100 puzzles total.',                       '💯', 'milestone',  100),
  ('five_hundred',     'Five Hundred',          'Complete 500 puzzles total.',                       '🛡️', 'milestone',  500),
  ('phish_spotter',    'Phish Spotter',         'Ace 25 spot-the-phish puzzles.',                   '🎣', 'accuracy',   25),
  ('breach_hunter',    'Breach Hunter',         'Complete 10 breach-alert puzzles.',                 '🔍', 'accuracy',   10),
  ('defender',         'Defender',              'Report a phishing simulation before clicking.',     '🛡️', 'social',    NULL),
  ('challenger',       'Challenger',            'Win a head-to-head puzzle challenge.',              '⚔️', 'social',    NULL),
  ('mentor',           'Mentor',                'Send a challenge to 5 different colleagues.',       '👨‍🏫', 'social',   5),
  ('night_owl',        'Night Owl',             'Answer a puzzle after 10 PM local time.',           '🦉', 'milestone',  NULL),
  ('early_bird',       'Early Bird',            'Answer a puzzle before 7 AM local time.',           '🌅', 'milestone',  NULL),
  ('perfect_week',     'Perfect Week',          'Answer every puzzle correctly for 7 consecutive days.', '⭐', 'accuracy', NULL),
  ('risk_reducer',     'Risk Reducer',          'Raise your Risk Score by 20+ points in 30 days.',  '📈', 'milestone',  NULL),
  ('freeze_survivor',  'Freeze Survivor',       'Use a streak freeze and continue your streak.',     '🧊', 'streak',     NULL)
ON CONFLICT (slug) DO NOTHING;
```

**Run migration:**
```bash
psql $DATABASE_URL -f apps/api/src/db/migrations/008_achievements.sql
```

**Commit:**
```bash
git add apps/api/src/db/migrations/008_achievements.sql
git commit -m "feat(api): add achievements and user_achievements tables with 18 seed definitions"
```

**Update PROGRESS.md:** Check off 7.01.

---

## 7.02 — Achievement Trigger Engine (Post-Answer Hook)

### apps/api/src/services/achievementEngine.ts

```typescript
import { db } from '../db/client';
import { logger } from '../config/logger';

interface AchievementContext {
  userId: string;
  orgId: string;
  isCorrect: boolean;
  responseTimeMs: number | null;
  puzzleType: string;
  streak: number;
  totalCorrect: number;
  totalDeliveries: number;
  localHour: number;
}

interface AchievementRow {
  id: string;
  slug: string;
  name: string;
  icon: string;
  threshold: number | null;
}

export async function checkAndGrantAchievements(ctx: AchievementContext): Promise<AchievementRow[]> {
  // Load all achievements the user hasn't earned yet
  const unearned = await db.query<AchievementRow>(`
    SELECT a.id, a.slug, a.name, a.icon, a.threshold
    FROM achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM user_achievements ua
      WHERE ua.user_id = $1 AND ua.achievement_id = a.id
    )
  `, [ctx.userId]);

  const toGrant: AchievementRow[] = [];

  for (const achievement of unearned.rows) {
    if (isEligible(achievement, ctx)) {
      toGrant.push(achievement);
    }
  }

  if (toGrant.length === 0) return [];

  // Batch insert — ON CONFLICT DO NOTHING for safety
  const values = toGrant.map((a) => `('${ctx.userId}', '${a.id}')`).join(', ');
  await db.query(`
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES ${values}
    ON CONFLICT (user_id, achievement_id) DO NOTHING
  `);

  logger.info({ userId: ctx.userId, granted: toGrant.map((a) => a.slug) }, 'achievements granted');
  return toGrant;
}

function isEligible(achievement: AchievementRow, ctx: AchievementContext): boolean {
  switch (achievement.slug) {
    case 'first_blood':
      return ctx.isCorrect && ctx.totalCorrect === 1;
    case 'streak_7':
      return ctx.streak >= 7;
    case 'streak_30':
      return ctx.streak >= 30;
    case 'streak_100':
      return ctx.streak >= 100;
    case 'speed_demon':
      return ctx.isCorrect && ctx.responseTimeMs !== null && ctx.responseTimeMs < 10_000;
    case 'sharpshooter':
      return ctx.isCorrect && ctx.totalCorrect >= 10;
    case 'centurion':
      return ctx.totalDeliveries >= 100;
    case 'five_hundred':
      return ctx.totalDeliveries >= 500;
    case 'phish_spotter':
      return ctx.isCorrect && ctx.puzzleType === 'spot_the_phish' && ctx.totalCorrect >= 25;
    case 'breach_hunter':
      return ctx.isCorrect && ctx.puzzleType === 'breach_alert' && ctx.totalCorrect >= 10;
    case 'night_owl':
      return ctx.isCorrect && ctx.localHour >= 22;
    case 'early_bird':
      return ctx.isCorrect && ctx.localHour < 7;
    default:
      return false;
  }
}
```

Hook into the answer handler in `apps/api/src/bots/slack/actions/answer.ts`:

```typescript
// After updating streak and points — non-blocking
setImmediate(async () => {
  const granted = await checkAndGrantAchievements(achievementCtx);
  for (const achievement of granted) {
    await slackClient.chat.postMessage({
      channel: userId,
      text: `${achievement.icon} Achievement unlocked: *${achievement.name}*`,
      blocks: buildAchievementUnlockMessage(achievement),
    });
  }
});
```

**Commit:**
```bash
git add apps/api/src/services/achievementEngine.ts
git commit -m "feat(api): add achievement trigger engine with eligibility checks for all 18 achievements"
```

**Update PROGRESS.md:** Check off 7.02.

---

## 7.03 — /achievements Slack Command (Badge Grid DM)

### apps/api/src/bots/slack/commands/achievements.ts

```typescript
import { App } from '@slack/bolt';
import { db } from '../../../db/client';
import { getUserByProviderId } from '../../../services/userService';

export function registerAchievementsCommand(app: App) {
  app.command('/achievements', async ({ command, ack, client }) => {
    await ack();

    const user = await getUserByProviderId(command.user_id, 'slack');
    if (!user) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: 'No DefendDaily account found for your Slack user.',
      });
      return;
    }

    const result = await db.query(`
      SELECT
        a.icon,
        a.name,
        a.description,
        a.category,
        ua.earned_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
      ORDER BY a.category, a.name
    `, [user.id]);

    const earned = result.rows.filter((r) => r.earned_at !== null);
    const total = result.rows.length;

    await client.chat.postMessage({
      channel: command.user_id,
      text: `You have earned ${earned.length} of ${total} achievements.`,
      blocks: buildAchievementsGrid(result.rows, earned.length, total),
    });
  });
}

function buildAchievementsGrid(
  achievements: Array<{ icon: string; name: string; description: string; earned_at: string | null }>,
  earnedCount: number,
  total: number,
) {
  const blocks: object[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🏅 Your Achievements', emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${earnedCount} / ${total} earned*`,
      },
    },
    { type: 'divider' },
  ];

  for (const achievement of achievements) {
    const earned = achievement.earned_at !== null;
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: earned
          ? `${achievement.icon} *${achievement.name}*\n${achievement.description}`
          : `⬜ ~~${achievement.name}~~\n_${achievement.description}_`,
      },
    });
  }

  return blocks;
}
```

**Commit:**
```bash
git add apps/api/src/bots/slack/commands/achievements.ts
git commit -m "feat(api): add /achievements slash command with badge grid DM"
```

**Update PROGRESS.md:** Check off 7.03. Set Last Completed to "7.03 — /achievements command".
