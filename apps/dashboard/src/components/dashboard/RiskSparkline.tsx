'use client';

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { RISK_COLORS, scoreBucket } from '@/lib/risk-colors';

export interface SparklinePoint {
  score: number;
  recorded_at?: string;
}

function trend(data: SparklinePoint[]): 'up' | 'down' | 'flat' {
  if (data.length < 2) return 'flat';
  const first = data[0]?.score ?? 0;
  const last = data[data.length - 1]?.score ?? 0;
  const delta = last - first;
  if (delta > 2) return 'up';
  if (delta < -2) return 'down';
  return 'flat';
}

const TREND_ARROW = { up: '↑', down: '↓', flat: '→' } as const;
const TREND_COLOR: Record<string, string> = {
  up: 'text-semantic-success',
  down: 'text-semantic-error',
  flat: 'text-muted',
};

export function RiskSparkline({
  data,
  width = 80,
  height = 32,
  showDelta = false,
}: {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  showDelta?: boolean;
}) {
  const direction = trend(data);
  const lastScore = data[data.length - 1]?.score ?? 0;
  const strokeColor = RISK_COLORS[scoreBucket(lastScore)];

  return (
    <div className="flex items-center gap-2">
      <div style={{ width, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              type="monotone"
              dataKey="score"
              stroke={strokeColor}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive
              animationDuration={600}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                return (
                  <div className="rounded-md border border-hairline bg-surface-card-elevated px-2 py-1 text-caption text-body-strong shadow-lg">
                    {payload[0].value}
                  </div>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {showDelta && (
        <span className={`font-mono text-caption font-medium ${TREND_COLOR[direction]}`}>
          {TREND_ARROW[direction]}
        </span>
      )}
    </div>
  );
}
