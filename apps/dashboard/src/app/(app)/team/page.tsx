import { Search, Users, UserPlus, Filter } from 'lucide-react';
import { api, DashboardApiError } from '@/lib/api';
import { requireCisoOrAdmin } from '@/lib/auth-guard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { scoreBucket, bucketTextClass } from '@/lib/risk-colors';

export default async function TeamPage() {
  const session = await requireCisoOrAdmin();

  let users;
  try {
    users = await api.getOrgUsers(session, session.user.orgId);
  } catch (err) {
    if (err instanceof DashboardApiError) {
      return <ErrorState status={err.status} />;
    }
    throw err;
  }

  const sorted = [...users].sort((a, b) => a.risk_score - b.risk_score);
  const atRisk = sorted.filter(u => u.risk_score < 60).length;

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Team"
        description="Per-user Risk Score, streak, and breach exposure. Sorted by lowest score first."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Team' }]}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter size={14} />
              Filter
            </Button>
            <Button variant="primary" size="sm">
              <UserPlus size={14} />
              Invite member
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge>{users.length} total</Badge>
          {atRisk > 0 && (
            <Badge tone="warning" dot>
              {atRisk} need attention
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-hairline bg-surface-card px-3">
          <Search size={14} className="text-muted" />
          <input
            type="search"
            placeholder="Find by name or email"
            className="h-9 w-64 bg-transparent text-body-sm text-body-strong placeholder:text-muted-soft focus:outline-none"
          />
        </div>
      </div>

      {users.length === 0 ? (
        <Card padding="xl">
          <EmptyState
            icon={<Users size={18} />}
            title="No teammates linked yet"
            description="Once your Slack workspace is connected, members appear here automatically as they answer their first puzzle."
            action={
              <Button variant="primary" size="sm">
                <UserPlus size={14} />
                Invite your team
              </Button>
            }
          />
        </Card>
      ) : (
        <Card padding="sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline text-caption-uppercase text-muted">
                <th className="px-4 py-3 text-left font-normal">Member</th>
                <th className="px-4 py-3 text-left font-normal">Role</th>
                <th className="px-4 py-3 text-right font-normal">Risk Score</th>
                <th className="px-4 py-3 text-right font-normal">Streak</th>
                <th className="px-4 py-3 text-right font-normal">Breaches</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(u => {
                const initials = (u.display_name ?? u.email)
                  .split(/[ @]/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(s => s[0]?.toUpperCase())
                  .join('');
                const bucket = scoreBucket(u.risk_score);
                return (
                  <tr
                    key={u.id}
                    className="border-b border-hairline-soft last:border-0 hover:bg-surface-card-elevated/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-pill bg-surface-card-elevated text-caption font-medium text-body-strong">
                          {initials}
                        </span>
                        <div>
                          <p className="text-body-sm font-medium text-body-strong">
                            {u.display_name ?? u.email.split('@')[0]}
                          </p>
                          <p className="text-caption text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-caption-uppercase text-muted capitalize">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono text-body-sm font-semibold ${bucketTextClass(bucket)}`}>
                        {u.risk_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-body-sm text-body">
                      {u.streak > 0 ? `${u.streak}d 🔥` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-body-sm">
                      {u.breach_count > 0 ? (
                        <span className="text-semantic-error">{u.breach_count}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}

function ErrorState({ status }: { status: number }) {
  return (
    <>
      <PageHeader title="Team" />
      <Card padding="xl">
        <p className="text-body-md text-semantic-error">
          Couldn&apos;t load the team list ({status}). Please retry shortly.
        </p>
      </Card>
    </>
  );
}
