# Steps 6.17 – 6.20: Onboarding, Settings, and Visual Regression Tests

## 6.17 — Multi-Step Onboarding Wizard with Progress Bar

### apps/dashboard/app/(auth)/setup/OnboardingWizard.tsx

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = [
  { id: 1, label: 'Workspace' },
  { id: 2, label: 'Schedule' },
  { id: 3, label: 'Team' },
  { id: 4, label: 'Done' },
] as const;

interface OrgSettings {
  timezone: string;
  puzzleTime: string;
  plan: string;
}

export function OnboardingWizard({ orgId }: { orgId: string }) {
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<OrgSettings>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    puzzleTime: '09:00',
    plan: 'starter',
  });
  const router = useRouter();

  async function saveAndContinue(updates: Partial<OrgSettings>) {
    const merged = { ...settings, ...updates };
    setSettings(merged);

    if (step === 3) {
      await fetch(`/api/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      setStep(4);
    } else {
      setStep((s) => s + 1);
    }
  }

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6">
      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((s) => (
            <span
              key={s.id}
              className={`text-xs font-medium transition-colors ${
                s.id <= step ? 'text-primary' : 'text-canvas-muted'
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="w-full max-w-md bg-surface-card rounded-xl border border-white/10 p-8">
        {step === 1 && <WorkspaceStep onNext={saveAndContinue} />}
        {step === 2 && (
          <ScheduleStep
            timezone={settings.timezone}
            puzzleTime={settings.puzzleTime}
            onNext={saveAndContinue}
          />
        )}
        {step === 3 && <PlanStep plan={settings.plan} onNext={saveAndContinue} />}
        {step === 4 && (
          <DoneStep onGoToDashboard={() => router.push('/dashboard')} />
        )}
      </div>
    </div>
  );
}

function WorkspaceStep({ onNext }: { onNext: (u: Partial<OrgSettings>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-medium text-white">Welcome to DefendDaily</h2>
        <p className="text-sm text-canvas-muted mt-1">
          Let&apos;s get your workspace set up. This takes about 2 minutes.
        </p>
      </div>
      <button
        onClick={() => onNext({})}
        className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Get started
      </button>
    </div>
  );
}

function ScheduleStep({
  timezone,
  puzzleTime,
  onNext,
}: {
  timezone: string;
  puzzleTime: string;
  onNext: (u: Partial<OrgSettings>) => void;
}) {
  const [tz, setTz] = useState(timezone);
  const [time, setTime] = useState(puzzleTime);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-medium text-white">Daily puzzle schedule</h2>
        <p className="text-sm text-canvas-muted mt-1">
          When should we deliver the daily challenge to your team?
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-canvas-muted mb-1">Delivery time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-10 w-full rounded-md bg-surface-card-elevated border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm text-canvas-muted mb-1">Timezone</label>
          <input
            type="text"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="h-10 w-full rounded-md bg-surface-card-elevated border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <button
        onClick={() => onNext({ timezone: tz, puzzleTime: time })}
        className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}

function PlanStep({
  plan,
  onNext,
}: {
  plan: string;
  onNext: (u: Partial<OrgSettings>) => void;
}) {
  const [selected, setSelected] = useState(plan);
  const plans = [
    { id: 'starter', label: 'Starter', price: '$6/user/year' },
    { id: 'growth', label: 'Growth', price: '$10/user/year' },
    { id: 'enterprise', label: 'Enterprise', price: '$14/user/year' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-medium text-white">Choose your plan</h2>
        <p className="text-sm text-canvas-muted mt-1">
          You&apos;ll start with a 14-day free trial. No credit card required.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {plans.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={[
              'flex items-center justify-between h-12 px-4 rounded-md border text-sm transition-colors',
              selected === p.id
                ? 'border-primary bg-primary/10 text-white'
                : 'border-white/10 text-white/80 hover:border-white/20',
            ].join(' ')}
          >
            <span>{p.label}</span>
            <span className="text-canvas-muted">{p.price}</span>
          </button>
        ))}
      </div>
      <button
        onClick={() => onNext({ plan: selected })}
        className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Start free trial
      </button>
    </div>
  );
}

function DoneStep({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
        🛡️
      </div>
      <div>
        <h2 className="text-xl font-medium text-white">You&apos;re set up!</h2>
        <p className="text-sm text-canvas-muted mt-1">
          Your team will receive their first challenge tomorrow at the scheduled time.
        </p>
      </div>
      <button
        onClick={onGoToDashboard}
        className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Go to dashboard
      </button>
    </div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/app/\(auth\)/setup/OnboardingWizard.tsx
git commit -m "feat(dashboard): add multi-step onboarding wizard with progress bar"
```

**Update PROGRESS.md:** Check off 6.17.

---

## 6.18 — Settings Page Redesign (Tabs: General / Integrations / Billing / Notifications)

### Install

```bash
pnpm --filter dashboard add @radix-ui/react-tabs
```

### apps/dashboard/app/(ciso)/settings/page.tsx

```tsx
import { SettingsTabs } from '@/components/settings/SettingsTabs';

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-display font-medium text-white mb-6">Settings</h1>
      <SettingsTabs />
    </div>
  );
}
```

### apps/dashboard/components/settings/SettingsTabs.tsx

```tsx
'use client';

import * as Tabs from '@radix-ui/react-tabs';
import { GeneralSettings } from './GeneralSettings';
import { IntegrationSettings } from './IntegrationSettings';
import { BillingSettings } from './BillingSettings';
import { NotificationSettings } from './NotificationSettings';

export function SettingsTabs() {
  return (
    <Tabs.Root defaultValue="general">
      <Tabs.List className="flex items-center gap-1 border-b border-white/10 mb-8">
        {(['general', 'integrations', 'billing', 'notifications'] as const).map((tab) => (
          <Tabs.Trigger
            key={tab}
            value={tab}
            className="px-4 py-2 text-sm capitalize text-canvas-muted border-b-2 border-transparent transition-colors data-[state=active]:border-primary data-[state=active]:text-white hover:text-white"
          >
            {tab}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="general"><GeneralSettings /></Tabs.Content>
      <Tabs.Content value="integrations"><IntegrationSettings /></Tabs.Content>
      <Tabs.Content value="billing"><BillingSettings /></Tabs.Content>
      <Tabs.Content value="notifications"><NotificationSettings /></Tabs.Content>
    </Tabs.Root>
  );
}
```

Each sub-component (`GeneralSettings`, etc.) is a Server Component that fetches the
relevant org settings and renders a form. Form submissions use Next.js Server Actions
with `revalidatePath('/dashboard/settings')`.

**Commit:**
```bash
git add apps/dashboard/app/\(ciso\)/settings/ apps/dashboard/components/settings/
git commit -m "feat(dashboard): add tabbed settings page (General / Integrations / Billing / Notifications)"
```

**Update PROGRESS.md:** Check off 6.18.

---

## 6.19 — Risk Score Trend Sparkline Chart (7-Day Inline Chart per User on Team Page)

### Install

```bash
pnpm --filter dashboard add recharts
```

### apps/dashboard/components/RiskSparkline.tsx

```tsx
'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparklinePoint {
  score: number;
}

interface RiskSparklineProps {
  data: SparklinePoint[];
  trend: 'up' | 'down' | 'flat';
}

const trendColor = {
  up: '#22c55e',
  down: '#ef4444',
  flat: '#6b7280',
};

export function RiskSparkline({ data, trend }: RiskSparklineProps) {
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="score"
            stroke={trendColor[trend]}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

The team page server component fetches each user's last 7 `risk_score_history` rows and
passes them to `<RiskSparkline>` alongside the `<UserRiskCard>`.

### API endpoint: GET /api/users/:userId/score-history?days=7

```typescript
// Add to apps/api/src/routes/users.ts
usersRouter.get('/:userId/score-history', requireAuth, async (req, res) => {
  const userId = z.string().uuid().parse(req.params['userId']);
  const days = z.coerce.number().int().min(1).max(90).default(7)
    .parse(req.query['days']);

  const result = await db.query(`
    SELECT score, recorded_at
    FROM risk_score_history
    WHERE user_id = $1
      AND recorded_at >= CURRENT_DATE - $2 * INTERVAL '1 day'
    ORDER BY recorded_at ASC
  `, [userId, days]);

  res.json({ history: result.rows });
});
```

**Commit:**
```bash
git add apps/dashboard/components/RiskSparkline.tsx apps/api/src/routes/users.ts
git commit -m "feat(dashboard): add 7-day risk score sparkline; feat(api): add score-history endpoint"
```

**Update PROGRESS.md:** Check off 6.19.

---

## 6.20 — Phase 6 Visual Regression Tests

### Install

```bash
pnpm --filter dashboard add -D @testing-library/react @testing-library/jest-dom vitest @vitejs/plugin-react jsdom
```

### apps/dashboard/vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
});
```

### apps/dashboard/vitest.setup.ts

```typescript
import '@testing-library/jest-dom';
```

### apps/dashboard/components/ui/__tests__/Skeleton.test.tsx

```tsx
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Skeleton, SkeletonCard, SkeletonTable } from '../Skeleton';

describe('Skeleton', () => {
  it('renders with animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
});

describe('SkeletonCard', () => {
  it('matches snapshot', () => {
    const { container } = render(<SkeletonCard />);
    expect(container).toMatchSnapshot();
  });
});

describe('SkeletonTable', () => {
  it('renders correct number of rows', () => {
    const { container } = render(<SkeletonTable rows={4} />);
    // 4 SkeletonRow children inside the table
    const rows = container.querySelectorAll('.flex.items-center');
    expect(rows).toHaveLength(4);
  });
});
```

### apps/dashboard/components/marketing/__tests__/PricingSection.test.tsx

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PricingSection } from '../PricingSection';

describe('PricingSection', () => {
  it('renders all three tier names', () => {
    render(<PricingSection />);
    expect(screen.getByText('Starter')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<PricingSection />);
    expect(container).toMatchSnapshot();
  });
});
```

**Run tests:**
```bash
pnpm --filter dashboard test
```

**Commit:**
```bash
git add apps/dashboard/vitest.config.ts apps/dashboard/vitest.setup.ts apps/dashboard/components/ui/__tests__/ apps/dashboard/components/marketing/__tests__/
git commit -m "test(dashboard): add Phase 6 visual regression snapshot tests"
```

**Update PROGRESS.md:** Check off 6.20. Phase 6 complete. Set Last Completed to "6.20 — Phase 6 visual regression tests".
