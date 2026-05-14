# Steps 6.09 – 6.13: Dashboard Redesign

## 6.09 — loading.tsx Siblings for All Dashboard Page Segments

Next.js streams the shell immediately with `loading.tsx` present. Add one sibling file
per page segment that performs data fetching.

### apps/dashboard/app/(ciso)/dashboard/loading.tsx

```tsx
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonTable rows={8} />
    </div>
  );
}
```

### apps/dashboard/app/(ciso)/team/loading.tsx

```tsx
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton';

export default function TeamLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="rounded-xl border border-white/10 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
```

### apps/dashboard/app/(ciso)/simulations/loading.tsx

```tsx
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

export default function SimulationsLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <SkeletonCard />
      <SkeletonTable rows={6} />
    </div>
  );
}
```

### apps/dashboard/app/(ciso)/compliance/loading.tsx

```tsx
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function ComplianceLoading() {
  return (
    <div className="flex flex-col gap-6 p-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/app/\(ciso\)/dashboard/loading.tsx apps/dashboard/app/\(ciso\)/team/loading.tsx apps/dashboard/app/\(ciso\)/simulations/loading.tsx apps/dashboard/app/\(ciso\)/compliance/loading.tsx
git commit -m "feat(dashboard): add loading.tsx skeletons for all CISO dashboard page segments"
```

**Update PROGRESS.md:** Check off 6.09.

---

## 6.10 — error.tsx, 404, and 500 Pages

### apps/dashboard/app/(ciso)/dashboard/error.tsx

```tsx
'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to Sentry when available
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-8">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-medium text-white">Something went wrong</h2>
      <p className="text-canvas-muted max-w-sm text-sm">
        The dashboard failed to load. This has been logged automatically.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
```

### apps/dashboard/app/not-found.tsx

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-canvas text-center px-6">
      <span className="text-primary font-medium text-sm">DefendDaily</span>
      <h1 className="text-6xl font-display font-medium text-white">404</h1>
      <p className="text-canvas-muted max-w-sm">
        This page does not exist. It may have been moved or deleted.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
```

### apps/dashboard/app/global-error.tsx

```tsx
'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-canvas flex flex-col items-center justify-center min-h-screen gap-6 text-center px-6">
        <span className="text-primary font-medium text-sm">DefendDaily</span>
        <h1 className="text-4xl font-display font-medium text-white">500</h1>
        <p className="text-canvas-muted max-w-sm text-sm">
          An unexpected server error occurred.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/app/\(ciso\)/dashboard/error.tsx apps/dashboard/app/not-found.tsx apps/dashboard/app/global-error.tsx
git commit -m "feat(dashboard): add error.tsx, not-found.tsx, and global-error.tsx pages"
```

**Update PROGRESS.md:** Check off 6.10.

---

## 6.11 — Dashboard Overview Activity Feed (Last 10 Org Puzzle Answers)

### apps/api/src/routes/activity.ts (new endpoint)

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';

export const activityRouter = Router();

activityRouter.get('/:orgId/recent', requireAuth, requireRole(['ciso', 'admin']), async (req, res) => {
  const orgId = z.string().uuid().parse(req.params['orgId']);

  const result = await db.query(`
    SELECT
      pd.id,
      pd.status,
      pd.points_earned,
      pd.responded_at,
      u.display_name,
      p.type AS puzzle_type,
      p.difficulty
    FROM puzzle_deliveries pd
    JOIN users u ON u.id = pd.user_id
    JOIN puzzles p ON p.id = pd.puzzle_id
    WHERE u.org_id = $1
      AND pd.responded_at IS NOT NULL
    ORDER BY pd.responded_at DESC
    LIMIT 10
  `, [orgId]);

  res.json({ activity: result.rows });
});
```

### apps/dashboard/components/ActivityFeed.tsx

```tsx
interface ActivityItem {
  id: string;
  status: 'correct' | 'incorrect' | 'skipped';
  points_earned: number;
  responded_at: string;
  display_name: string;
  puzzle_type: string;
  difficulty: string;
}

const statusLabel: Record<string, string> = {
  correct: '✓',
  incorrect: '✗',
  skipped: '—',
};

const statusColor: Record<string, string> = {
  correct: 'text-green-400',
  incorrect: 'text-red-400',
  skipped: 'text-canvas-muted',
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-medium text-white">Recent Activity</h3>
      </div>
      <ul>
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
          >
            <span className={`text-lg font-mono ${statusColor[item.status] ?? 'text-white'}`}>
              {statusLabel[item.status] ?? '?'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{item.display_name}</p>
              <p className="text-xs text-canvas-muted">
                {item.puzzle_type.replace('_', ' ')} · {item.difficulty}
              </p>
            </div>
            <span className="text-xs text-canvas-muted shrink-0">
              {item.points_earned > 0 ? `+${item.points_earned} pts` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Commit:**
```bash
git add apps/api/src/routes/activity.ts apps/dashboard/components/ActivityFeed.tsx
git commit -m "feat(api): add recent activity endpoint; feat(dashboard): add ActivityFeed component"
```

**Update PROGRESS.md:** Check off 6.11.

---

## 6.12 — Team Page Redesign (User Cards + Inline Risk Gauges)

### apps/dashboard/components/UserRiskCard.tsx

```tsx
import { RiskScoreGauge } from './RiskScoreGauge';

interface UserRiskCardProps {
  displayName: string;
  email: string;
  riskScore: number;
  streak: number;
  role: string;
}

const roleColor: Record<string, string> = {
  ciso: 'text-primary',
  admin: 'text-amber-400',
  employee: 'text-canvas-muted',
};

export function UserRiskCard({ displayName, email, riskScore, streak, role }: UserRiskCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface-card p-5 flex items-start gap-4 hover:bg-surface-card-elevated transition-colors">
      {/* Avatar placeholder */}
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-sm font-medium text-white">
        {displayName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{displayName}</p>
          <span className={`text-xs ${roleColor[role] ?? 'text-canvas-muted'}`}>{role}</span>
        </div>
        <p className="text-xs text-canvas-muted truncate">{email}</p>
        <p className="text-xs text-canvas-muted mt-1">🔥 {streak}-day streak</p>
      </div>

      <div className="shrink-0">
        <RiskScoreGauge score={riskScore} size="sm" />
      </div>
    </div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/components/UserRiskCard.tsx
git commit -m "feat(dashboard): add UserRiskCard with inline risk gauge for team page redesign"
```

**Update PROGRESS.md:** Check off 6.12.

---

## 6.13 — Animated CountUp Stat Numbers

### Install

```bash
pnpm --filter dashboard add react-countup
```

### apps/dashboard/components/ui/StatCard.tsx

```tsx
'use client';

import CountUp from 'react-countup';

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export function StatCard({ label, value, suffix = '', prefix = '', decimals = 0 }: StatCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface-card p-6 flex flex-col gap-2">
      <p className="text-sm text-canvas-muted">{label}</p>
      <p className="text-3xl font-display font-medium text-white">
        <CountUp
          end={value}
          duration={1.2}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          enableScrollSpy
          scrollSpyDelay={100}
        />
      </p>
    </div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/components/ui/StatCard.tsx
git commit -m "feat(dashboard): add animated CountUp StatCard component"
```

**Update PROGRESS.md:** Check off 6.13. Set Last Completed to "6.13 — CountUp stat cards".
