import { api, DashboardApiError } from '@/lib/api';
import { requireCisoOrAdmin } from '@/lib/auth-guard';
import { ComplianceExportButton } from '@/components/ComplianceExportButton';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { PhishTrendChart } from '@/components/PhishTrendChart';
import { RiskHeatmap } from '@/components/RiskHeatmap';
import { RiskScoreGauge } from '@/components/RiskScoreGauge';

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
          <div className="flex flex-col gap-3">
            <ComplianceExportButton orgId={orgId} orgName={`Org ${orgId.slice(0, 8)}`} />
            <a
              href={`/api/heatmap/${orgId}/png`}
              download
              className="inline-flex h-10 items-center justify-center rounded-md bg-surface-card-elevated px-[18px] text-button text-body-strong hover:bg-surface-strong"
            >
              Download Heatmap PNG
            </a>
          </div>
        </div>
      </header>

      <RiskHeatmap users={users} />

      <PhishTrendChart data={trend} />

      <LeaderboardTable entries={leaderboard} />
    </main>
  );
}
