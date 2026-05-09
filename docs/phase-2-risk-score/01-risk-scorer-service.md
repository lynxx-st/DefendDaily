# Step 2.01: riskScorer.ts Service

## apps/api/src/services/riskScorer.ts

```typescript
import { db } from '../db/client';

export type RiskScoreComponents = {
  awareness: number;    // 0–100
  consistency: number;  // 0–100
  realWorldRisk: number; // 0–100
  score: number;        // 0–100 (final clamped)
};

export async function computeRiskScore(userId: string): Promise<RiskScoreComponents> {
  // Awareness: accuracy over last 30 deliveries
  const deliveryResult = await db.query<{ total: string; correct: string }>(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE is_correct = true) AS correct
    FROM puzzle_deliveries
    WHERE user_id = $1
      AND status IN ('correct', 'incorrect')
      AND delivered_at >= NOW() - INTERVAL '30 days'
  `, [userId]);

  const { total, correct } = deliveryResult.rows[0] ?? { total: '0', correct: '0' };
  const totalNum = parseInt(total, 10);
  const correctNum = parseInt(correct, 10);
  const awareness = totalNum === 0 ? 75 : Math.round((correctNum / totalNum) * 100);

  // Consistency: streak score
  const streakResult = await db.query<{ streak: number; breach_count: number }>(
    'SELECT streak, breach_count FROM users WHERE id = $1',
    [userId]
  );
  const user = streakResult.rows[0];
  if (!user) throw new Error(`User ${userId} not found`);

  const consistency = Math.min(Math.round((user.streak / 30) * 100), 100);

  // Real world risk: breach count from HIBP
  const realWorldRisk = Math.min(user.breach_count * 15, 100);

  // Final score
  const raw = (awareness * 0.4) + (consistency * 0.3) - (realWorldRisk * 0.3);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { awareness, consistency, realWorldRisk, score };
}

export function scoreToShield(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

export function scoreToLabel(score: number): string {
  if (score >= 80) return 'Strong Defender';
  if (score >= 60) return 'Improving';
  if (score >= 40) return 'At Risk';
  return 'High Risk';
}
```

**Commit:**
```bash
git add apps/api/src/services/riskScorer.ts
git commit -m "feat(services): implement Human Risk Score computation formula"
```

**Update PROGRESS.md:** Check off 2.01. Set Last Completed to "2.01 — riskScorer.ts".
