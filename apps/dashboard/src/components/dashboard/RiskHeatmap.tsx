import type { User } from '@defenddaily/shared-types';
import { bucketBgClass, scoreBucket } from '@/lib/risk-colors';

type Props = {
  users: User[];
  showLegend?: boolean;
};

function groupKey(user: User): string {
  return user.role === 'ciso' || user.role === 'admin' ? 'Leadership' : 'Engineering & Ops';
}

export function RiskHeatmap({ users, showLegend = true }: Props) {
  const groups = users.reduce<Record<string, User[]>>((acc, user) => {
    const key = groupKey(user);
    (acc[key] ??= []).push(user);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([group, groupUsers]) => (
        <div key={group} className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-caption-uppercase text-muted">{group}</h3>
            <span className="text-caption text-muted">{groupUsers.length} members</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
            {groupUsers.map(user => {
              const bucket = scoreBucket(user.risk_score);
              const label = (user.display_name ?? user.email).split(/[ @]/)[0] ?? '';
              return (
                <div
                  key={user.id}
                  className={`${bucketBgClass(bucket)} group relative aspect-square overflow-hidden rounded-md text-canvas-deep transition-all hover:z-10 hover:scale-110 hover:ring-2 hover:ring-body-strong`}
                  title={`${user.display_name ?? user.email}: ${user.risk_score}/100`}
                >
                  <div className="flex h-full flex-col items-center justify-center px-1">
                    <span className="text-title-sm font-semibold leading-none">
                      {user.risk_score}
                    </span>
                    <span className="mt-0.5 truncate text-[10px] leading-none opacity-70">
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {showLegend && (
        <footer className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4 text-caption text-muted">
          <span className="text-caption-uppercase">Legend</span>
          <Legend bucket="green" label="80–100 Healthy" />
          <Legend bucket="amber" label="60–79 Watch" />
          <Legend bucket="orange" label="40–59 At risk" />
          <Legend bucket="red" label="0–39 Critical" />
        </footer>
      )}
    </div>
  );
}

function Legend({
  bucket,
  label,
}: {
  bucket: 'green' | 'amber' | 'orange' | 'red';
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm bg-risk-${bucket}`} />
      {label}
    </span>
  );
}
