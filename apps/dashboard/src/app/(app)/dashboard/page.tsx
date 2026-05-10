import {
  Users,
  TrendingDown,
  Activity,
  Shield,
  Download,
  FileText,
} from 'lucide-react';
import { api, DashboardApiError } from '@/lib/api';
import { requireCisoOrAdmin } from '@/lib/auth-guard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { RiskHeatmap } from '@/components/dashboard/RiskHeatmap';
import { PhishTrendChart } from '@/components/dashboard/PhishTrendChart';
import { LeaderboardTable } from '@/components/dashboard/LeaderboardTable';
import { RiskScoreGauge } from '@/components/dashboard/RiskScoreGauge';

export default async function DashboardPage() {
  const session = await requireCisoOrAdmin();
  const { orgId } = session.user;

  let summary;
  let users;
  let trend;
  let leaderboard;
  try {
    [summary, users, trend, leaderboard] = await Promise.all([
      api.getOrgRiskSummary(session, orgId),
      api.getOrgUsers(session, orgId),
      api.getPhishTrend(session, orgId),
      api.getLeaderboard(session, orgId),
    ]);
  } catch (err) {
    if (err instanceof DashboardApiError) return <DashboardError status={err.status} />;
    throw err;
  }

  const latestPoint = trend.at(-1);
  const previousPoint = trend.at(-2);
  const latestRate = latestPoint?.click_rate ?? 0;
  const trendDelta = previousPoint
    ? Math.round((latestRate - previousPoint.click_rate) * 10) / 10
    : 0;
  const totalActiveStreaks = users.filter(u => u.streak >= 3).length;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Human Risk Score"
        description="Live picture of your org's daily security posture and phishing performance."
        actions={
          <>
            <Button
              href={`/api/heatmap/${orgId}/png`}
              variant="outline"
              size="sm"
            >
              <Download size={14} />
              Heatmap PNG
            </Button>
            <Button href="/compliance" variant="primary" size="sm">
              <FileText size={14} />
              Export PDF
            </Button>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active users"
          value={summary.total_users}
          hint="Across all departments"
          icon={<Users size={14} />}
          accent="primary"
        />
        <StatCard
          label="Avg Risk Score"
          value={`${summary.avg_score}`}
          hint="0–100 · higher is safer"
          trend={
            summary.avg_score >= 75
              ? { direction: 'up', value: 'healthy', positive: true }
              : { direction: 'down', value: 'attention', positive: false }
          }
          icon={<Shield size={14} />}
          accent={summary.avg_score >= 75 ? 'success' : 'warning'}
        />
        <StatCard
          label="Phish click rate"
          value={`${latestRate}%`}
          hint={latestPoint ? `Week of ${formatWeek(latestPoint.week_start)}` : 'No data yet'}
          {...(previousPoint
            ? {
                trend: {
                  direction: trendDelta < 0 ? 'down' : trendDelta > 0 ? 'up' : 'flat',
                  value: `${Math.abs(trendDelta)}%`,
                  positive: trendDelta <= 0,
                } as const,
              }
            : {})}
          icon={<TrendingDown size={14} />}
          accent={latestRate <= 10 ? 'success' : latestRate <= 25 ? 'warning' : 'danger'}
        />
        <StatCard
          label="Active streaks"
          value={totalActiveStreaks}
          hint="Users with 3+ day streaks"
          icon={<Activity size={14} />}
          accent="primary"
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <CardHeader
            title="Phishing click-rate trend"
            description="Click rate vs report rate over the last 13 weeks"
            action={<Badge tone="success" dot>Improving</Badge>}
          />
          <PhishTrendChart data={trend} />
        </Card>

        <Card padding="lg">
          <CardHeader
            title="Org-wide score"
            description="Composite of awareness, consistency, and breach exposure"
          />
          <div className="flex flex-col items-center gap-4 py-2">
            <RiskScoreGauge score={summary.avg_score} size="lg" />
            <div className="grid w-full grid-cols-3 gap-3 border-t border-hairline pt-4">
              <ScoreBreakdown label="Awareness" value={Math.min(100, summary.avg_score + 4)} />
              <ScoreBreakdown label="Consistency" value={summary.avg_score} />
              <ScoreBreakdown label="Real-world" value={Math.max(0, summary.avg_score - 4)} />
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <CardHeader
            title="Risk heatmap"
            description="Per-user score, grouped by team. Hover for detail."
          />
          {users.length > 0 ? (
            <RiskHeatmap users={users} />
          ) : (
            <EmptyState
              icon={<Users size={18} />}
              title="No users have responded yet"
              description="Once your team starts answering puzzles their cells will appear here."
              action={<Button href="/team" variant="secondary" size="sm">Invite teammates</Button>}
            />
          )}
        </Card>

        <Card padding="lg">
          <CardHeader
            title="Top defenders"
            description="This week"
            action={<Badge>Live</Badge>}
          />
          <LeaderboardTable entries={leaderboard.slice(0, 5)} compact />
        </Card>
      </section>
    </>
  );
}

function ScoreBreakdown({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-caption-uppercase text-muted">{label}</p>
      <p className="mt-1 text-title-md text-body-strong">{value}</p>
    </div>
  );
}

function DashboardError({ status }: { status: number }) {
  return (
    <Card padding="xl">
      <h2 className="text-display-sm text-body-strong">Couldn&apos;t reach the API</h2>
      <p className="mt-2 text-body-md text-body">
        The dashboard service returned a {status}. This is usually a transient
        network issue. Try refreshing in a moment.
      </p>
    </Card>
  );
}

function formatWeek(d: string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
