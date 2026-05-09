# Step 4.05: RiskHeatmap.tsx Component

## apps/dashboard/src/components/RiskHeatmap.tsx

```typescript
'use client';

import type { User } from '@defenddaily/shared-types';

type Props = {
  users: User[];
};

function scoreToColor(score: number): string {
  if (score >= 80) return 'bg-risk-green';
  if (score >= 60) return 'bg-yellow-400';
  if (score >= 40) return 'bg-orange-400';
  return 'bg-risk-red';
}

function scoreToTextColor(score: number): string {
  return score >= 40 ? 'text-white' : 'text-white';
}

export function RiskHeatmap({ users }: Props) {
  // Group by role or department (using role as proxy in Phase 4)
  const groups = users.reduce<Record<string, User[]>>((acc, user) => {
    const group = user.role === 'ciso' || user.role === 'admin' ? 'Leadership' : 'Team';
    acc[group] = [...(acc[group] ?? []), user];
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Risk Heatmap</h2>
      {Object.entries(groups).map(([group, groupUsers]) => (
        <div key={group}>
          <h3 className="text-sm font-medium text-gray-500 mb-2">{group}</h3>
          <div className="grid grid-cols-8 gap-1">
            {groupUsers.map(user => (
              <div
                key={user.id}
                className={`${scoreToColor(user.risk_score)} ${scoreToTextColor(user.risk_score)}
                  rounded p-2 text-center cursor-pointer hover:opacity-80 transition-opacity`}
                title={`${user.display_name ?? user.email}: ${user.risk_score}/100`}
              >
                <div className="text-xs font-bold">{user.risk_score}</div>
                <div className="text-xs truncate">{(user.display_name ?? user.email).split(' ')[0]}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-4 text-xs text-gray-500 mt-2">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-risk-green rounded-sm inline-block" /> 80–100</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded-sm inline-block" /> 60–79</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-400 rounded-sm inline-block" /> 40–59</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-risk-red rounded-sm inline-block" /> 0–39</span>
      </div>
    </div>
  );
}
```

Use in `apps/dashboard/src/app/(ciso)/dashboard/page.tsx`:
```typescript
import { auth } from '@/auth';
import { api } from '@/lib/api';
import { RiskHeatmap } from '@/components/RiskHeatmap';

export default async function DashboardPage() {
  const session = await auth();
  const orgId = session?.user?.orgId as string;
  const users = await api.getOrgUsers(orgId);

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">CISO Dashboard</h1>
      <RiskHeatmap users={users} />
    </main>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/src/components/RiskHeatmap.tsx apps/dashboard/src/app/
git commit -m "feat(dashboard): add Risk Heatmap component with color-coded score grid"
```

**Update PROGRESS.md:** Check off 4.05. Set Last Completed to "4.05 — RiskHeatmap.tsx".
