import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { api, DashboardApiError } from '@/lib/api';
import { ComplianceExportButton } from '@/components/ComplianceExportButton';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { PhishTrendChart } from '@/components/PhishTrendChart';
import { RiskHeatmap } from '@/components/RiskHeatmap';
import { RiskScoreGauge } from '@/components/RiskScoreGauge';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <main className="mx-auto max-w-[1200px] px-6 py-section">
        <h1 className="text-display-md font-sans text-body-strong mb-4">CISO Dashboard</h1>
        <p className="text-body-md text-body">
          Your account isn&apos;t linked to an organization yet. Finish onboarding via the Slack
          install wizard to continue.
        </p>
      </main>
    );
  }

  let summary;
  let users;
  let trend;
  let leaderboard;
  try {
    [summary, users, trend, leaderboard] = await Promise.all([
      api.getOrgRiskSummary(orgId),
      api.getOrgUsers(orgId),
      api.getPhishTrend(orgId),
      api.getLeaderboard(orgId),
    ]);
  } catch (err) {
    if (err instanceof DashboardApiError) {
      return (
        <main className="mx-auto max-w-[1200px] px-6 py-section">
          <h1 className="text-display-md font-sans text-body-strong mb-4">CISO Dashboard</h1>
          <p className="text-body-md text-semantic-error">
            Couldn&apos;t reach the DefendDaily API ({err.status}). Please try again shortly.
          </p>
        </main>
      );
    }
    throw err;
  }

  return (
    <main className="mx-auto max-w-[1200px] px-6 py-section space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-caption-uppercase text-muted">DefendDaily</p>
          <h1 className="text-display-md font-sans text-body-strong mt-2">CISO Dashboard</h1>
          <p className="text-body-md text-body mt-2">
            {summary.total_users} active {summary.total_users === 1 ? 'user' : 'users'} · org {orgId.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-end gap-8">
          <RiskScoreGauge score={summary.avg_score} label="Avg Risk Score" size="lg" />
          <ComplianceExportButton orgId={orgId} orgName={`Org ${orgId.slice(0, 8)}`} />
        </div>
      </header>

      <RiskHeatmap users={users} />

      <PhishTrendChart data={trend} />

      <LeaderboardTable entries={leaderboard} />
    </main>
  );
}
