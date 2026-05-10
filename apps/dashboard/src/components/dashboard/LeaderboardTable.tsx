import type { LeaderboardEntry } from '@defenddaily/shared-types';

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardTable({
  entries,
  compact = false,
}: {
  entries: LeaderboardEntry[];
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-hairline-strong px-4 py-8 text-center text-body-sm text-muted">
        No scores yet this week. The first to answer takes 🥇.
      </p>
    );
  }

  return (
    <ul className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {entries.map((entry, i) => {
        const initials = entry.display_name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map(s => s[0]?.toUpperCase())
          .join('');
        return (
          <li
            key={entry.user_id}
            className={`flex items-center gap-3 rounded-md border border-hairline ${
              i < 3 ? 'bg-surface-card-elevated' : 'bg-surface-card'
            } px-3 py-2.5`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center text-body-sm font-medium text-muted">
              {MEDALS[i] ?? <span>{i + 1}</span>}
            </span>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-primary/15 text-caption font-semibold text-primary-glow">
              {initials || '·'}
            </span>
            <span className="flex-1 truncate text-body-sm font-medium text-body-strong">
              {entry.display_name}
            </span>
            <span className="font-mono text-body-sm font-semibold text-primary-glow">
              {entry.score.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
