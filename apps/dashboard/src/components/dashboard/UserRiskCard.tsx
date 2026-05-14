import { RISK_COLORS, scoreBucket } from '@/lib/risk-colors';

interface UserRiskCardProps {
  displayName: string;
  email: string;
  riskScore: number;
  streak: number;
  role: string;
  lastActiveDate?: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  ciso: { label: 'CISO', className: 'bg-primary/15 text-primary-glow' },
  admin: { label: 'Admin', className: 'bg-risk-amber/15 text-risk-amber' },
  employee: { label: 'Employee', className: 'bg-surface-card-elevated text-muted' },
};

function avatarGradient(name: string): string {
  const gradients = [
    'from-primary/30 to-primary/10',
    'from-accent-violet/30 to-accent-violet/10',
    'from-accent-cyan/30 to-accent-cyan/10',
    'from-semantic-success/30 to-semantic-success/10',
  ];
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[idx % gradients.length]!;
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

export function UserRiskCard({
  displayName,
  email,
  riskScore,
  streak,
  role,
  lastActiveDate,
}: UserRiskCardProps) {
  const bucket = scoreBucket(riskScore);
  const scoreColor = RISK_COLORS[bucket];
  const roleCfg = ROLE_CONFIG[role] ?? ROLE_CONFIG['employee']!;

  const isActive =
    lastActiveDate
      ? new Date(lastActiveDate).toDateString() === new Date().toDateString()
      : false;

  return (
    <div className="group relative flex items-start gap-4 rounded-xl border border-hairline bg-surface-card p-4 transition-all hover:border-hairline-strong hover:bg-surface-card-elevated glow-ring">
      {/* Active indicator dot */}
      {isActive && (
        <span className="absolute right-4 top-4 h-2 w-2 rounded-pill bg-semantic-success shadow-[0_0_8px_rgba(51,209,122,0.6)]" />
      )}

      {/* Avatar */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-gradient-to-br text-body-sm font-semibold text-body-strong ${avatarGradient(displayName)}`}
      >
        {initials(displayName)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-body-sm font-semibold text-body-strong">
            {displayName}
          </p>
          <span
            className={`shrink-0 rounded-pill px-1.5 py-0.5 text-[10px] font-semibold leading-none ${roleCfg.className}`}
          >
            {roleCfg.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-caption text-muted">{email}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex items-center gap-1 text-caption text-body">
            🔥 <span className="font-medium text-body-strong">{streak}</span>-day streak
          </span>
        </div>
      </div>

      {/* Inline ring score */}
      <div className="shrink-0">
        <ScoreRing score={riskScore} color={scoreColor} />
      </div>
    </div>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const size = 52;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(score, 100)) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#222222"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[11px] font-semibold leading-none text-body-strong">
          {score}
        </span>
      </div>
    </div>
  );
}
