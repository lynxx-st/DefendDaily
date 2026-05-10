'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
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
  if (data.length === 0) {
    return (
      <div className="grid h-72 place-items-center rounded-lg border border-dashed border-hairline-strong text-body-sm text-muted">
        No campaigns yet — once Peer Phish runs, the trend lines appear here.
      </div>
    );
  }

  const chartData: ChartRow[] = data.map(d => ({
    week: formatWeek(d.week_start),
    'Click Rate %': d.click_rate,
    'Report Rate %': d.sent > 0 ? Math.round((d.reported / d.sent) * 100) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="clickFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RISK_COLORS.red} stopOpacity={0.32} />
            <stop offset="100%" stopColor={RISK_COLORS.red} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="reportFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={RISK_COLORS.green} stopOpacity={0.28} />
            <stop offset="100%" stopColor={RISK_COLORS.green} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#222222" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="week"
          stroke="#666666"
          tick={{ fontSize: 11, fill: '#888888' }}
          axisLine={{ stroke: '#222222' }}
          tickLine={false}
        />
        <YAxis
          unit="%"
          domain={[0, 50]}
          stroke="#666666"
          tick={{ fontSize: 11, fill: '#888888' }}
          axisLine={{ stroke: '#222222' }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#181818',
            border: '1px solid #333333',
            borderRadius: 8,
            color: '#ffffff',
            fontSize: 12,
          }}
          labelStyle={{ color: '#a8a8a8' }}
          formatter={value => `${value as number}%`}
        />
        <Legend
          wrapperStyle={{ color: '#a8a8a8', fontSize: 12, paddingTop: 8 }}
          iconType="circle"
        />
        <Area
          type="monotone"
          dataKey="Click Rate %"
          stroke={RISK_COLORS.red}
          strokeWidth={2}
          fill="url(#clickFill)"
        />
        <Area
          type="monotone"
          dataKey="Report Rate %"
          stroke={RISK_COLORS.green}
          strokeWidth={2}
          fill="url(#reportFill)"
        />
        <Line type="monotone" dataKey="Click Rate %" stroke={RISK_COLORS.red} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
