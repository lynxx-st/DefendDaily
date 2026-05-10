import { RISK_COLORS, scoreBucket } from '@/lib/risk-colors';

type Size = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<Size, { outer: number; stroke: number; font: string; sub: string }> = {
  sm: { outer: 80, stroke: 6, font: 'text-title-md', sub: 'text-caption' },
  md: { outer: 120, stroke: 8, font: 'text-display-md', sub: 'text-body-sm' },
  lg: { outer: 168, stroke: 10, font: 'text-display-lg', sub: 'text-body-md' },
};

export function RiskScoreGauge({
  score,
  size = 'md',
  label,
}: {
  score: number;
  size?: Size;
  label?: string;
}) {
  const bucket = scoreBucket(score);
  const dim = SIZE_PX[size];
  const radius = (dim.outer - dim.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(score, 100)) / 100) * circumference;
  const stroke = RISK_COLORS[bucket];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dim.outer, height: dim.outer }}>
        <svg width={dim.outer} height={dim.outer} viewBox={`0 0 ${dim.outer} ${dim.outer}`}>
          <circle
            cx={dim.outer / 2}
            cy={dim.outer / 2}
            r={radius}
            fill="none"
            stroke="#222222"
            strokeWidth={dim.stroke}
          />
          <circle
            cx={dim.outer / 2}
            cy={dim.outer / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={dim.stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${dim.outer / 2} ${dim.outer / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${dim.font} font-medium text-body-strong leading-none`}>
            {score}
          </span>
          <span className="mt-1 text-caption-uppercase text-muted">/ 100</span>
        </div>
      </div>
      {label && <span className={`${dim.sub} text-muted font-medium`}>{label}</span>}
    </div>
  );
}
