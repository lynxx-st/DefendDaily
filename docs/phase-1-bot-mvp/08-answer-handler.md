# Step 1.15: Answer Handler (Scoring + Streaks)

## Scoring Formula (from CLAUDE.md §5 Module A)

```
Points = (BasePoints × DifficultyMultiplier × SpeedBonus) × StreakMultiplier

BasePoints:          100 (correct) | 0 (incorrect) | -10 (skipped)
DifficultyMultiplier: 1.0 (easy)  | 1.5 (medium)  | 2.0 (hard)
SpeedBonus:          1.5 if < 30s | 1.2 if < 60s  | 1.0 if > 60s
StreakMultiplier:     1 + (streak_days × 0.02), capped at 1.5
```

## Add calcPoints to apps/api/src/services/puzzleEngine.ts

```typescript
export function calcPoints(
  isCorrect: boolean,
  difficulty: 'easy' | 'medium' | 'hard',
  responseTimeMs: number,
  streakDays: number
): number {
  if (!isCorrect) return 0;
  const base = 100;
  const diffMult: Record<string, number> = { easy: 1.0, medium: 1.5, hard: 2.0 };
  const speedBonus = responseTimeMs < 30_000 ? 1.5 : responseTimeMs < 60_000 ? 1.2 : 1.0;
  const streakMult = Math.min(1 + streakDays * 0.02, 1.5);
  return Math.round(base * (diffMult[difficulty] ?? 1.0) * speedBonus * streakMult);
}
```

## apps/api/src/bots/slack/actions/answerHandler.ts

```typescript
import { ButtonAction } from '@slack/bolt';
import { slackApp } from '../app';
import { db } from '../../../db/client';
import { redis } from '../../../db/redis';
import { calcPoints } from '../../../services/puzzleEngine';

slackApp.action('puzzle_answer', async ({ action, body, ack, respond }) => {
  await ack();

  const btn = action as ButtonAction;
  const { deliveryId, answer } = JSON.parse(btn.value) as { deliveryId: string; answer: string };

  const row = await db.query(`
    SELECT
      pd.id, pd.status, pd.user_id, pd.delivered_at,
      p.correct_answer, p.difficulty, p.explanation,
      o.id AS org_id, o.slack_team_id
    FROM puzzle_deliveries pd
    JOIN puzzles p ON pd.puzzle_id = p.id
    JOIN users u ON pd.user_id = u.id
    JOIN organizations o ON u.org_id = o.id
    WHERE pd.id = $1
  `, [deliveryId]);

  if (!row.rows[0]) {
    await respond({ text: 'Puzzle not found.', replace_original: false });
    return;
  }
  const delivery = row.rows[0];

  // Expiry check (24h)
  const ageMs = Date.now() - new Date(delivery.delivered_at).getTime();
  if (ageMs > 86_400_000) {
    await respond({
      text: '⏰ This puzzle has expired. Your next one arrives tomorrow!',
      replace_original: true,
    });
    return;
  }

  // Already answered
  if (delivery.status !== 'pending') {
    await respond({ text: 'You already answered this one! 🛡️', replace_original: false });
    return;
  }

  const isCorrect = answer === delivery.correct_answer;
  const streakKey = `streak:${delivery.user_id}`;
  const streakStr = await redis.get(streakKey);
  const streak = parseInt(streakStr ?? '0', 10);
  const points = calcPoints(isCorrect, delivery.difficulty, ageMs, streak);

  // Persist result
  await db.query(`
    UPDATE puzzle_deliveries
    SET status = $1, is_correct = $2, responded_at = NOW(), response_time_ms = $3, points_earned = $4
    WHERE id = $5
  `, [isCorrect ? 'correct' : 'incorrect', isCorrect, ageMs, points, deliveryId]);

  // Update streak + leaderboard
  if (isCorrect) {
    await redis.set(streakKey, String(streak + 1));
    await redis.zincrby(`leaderboard:${delivery.org_id}`, points, delivery.user_id);
  } else {
    await redis.set(streakKey, '0');
  }

  // Sync streak to Postgres (for persistence across Redis restarts)
  await db.query(
    'UPDATE users SET streak = $1, last_active_date = CURRENT_DATE WHERE id = $2',
    [isCorrect ? streak + 1 : 0, delivery.user_id]
  );

  const resultText = isCorrect
    ? `✅ *Correct!* You earned *${points} points*.\n\n💡 ${delivery.explanation}`
    : `❌ *Not quite.* The answer was: *${delivery.correct_answer}*\n\n💡 ${delivery.explanation}`;

  await respond({
    text: resultText,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: resultText } },
      ...(isCorrect ? [{
        type: 'context' as const,
        elements: [{ type: 'mrkdwn' as const, text: `🔥 Streak: ${streak + 1} days | ⭐ +${points} pts` }],
      }] : []),
    ],
    replace_original: true,
  });
});
```

**Commit:**
```bash
git add apps/api/src/services/puzzleEngine.ts apps/api/src/bots/slack/actions/
git commit -m "feat(slack): implement answer handler with scoring formula and Redis streak tracking"
```

**Update PROGRESS.md:** Check off 1.15. Set Last Completed to "1.15 — answer handler".
