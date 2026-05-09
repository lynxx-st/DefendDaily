# Step 4.07: LeaderboardTable.tsx

## apps/dashboard/src/components/LeaderboardTable.tsx

```typescript
type LeaderboardEntry = {
  user_id: string;
  display_name: string;
  score: number;
};

type Props = {
  entries: LeaderboardEntry[];
  title?: string;
};

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardTable({ entries, title = 'Top Defenders' }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Defender</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry, i) => (
              <tr key={entry.user_id} className={i < 3 ? 'bg-amber-50' : ''}>
                <td className="px-4 py-3 text-sm">
                  {MEDALS[i] ?? <span className="text-gray-400">{i + 1}</span>}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {entry.display_name}
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-brand">
                  {entry.score.toLocaleString()}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-sm">
                  No scores yet this week
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/src/components/LeaderboardTable.tsx
git commit -m "feat(dashboard): add LeaderboardTable component with medal rankings"
```

**Update PROGRESS.md:** Check off 4.07. Set Last Completed to "4.07 — LeaderboardTable.tsx".
