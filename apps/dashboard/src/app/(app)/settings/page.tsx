import {
  Building2,
  MessageSquare,
  KeyRound,
  Bell,
  CreditCard,
  Trash2,
} from 'lucide-react';
import { requireCisoOrAdmin } from '@/lib/auth-guard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function SettingsPage() {
  const session = await requireCisoOrAdmin();
  const orgId = session.user.orgId;

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="Workspace, integrations, billing, and danger zone."
        breadcrumbs={[{ href: '/dashboard', label: 'Dashboard' }, { label: 'Settings' }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <CardHeader
            title="Organization"
            description="Display name shown in puzzles, leaderboards, and PDF exports."
            action={<Badge>Admin</Badge>}
          />
          <Field label="Display name">
            <input
              defaultValue={`Org ${orgId.slice(0, 8)}`}
              className="h-11 w-full rounded-md border border-hairline bg-surface-card px-4 text-body-md text-body-strong focus:border-primary focus:outline-none"
            />
          </Field>
          <Field label="Default puzzle time" hint="9:00 AM produces the highest engagement.">
            <select
              defaultValue="09:00"
              className="h-11 w-full rounded-md border border-hairline bg-surface-card px-4 text-body-md text-body-strong focus:border-primary focus:outline-none"
            >
              <option value="08:00">8:00 AM</option>
              <option value="09:00">9:00 AM (Recommended)</option>
              <option value="10:00">10:00 AM</option>
              <option value="12:00">12:00 PM</option>
            </select>
          </Field>
          <Field label="Timezone">
            <select
              defaultValue="America/New_York"
              className="h-11 w-full rounded-md border border-hairline bg-surface-card px-4 text-body-md text-body-strong focus:border-primary focus:outline-none"
            >
              <option>America/New_York</option>
              <option>America/Los_Angeles</option>
              <option>Europe/London</option>
              <option>Asia/Singapore</option>
            </select>
          </Field>
          <div className="mt-6 flex justify-end">
            <Button>Save changes</Button>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="Plan" description="Growth · annual" />
          <div className="rounded-lg border border-hairline-soft bg-surface-card-elevated/40 p-4">
            <p className="text-caption-uppercase text-muted">This billing period</p>
            <p className="mt-1 text-display-sm font-medium text-body-strong">
              482 <span className="text-body-md text-muted">seats</span>
            </p>
            <p className="mt-1 text-body-sm text-body">$4,820 / year</p>
          </div>
          <Button variant="outline" className="mt-4 w-full">
            <CreditCard size={14} />
            Manage billing
          </Button>
        </Card>
      </div>

      <Card padding="lg" className="mt-8">
        <CardHeader
          title="Integrations"
          description="Connections that power the daily puzzle, phishing simulation, and IdP automation."
        />
        <ul className="divide-y divide-hairline">
          <Integration
            icon={<MessageSquare size={16} />}
            name="Slack workspace"
            status="Connected · Acme Slack"
            tone="success"
          />
          <Integration
            icon={<Building2 size={16} />}
            name="Microsoft Teams"
            status="Not connected"
            tone="neutral"
          />
          <Integration
            icon={<KeyRound size={16} />}
            name="Okta · risk-driven MFA"
            status="Enterprise tier required"
            tone="neutral"
          />
          <Integration
            icon={<Bell size={16} />}
            name="HaveIBeenPwned"
            status="Active · weekly scan"
            tone="success"
          />
        </ul>
      </Card>

      <Card padding="lg" className="mt-8 border-semantic-error/30">
        <CardHeader
          title="Danger zone"
          description="These actions are irreversible. Take a deep breath."
        />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-semantic-error/30 bg-semantic-error/5 p-4">
          <div>
            <p className="text-body-sm font-medium text-body-strong">Delete organization</p>
            <p className="text-caption text-body">
              Permanently removes all members, puzzles, scores, and audit history.
            </p>
          </div>
          <Button variant="danger" size="sm">
            <Trash2 size={14} />
            Delete org
          </Button>
        </div>
      </Card>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <label className="mb-2 block text-body-sm font-medium text-body-strong">
        {label}
      </label>
      {children}
      {hint && <p className="mt-2 text-caption text-muted">{hint}</p>}
    </div>
  );
}

function Integration({
  icon,
  name,
  status,
  tone,
}: {
  icon: React.ReactNode;
  name: string;
  status: string;
  tone: 'success' | 'neutral';
}) {
  return (
    <li className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-surface-card-elevated text-body">
          {icon}
        </span>
        <div>
          <p className="text-body-sm font-medium text-body-strong">{name}</p>
          <p className="text-caption text-muted">{status}</p>
        </div>
      </div>
      {tone === 'success' ? (
        <Badge tone="success" dot>
          Connected
        </Badge>
      ) : (
        <Button variant="outline" size="sm">
          Connect
        </Button>
      )}
    </li>
  );
}
