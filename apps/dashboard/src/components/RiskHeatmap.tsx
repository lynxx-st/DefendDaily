import type { User } from '@defenddaily/shared-types';
import { bucketBgClass, scoreBucket } from '@/lib/risk-colors';

type Props = {
  users: User[];
};

function groupKey(user: User): string {
  return user.role === 'ciso' || user.role === 'admin' ? 'Leadership' : 'Team';
}

export function RiskHeatmap({ users }: Props) {
  const groups = users.reduce<Record<string, User[]>>((acc, user) => {
    const key = groupKey(user);
    (acc[key] ??= []).push(user);
    return acc;
  }, {});

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-display-sm font-sans text-body-strong">Risk Heatmap</h2>
        <p className="text-body-sm text-body mt-1">Live Human Risk Score by department.</p>
      </header>

      {Object.entries(groups).map(([group, groupUsers]) => (
        <div key={group} className="space-y-3">
          <h3 className="text-caption-uppercase text-muted">{group}</h3>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {groupUsers.map(user => {
              const bucket = scoreBucket(user.risk_score);
              const label = (user.display_name ?? user.email).split(/[ @]/)[0] ?? '';
              return (
                <div
                  key={user.id}
                  className={`${bucketBgClass(bucket)} rounded-md px-2 py-2 text-center text-canvas-deep`}
                  title={`${user.display_name ?? user.email}: ${user.risk_score}/100`}
                >
                  <div className="text-title-sm font-semibold leading-none">{user.risk_score}</div>
                  <div className="text-caption truncate mt-1">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {users.length === 0 && (
        <p className="text-body-sm text-muted">No users yet — install the Slack bot to begin.</p>
      )}

      <footer className="flex flex-wrap gap-4 text-caption text-muted">
        <Legend bucket="green" label="80–100" />
        <Legend bucket="amber" label="60–79" />
        <Legend bucket="orange" label="40–59" />
        <Legend bucket="red" label="0–39" />
      </footer>
    </section>
  );
}

function Legend({ bucket, label }: { bucket: 'green' | 'amber' | 'orange' | 'red'; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded-sm bg-risk-${bucket}`} />
      {label}
    </span>
  );
}
