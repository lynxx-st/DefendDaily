import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';

export default function FamilyPage() {
  return (
    <>
      <FamilyHero />

      <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Members Linked"
          value="0 / 5"
          hint="Up to five family members"
          accent="primary"
        />
        <StatCard
          label="Avg Family Risk Score"
          value="—"
          hint="Updates after first member joins"
          accent="warning"
        />
        <StatCard
          label="Guardian Alerts"
          value="0"
          hint="Triggers when scores drop below 50"
          accent="success"
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card padding="lg">
          <CardHeader
            title="Linked accounts"
            description="Family members appear here once they accept your SentryLife invite."
            action={
              <Badge tone="neutral" uppercase>
                7-day invite expiry
              </Badge>
            }
          />
          <EmptyState
            icon={<HouseGlyph />}
            title="No family members yet"
            description="Send an invite link from the panel on the right. They'll get the same daily training that defends your workplace — calibrated for home life."
          />
        </Card>

        <aside>
          <div
            className="relative overflow-hidden rounded-xl border border-hairline bg-surface-card p-6"
            style={{
              backgroundImage:
                'radial-gradient(circle at top right, rgba(123,58,237,0.18) 0%, transparent 60%)',
            }}
          >
            <p className="text-caption-uppercase text-muted">Invite a family member</p>
            <h3 className="mt-2 text-display-sm font-medium text-body-strong">
              Protect someone you love
            </h3>
            <p className="mt-2 text-body-sm text-body">
              Generate a one-time link. They join with their own email — no app store, no install.
            </p>

            <div className="mt-5 space-y-3">
              <RoleChooser />
              <Button
                variant="primary"
                className="w-full bg-sentrylife hover:bg-sentrylife-active"
              >
                Generate invite link
              </Button>
            </div>

            <p className="mt-4 text-caption text-muted">
              Invites expire after 7 days. You can revoke them anytime.
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-hairline bg-surface-card p-5">
            <p className="text-caption-uppercase text-muted">What they get</p>
            <ul className="mt-3 space-y-2.5 text-body-sm text-body">
              <li className="flex items-start gap-2.5">
                <Dot />
                Daily 60-second security puzzle
              </li>
              <li className="flex items-start gap-2.5">
                <Dot />
                Weekly breach scan via HaveIBeenPwned
              </li>
              <li className="flex items-start gap-2.5">
                <Dot />
                Home Defense canary token kit
              </li>
              <li className="flex items-start gap-2.5">
                <Dot />
                Friendly family leaderboard
              </li>
            </ul>
          </div>
        </aside>
      </section>

      <section className="mt-8">
        <Card padding="lg">
          <CardHeader
            title="Recent activity"
            description="Family member streaks, alerts, and breach notifications."
          />
          <div className="rounded-lg border border-dashed border-hairline-strong bg-surface-card/40 px-6 py-10 text-center">
            <p className="text-body-sm text-muted">
              Activity will appear here once a family member completes their first puzzle.
            </p>
          </div>
        </Card>
      </section>
    </>
  );
}

function FamilyHero() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-hairline bg-surface-card px-8 py-12 lg:px-12 lg:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[860px] -translate-x-1/2 -translate-y-1/3"
        style={{
          background:
            'radial-gradient(closest-side, rgba(123,58,237,0.32) 0%, rgba(123,58,237,0.14) 32%, rgba(123,58,237,0.04) 60%, transparent 75%)',
        }}
      />
      <div className="relative max-w-2xl">
        <Badge tone="neutral" uppercase dot>
          <span className="text-sentrylife">SentryLife</span>
        </Badge>
        <h1 className="mt-4 text-display-xl font-medium leading-[1.05] tracking-tight text-body-strong">
          Family Security Hub
        </h1>
        <p className="mt-4 max-w-xl text-body-md text-body">
          Extend the same daily training that defends your workplace to parents, partners, and kids
          — without another app to install.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button
            variant="primary"
            className="bg-sentrylife hover:bg-sentrylife-active"
          >
            + Invite Family Member
          </Button>
          <Button variant="outline" href="/sentrylife/home-defense">
            Set up Home Defense
          </Button>
        </div>
      </div>
    </section>
  );
}

function RoleChooser() {
  const roles = [
    { value: 'senior', label: 'Senior', hint: 'Parent / grandparent' },
    { value: 'child', label: 'Child', hint: 'Under 18' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {roles.map((role, i) => (
        <label
          key={role.value}
          className={`cursor-pointer rounded-md border bg-surface-card-elevated px-3 py-2.5 text-left transition-colors hover:border-sentrylife/60 ${
            i === 0 ? 'border-sentrylife' : 'border-hairline'
          }`}
        >
          <input
            type="radio"
            name="invite-role"
            value={role.value}
            defaultChecked={i === 0}
            className="sr-only"
          />
          <div className="text-body-sm font-medium text-body-strong">{role.label}</div>
          <div className="text-caption text-muted">{role.hint}</div>
        </label>
      ))}
    </div>
  );
}

function Dot() {
  return (
    <span
      aria-hidden="true"
      className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-pill bg-sentrylife"
    />
  );
}

function HouseGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M4 11l8-6 8 6v8a2 2 0 01-2 2h-3v-6h-6v6H6a2 2 0 01-2-2v-8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
