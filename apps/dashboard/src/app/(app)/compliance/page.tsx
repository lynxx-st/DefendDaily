import { FileText, ShieldCheck, BookCheck, ScrollText } from 'lucide-react';
import { requireCisoOrAdmin } from '@/lib/auth-guard';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ComplianceExportButton } from '@/components/dashboard/ComplianceExportButton';

const FRAMEWORKS = [
  { name: 'SOC 2 Type II', mapping: 'CC6.7, CC7.2 — security training evidence', state: 'covered' },
  { name: 'HIPAA Security Rule', mapping: '§164.308(a)(5) — workforce awareness', state: 'covered' },
  { name: 'ISO 27001:2022', mapping: 'A.6.3 — security awareness, education', state: 'covered' },
  { name: 'NIST CSF 2.0', mapping: 'PR.AT — Awareness & training', state: 'covered' },
  { name: 'PCI DSS v4.0', mapping: '12.6 — security awareness program', state: 'covered' },
];

const RECENT_EXPORTS = [
  { date: '2026-04-30', period: 'Apr 2026', author: 'Marc Delaney' },
  { date: '2026-03-31', period: 'Mar 2026', author: 'Marc Delaney' },
  { date: '2026-02-29', period: 'Feb 2026', author: 'Marc Delaney' },
];

export default async function CompliancePage() {
  const session = await requireCisoOrAdmin();
  const orgId = session.user.orgId;
  const orgName = `Org ${orgId.slice(0, 8)}`;

  return (
    <>
      <PageHeader
        eyebrow="Evidence"
        title="Compliance"
        description="Generate auditor-ready PDF evidence of your security awareness program in one click."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Compliance' }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <ComplianceExportButton variant="card" orgId={orgId} orgName={orgName} />

        <Card padding="lg" className="lg:col-span-2">
          <CardHeader
            title="Frameworks covered"
            description="The same export satisfies multiple workforce-training control mappings."
            action={<Badge tone="success" dot>5 frameworks</Badge>}
          />
          <ul className="divide-y divide-hairline">
            {FRAMEWORKS.map(fw => (
              <li
                key={fw.name}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-semantic-success/15 text-semantic-success">
                    <ShieldCheck size={16} />
                  </span>
                  <div>
                    <p className="text-body-sm font-medium text-body-strong">{fw.name}</p>
                    <p className="text-caption text-muted">{fw.mapping}</p>
                  </div>
                </div>
                <Badge tone="success">covered</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card padding="lg" className="mt-8">
        <CardHeader
          title="What goes in the PDF"
          description="Server-rendered with @react-pdf/renderer — same audit log as the live dashboard"
        />
        <div className="grid gap-4 md:grid-cols-3">
          <ContentBlock
            icon={<BookCheck size={18} />}
            title="Training summary"
            body="Unique users trained, total interactions, average accuracy, and average Risk Score over the reporting window."
          />
          <ContentBlock
            icon={<ShieldCheck size={18} />}
            title="Phishing results"
            body="Simulations sent, click rate, report rate — formatted for cyber-insurance questionnaires."
          />
          <ContentBlock
            icon={<ScrollText size={18} />}
            title="Signed attestation"
            body="A boilerplate attestation block referencing the org name and reporting period, ready for sign-off."
          />
        </div>
      </Card>

      <Card padding="lg" className="mt-8">
        <CardHeader
          title="Recent exports"
          description="A new PDF is generated on demand — nothing is cached."
        />
        <ul className="divide-y divide-hairline">
          {RECENT_EXPORTS.map(e => (
            <li
              key={e.date}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-card-elevated text-body">
                  <FileText size={14} />
                </span>
                <div>
                  <p className="text-body-sm font-medium text-body-strong">
                    {orgName}_compliance_{e.period.replace(' ', '_')}.pdf
                  </p>
                  <p className="text-caption text-muted">
                    Generated {e.date} · by {e.author}
                  </p>
                </div>
              </div>
              <span className="text-caption text-muted">Re-generate any time</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

function ContentBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-hairline-soft bg-surface-card-elevated/40 p-5">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/15 text-primary-glow">
        {icon}
      </span>
      <p className="mt-3 text-title-sm text-body-strong">{title}</p>
      <p className="mt-1 text-body-sm text-body">{body}</p>
    </div>
  );
}
