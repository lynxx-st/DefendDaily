'use client';

import CountUp from 'react-countup';
import type { ReactNode } from 'react';

type Trend = { direction: 'up' | 'down' | 'flat'; value: string; positive?: boolean };

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon,
  accent,
  suffix = '',
  prefix = '',
  decimals = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: Trend;
  icon?: ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'danger';
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const accentBar: Record<NonNullable<typeof accent>, string> = {
    primary: 'bg-primary',
    success: 'bg-semantic-success',
    warning: 'bg-risk-amber',
    danger: 'bg-semantic-error',
  };
  const trendColor = trend?.positive
    ? 'text-semantic-success'
    : trend?.positive === false
      ? 'text-semantic-error'
      : 'text-muted';

  const numericValue = typeof value === 'number' ? value : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-hairline bg-surface-card p-5 glow-ring transition-colors hover:bg-surface-card-elevated/40">
      {accent && <span className={`absolute left-0 top-0 h-full w-0.5 ${accentBar[accent]}`} />}
      <div className="flex items-start justify-between">
        <p className="text-caption-uppercase text-muted">{label}</p>
        {icon && <span className="text-muted">{icon}</span>}
      </div>
      <p className="mt-3 text-display-md font-medium text-body-strong leading-none">
        {numericValue !== null ? (
          <CountUp
            end={numericValue}
            duration={1.4}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
            enableScrollSpy
            scrollSpyDelay={100}
            separator=","
          />
        ) : (
          value
        )}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-body-sm text-body">{hint}</p>
        {trend && (
          <span className={`text-body-sm font-medium ${trendColor}`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}{' '}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
