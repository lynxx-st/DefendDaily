# Step 4.04: Dashboard API Client

## apps/dashboard/src/lib/api.ts

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    next: { revalidate: 60 }, // ISR: revalidate dashboard data every 60s
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  getOrgRiskSummary: (orgId: string) =>
    apiFetch<import('@defenddaily/shared-types').OrgRiskSummary>(`/api/orgs/${orgId}/risk-summary`),

  getOrgUsers: (orgId: string) =>
    apiFetch<import('@defenddaily/shared-types').User[]>(`/api/orgs/${orgId}/users`),

  getPhishTrend: (orgId: string, weeks = 13) =>
    apiFetch<import('@defenddaily/shared-types').PhishTrendPoint[]>(
      `/api/orgs/${orgId}/phish-trend?weeks=${weeks}`
    ),

  getLeaderboard: (orgId: string) =>
    apiFetch<{ user_id: string; display_name: string; score: number }[]>(
      `/api/orgs/${orgId}/leaderboard`
    ),
};
```

## Add API routes to apps/api/src/routes/orgs.ts

```typescript
import { Router } from 'express';
import { db } from '../db/client';
import { redis } from '../db/redis';
import { requireRole } from '../middleware/auth';

export const orgsRouter = Router();

// GET /api/orgs/:orgId/risk-summary
orgsRouter.get('/:orgId/risk-summary', requireRole(['ciso', 'admin']), async (req, res) => {
  const { orgId } = req.params;
  const result = await db.query(`
    SELECT
      COUNT(*) AS total_users,
      ROUND(AVG(risk_score)) AS avg_score
    FROM users WHERE org_id = $1
  `, [orgId]);
  res.json({ org_id: orgId, ...result.rows[0] });
});

// GET /api/orgs/:orgId/phish-trend
orgsRouter.get('/:orgId/phish-trend', requireRole(['ciso', 'admin']), async (req, res) => {
  const { orgId } = req.params;
  const weeks = parseInt(String(req.query.weeks ?? '13'), 10);
  const result = await db.query(`
    SELECT
      DATE_TRUNC('week', sent_at) AS week_start,
      COUNT(*) AS sent,
      COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS clicked,
      COUNT(*) FILTER (WHERE reported_at IS NOT NULL) AS reported,
      ROUND(
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::numeric / NULLIF(COUNT(*), 0) * 100, 1
      ) AS click_rate
    FROM phish_campaigns pc
    JOIN users u ON pc.target_id = u.id
    WHERE u.org_id = $1 AND sent_at >= NOW() - ($2 || ' weeks')::INTERVAL
    GROUP BY week_start ORDER BY week_start
  `, [orgId, weeks]);
  res.json(result.rows);
});

// GET /api/orgs/:orgId/leaderboard
orgsRouter.get('/:orgId/leaderboard', requireRole(['ciso', 'admin', 'employee']), async (req, res) => {
  const { orgId } = req.params;
  const raw = await redis.zrevrange(`leaderboard:${orgId}`, 0, 9, 'WITHSCORES');
  const entries: { userId: string; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ userId: raw[i]!, score: parseInt(raw[i + 1]!, 10) });
  }
  const userIds = entries.map(e => e.userId);
  const users = await db.query(
    'SELECT provider_id, display_name FROM users WHERE provider_id = ANY($1::text[])',
    [userIds]
  );
  const nameMap = new Map(users.rows.map(u => [u.provider_id, u.display_name]));
  res.json(entries.map(e => ({
    user_id: e.userId,
    display_name: nameMap.get(e.userId) ?? 'Unknown',
    score: e.score,
  })));
});
```

**Commit:**
```bash
git add apps/dashboard/src/lib/api.ts apps/api/src/routes/orgs.ts
git commit -m "feat(dashboard): add API client and CISO data routes (risk summary, phish trend, leaderboard)"
```

**Update PROGRESS.md:** Check off 4.04. Set Last Completed to "4.04 — API client + routes".
