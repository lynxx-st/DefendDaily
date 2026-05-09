# Step 4.06: PhishTrendChart.tsx (Recharts)

## Install Recharts

```bash
cd apps/dashboard && pnpm add recharts
```

## apps/dashboard/src/components/PhishTrendChart.tsx

```typescript
'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { PhishTrendPoint } from '@defenddaily/shared-types';

type Props = {
  data: PhishTrendPoint[];
};

function formatWeek(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PhishTrendChart({ data }: Props) {
  const chartData = data.map(d => ({
    week: formatWeek(d.week_start),
    'Click Rate %': d.click_rate,
    'Report Rate %': data.length > 0
      ? Math.round((d.reported / Math.max(d.sent, 1)) * 100)
      : 0,
  }));

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-gray-900">Phish Click Rate (90 days)</h2>
      <p className="text-sm text-gray-500">
        Lower click rate = better. Higher report rate = better.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => `${value}%`} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Click Rate %"
            stroke="#DC2626"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="Report Rate %"
            stroke="#16A34A"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Add to dashboard page alongside RiskHeatmap.

**Commit:**
```bash
git add apps/dashboard/src/components/PhishTrendChart.tsx
git commit -m "feat(dashboard): add Phish Trend Chart with Recharts (click rate vs report rate)"
```

**Update PROGRESS.md:** Check off 4.06. Set Last Completed to "4.06 — PhishTrendChart.tsx".
