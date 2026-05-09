import type { LeaderboardEntry } from '@defenddaily/shared-types';

type Props = {
  entries: LeaderboardEntry[];
  title?: string;
};

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardTable({ entries, title = 'Top Defenders' }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-display-sm font-sans text-body-strong">{title}</h2>

      <div className="overflow-hidden rounded-xl bg-surface-card">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-hairline">
              <th className="px-4 py-3 text-left text-caption-uppercase text-muted">Rank</th>
              <th className="px-4 py-3 text-left text-caption-uppercase text-muted">Defender</th>
              <th className="px-4 py-3 text-right text-caption-uppercase text-muted">Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const rankCell = MEDALS[i] ?? <span className="text-muted">{i + 1}</span>;
              const rowClass =
                i < 3
                  ? 'bg-surface-card-elevated border-b border-hairline last:border-b-0'
                  : 'border-b border-hairline last:border-b-0';
              return (
                <tr key={entry.user_id} className={rowClass}>
                  <td className="px-4 py-3 text-body-md text-body-strong">{rankCell}</td>
                  <td className="px-4 py-3 text-body-md text-body-strong font-medium">
                    {entry.display_name}
                  </td>
                  <td className="px-4 py-3 text-body-md text-right text-primary font-semibold">
                    {entry.score.toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-body-sm text-muted">
                  No scores yet this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
