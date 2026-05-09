'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PhishTrendPoint } from '@defenddaily/shared-types';
import { RISK_COLORS } from '@/lib/risk-colors';

type Props = {
  data: PhishTrendPoint[];
};

type ChartRow = {
  week: string;
  'Click Rate %': number;
  'Report Rate %': number;
};

function formatWeek(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PhishTrendChart({ data }: Props) {
  const chartData: ChartRow[] = data.map(d => ({
    week: formatWeek(d.week_start),
    'Click Rate %': d.click_rate,
    'Report Rate %': d.sent > 0 ? Math.round((d.reported / d.sent) * 100) : 0,
  }));

  return (
    <section className="space-y-2">
      <header>
        <h2 className="text-display-sm font-sans text-body-strong">Phish Click Rate</h2>
        <p className="text-body-sm text-body mt-1">
          Lower click rate is better; higher report rate is better.
        </p>
      </header>

      {chartData.length === 0 ? (
        <p className="text-body-sm text-muted">
          No simulations yet — kick off a Peer Phish campaign to populate this chart.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#222222" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week"
              stroke="#888888"
              tick={{ fontSize: 12, fill: '#a8a8a8' }}
              axisLine={{ stroke: '#222222' }}
            />
            <YAxis
              unit="%"
              domain={[0, 100]}
              stroke="#888888"
              tick={{ fontSize: 12, fill: '#a8a8a8' }}
              axisLine={{ stroke: '#222222' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#181818',
                border: '1px solid #333333',
                borderRadius: 8,
                color: '#ffffff',
              }}
              formatter={value => `${value as number}%`}
            />
            <Legend wrapperStyle={{ color: '#a8a8a8', fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="Click Rate %"
              stroke={RISK_COLORS.red}
              strokeWidth={2}
              dot={{ r: 3, fill: RISK_COLORS.red }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="Report Rate %"
              stroke={RISK_COLORS.green}
              strokeWidth={2}
              dot={{ r: 3, fill: RISK_COLORS.green }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
}
