import { formatDistanceToNow } from 'date-fns';

export interface ActivityItem {
  id: string;
  status: 'correct' | 'incorrect' | 'skipped' | 'expired';
  points_earned: number;
  responded_at: string;
  display_name: string;
  puzzle_type: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const STATUS_CONFIG = {
  correct: { label: '✓', bg: 'bg-semantic-success/10', text: 'text-semantic-success', border: 'border-semantic-success/20' },
  incorrect: { label: '✗', bg: 'bg-semantic-error/10', text: 'text-semantic-error', border: 'border-semantic-error/20' },
  skipped: { label: '—', bg: 'bg-muted/10', text: 'text-muted', border: 'border-muted/20' },
  expired: { label: '○', bg: 'bg-muted/10', text: 'text-muted-soft', border: 'border-muted/10' },
} as const;

const DIFFICULTY_DOT: Record<string, string> = {
  easy: 'bg-semantic-success',
  medium: 'bg-risk-amber',
  hard: 'bg-semantic-error',
};

const PUZZLE_LABELS: Record<string, string> = {
  spot_the_phish: 'Spot the Phish',
  true_false: 'True / False',
  scenario: 'Scenario',
  breach_alert: 'Breach Alert',
};

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();
}

function avatarColor(name: string): string {
  const colors = [
    'bg-primary/20 text-primary-glow',
    'bg-accent-violet/20 text-accent-violet',
    'bg-accent-cyan/20 text-accent-cyan',
    'bg-semantic-success/20 text-semantic-success',
  ];
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[idx % colors.length]!;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-hairline bg-surface-card py-12 text-center">
        <p className="text-body-sm text-muted">No activity yet today.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-surface-card">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <h3 className="text-title-sm text-body-strong">Recent Activity</h3>
        <span className="rounded-pill bg-surface-card-elevated px-2 py-0.5 font-mono text-caption text-muted">
          live
        </span>
      </div>

      <ul>
        {items.map(item => {
          const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.skipped;
          return (
            <li
              key={item.id}
              className="flex items-center gap-3.5 border-b border-hairline/50 px-4 py-3.5 last:border-0 hover:bg-surface-card-elevated/40 transition-colors"
            >
              {/* Status badge */}
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-mono text-body-sm font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}
              >
                {cfg.label}
              </span>

              {/* Avatar */}
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-caption font-semibold ${avatarColor(item.display_name)}`}
              >
                {initials(item.display_name)}
              </span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium text-body-strong">
                  {item.display_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-pill ${DIFFICULTY_DOT[item.difficulty] ?? 'bg-muted'}`}
                  />
                  <p className="text-caption text-muted">
                    {PUZZLE_LABELS[item.puzzle_type] ?? item.puzzle_type}
                  </p>
                </div>
              </div>

              {/* Points + time */}
              <div className="shrink-0 text-right">
                {item.points_earned > 0 && (
                  <p className="text-body-sm font-medium text-semantic-success">
                    +{item.points_earned}
                  </p>
                )}
                <p className="text-caption text-muted">
                  {formatDistanceToNow(new Date(item.responded_at), { addSuffix: true })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
