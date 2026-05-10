import { Mail, Send, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import type { PhishTrendPoint } from '@defenddaily/shared-types';
import { api, DashboardApiError } from '@/lib/api';
import { requireCisoOrAdmin } from '@/lib/auth-guard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { PhishTrendChart } from '@/components/dashboard/PhishTrendChart';

const TEMPLATES = [
  { name: 'Fake Stripe invoice', diff: 'Easy', clicks: '24%' },
  { name: 'IT MFA approval', diff: 'Medium', clicks: '18%' },
  { name: 'HR benefits update', diff: 'Medium', clicks: '14%' },
  { name: 'Package delivery alert', diff: 'Easy', clicks: '31%' },
  { name: 'CEO wire request', diff: 'Hard', clicks: '8%' },
];

export default async function SimulationsPage() {
  const session = await requireCisoOrAdmin();

  let trend: PhishTrendPoint[] = [];
  try {
    trend = await api.getPhishTrend(session, session.user.orgId, 13);
  } catch (err) {
    if (!(err instanceof DashboardApiError)) throw err;
  }

  const totals = trend.reduce(
    (acc, p) => {
      acc.sent += p.sent;
      acc.clicked += p.clicked;
      acc.reported += p.reported;
      return acc;
    },
    { sent: 0, clicked: 0, reported: 0 },
  );
  const clickRate = totals.sent > 0 ? Math.round((totals.clicked / totals.sent) * 100) : 0;
  const reportRate = totals.sent > 0 ? Math.round((totals.reported / totals.sent) * 100) : 0;

  return (
    <>
      <PageHeader
        eyebrow="Phishing"
        title="Simulations"
        description="Peer Phish campaigns sent across your org. Click and report rates over the trailing 13 weeks."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Simulations' }]}
        actions={
          <Button variant="primary" size="sm">
            <Send size={14} />
            New campaign
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Simulations sent"
          value={totals.sent.toLocaleString()}
          hint="Across the last 13 weeks"
          icon={<Mail size={14} />}
          accent="primary"
        />
        <StatCard
          label="Click rate"
          value={`${clickRate}%`}
          hint={clickRate <= 10 ? 'Industry-leading' : 'Above target'}
          icon={<ShieldAlert size={14} />}
          accent={clickRate <= 10 ? 'success' : clickRate <= 25 ? 'warning' : 'danger'}
        />
        <StatCard
          label="Report rate"
          value={`${reportRate}%`}
          hint="Higher is better"
          icon={<ShieldCheck size={14} />}
          accent={reportRate >= 30 ? 'success' : 'warning'}
        />
        <StatCard
          label="Templates available"
          value={TEMPLATES.length}
          hint="Admin-curated · safe-by-default"
          icon={<Sparkles size={14} />}
        />
      </section>

      <Card padding="lg" className="mt-8">
        <CardHeader
          title="Click vs report rate"
          description="Last 13 weeks · the chart your CISO shows at QBR"
          action={<Badge tone="success" dot>Improving</Badge>}
        />
        <PhishTrendChart data={trend} />
      </Card>

      <Card padding="lg" className="mt-8">
        <CardHeader
          title="Template library"
          description="Curated lures with measured baseline click rates"
          action={
            <Button variant="outline" size="sm">
              Browse all
            </Button>
          }
        />
        {TEMPLATES.length === 0 ? (
          <EmptyState
            icon={<Mail size={18} />}
            title="No templates yet"
            description="Templates appear here once your admin imports the starter set."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {TEMPLATES.map(t => (
              <li
                key={t.name}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-card-elevated text-body">
                    <Mail size={14} />
                  </span>
                  <div>
                    <p className="text-body-sm font-medium text-body-strong">{t.name}</p>
                    <p className="text-caption text-muted">Difficulty · {t.diff}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono text-body-sm font-semibold text-semantic-error">
                      {t.clicks}
                    </p>
                    <p className="text-caption text-muted">baseline click</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Send
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
