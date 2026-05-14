'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Workspace', description: 'Connect' },
  { id: 2, label: 'Schedule', description: 'Set cadence' },
  { id: 3, label: 'Plan', description: 'Choose tier' },
  { id: 4, label: 'Done', description: 'Ready!' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

interface OrgSettings {
  timezone: string;
  puzzleTime: string;
  plan: string;
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const PLANS = [
  {
    id: 'starter',
    label: 'Starter',
    price: '$6',
    cadence: '/user/year',
    features: ['Daily puzzles', 'Slack & Teams', 'Basic leaderboard'],
  },
  {
    id: 'growth',
    label: 'Growth',
    price: '$10',
    cadence: '/user/year',
    features: ['Peer Phish simulations', 'CISO dashboard', 'Risk Score'],
    highlight: true,
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: '$14',
    cadence: '/user/year',
    features: ['IdP automation', 'SAML/OIDC SSO', 'SOC 2 exports'],
  },
] as const;

export function OnboardingWizard({ orgId }: { orgId: string }) {
  const [step, setStep] = useState<StepId>(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<OrgSettings>({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    puzzleTime: '09:00',
    plan: 'growth',
  });
  const router = useRouter();

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100;

  async function advance(updates: Partial<OrgSettings> = {}) {
    const merged = { ...settings, ...updates };
    setSettings(merged);

    if (step === 3) {
      setSaving(true);
      await fetch(`/api/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      }).catch(() => null);
      setSaving(false);
    }

    setDirection(1);
    setStep(s => (s + 1) as StepId);
  }

  function back() {
    setDirection(-1);
    setStep(s => (s - 1) as StepId);
  }

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
    center: { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const } },
    exit: (dir: number) => ({ opacity: 0, x: dir * -24, transition: { duration: 0.16 } }),
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(0,7,205,0.1) 0%, transparent 65%)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <p className="mb-10 text-center font-medium text-primary">DefendDaily</p>

        {/* Step indicators */}
        <div className="mb-3 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  animate={{
                    backgroundColor: s.id < step ? '#33d17a' : s.id === step ? '#0007cd' : '#222222',
                    scale: s.id === step ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.25 }}
                  className="flex h-7 w-7 items-center justify-center rounded-pill text-caption font-semibold text-white"
                >
                  {s.id < step ? <CheckCircle2 size={14} /> : s.id}
                </motion.div>
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    s.id === step ? 'text-body-strong' : s.id < step ? 'text-semantic-success' : 'text-muted'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="relative mx-1 mb-4 h-px flex-1 bg-surface-card-elevated">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    animate={{ width: step > s.id ? '100%' : '0%' }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-8 h-px w-full overflow-hidden rounded-pill bg-hairline">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          />
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-xl border border-hairline bg-surface-card">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="p-8"
            >
              {step === 1 && <WorkspaceStep onNext={() => advance()} />}
              {step === 2 && (
                <ScheduleStep
                  timezone={settings.timezone}
                  puzzleTime={settings.puzzleTime}
                  onNext={u => advance(u)}
                  onBack={back}
                />
              )}
              {step === 3 && (
                <PlanStep
                  plan={settings.plan}
                  saving={saving}
                  onNext={u => advance(u)}
                  onBack={back}
                />
              )}
              {step === 4 && <DoneStep onGoToDashboard={() => router.push('/dashboard')} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-caption text-muted">
          Need help?{' '}
          <a href="mailto:hello@defenddaily.com" className="text-body hover:text-body-strong">
            hello@defenddaily.com
          </a>
        </p>
      </div>
    </div>
  );
}

function WorkspaceStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl">
        🔐
      </div>
      <div>
        <h2 className="text-display-sm font-medium text-body-strong">Welcome to DefendDaily</h2>
        <p className="mt-2 text-body-sm text-body">
          Your Slack workspace is connected. Let&apos;s take 90 seconds to configure
          your daily security challenge.
        </p>
      </div>
      <ul className="space-y-2 text-body-sm text-body">
        {['Daily 60-second micro-challenge', 'Live Risk Score per employee', 'One-click compliance PDF'].map(f => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-semantic-success">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onNext}
        className="group inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-button font-medium text-on-primary transition-colors hover:bg-primary-active"
      >
        Get started
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function ScheduleStep({
  timezone,
  puzzleTime,
  onNext,
  onBack,
}: {
  timezone: string;
  puzzleTime: string;
  onNext: (u: Pick<OrgSettings, 'timezone' | 'puzzleTime'>) => void;
  onBack: () => void;
}) {
  const [tz, setTz] = useState(timezone);
  const [time, setTime] = useState(puzzleTime);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-display-sm font-medium text-body-strong">Daily puzzle schedule</h2>
        <p className="mt-2 text-body-sm text-body">
          When should we send the daily challenge? 9 AM local time produces the highest
          engagement across all industries.
        </p>
      </div>

      <div className="space-y-4">
        <FormField label="Delivery time">
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="h-11 w-full rounded-md border border-hairline bg-surface-card-elevated px-3 text-body-sm text-body-strong focus:border-primary focus:outline-none"
          />
        </FormField>
        <FormField label="Timezone">
          <select
            value={tz}
            onChange={e => setTz(e.target.value)}
            className="h-11 w-full rounded-md border border-hairline bg-surface-card-elevated px-3 text-body-sm text-body-strong focus:border-primary focus:outline-none"
          >
            {TIMEZONES.map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </FormField>
      </div>

      <StepFooter onBack={onBack} onNext={() => onNext({ timezone: tz, puzzleTime: time })} />
    </div>
  );
}

function PlanStep({
  plan,
  saving,
  onNext,
  onBack,
}: {
  plan: string;
  saving: boolean;
  onNext: (u: Pick<OrgSettings, 'plan'>) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState(plan);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-display-sm font-medium text-body-strong">Choose your plan</h2>
        <p className="mt-2 text-body-sm text-body">
          14-day free trial, no credit card required. Cancel any time.
        </p>
      </div>

      <div className="space-y-2">
        {PLANS.map(p => (
          <motion.button
            key={p.id}
            onClick={() => setSelected(p.id)}
            whileTap={{ scale: 0.98 }}
            className={`w-full rounded-md border p-4 text-left transition-colors ${
              selected === p.id
                ? 'border-primary/50 bg-primary/8'
                : 'border-hairline hover:border-hairline-strong hover:bg-surface-card-elevated/50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-semibold text-body-strong">{p.label}</span>
                  {'highlight' in p && p.highlight && (
                    <span className="rounded-pill bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-glow">
                      Popular
                    </span>
                  )}
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {p.features.map(f => (
                    <li key={f} className="text-caption text-muted">{f}</li>
                  ))}
                </ul>
              </div>
              <div className="text-right">
                <span className="text-display-sm font-medium text-body-strong">{p.price}</span>
                <p className="text-caption text-muted">{p.cadence}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <StepFooter
        onBack={onBack}
        onNext={() => onNext({ plan: selected })}
        nextLabel={saving ? 'Saving…' : 'Start free trial'}
        disabled={saving}
      />
    </div>
  );
}

function DoneStep({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-4 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex h-20 w-20 items-center justify-center rounded-pill bg-semantic-success/10 text-4xl"
        style={{ boxShadow: '0 0 40px rgba(51,209,122,0.2)' }}
      >
        🛡️
      </motion.div>
      <div>
        <h2 className="text-display-sm font-medium text-body-strong">You&apos;re all set!</h2>
        <p className="mt-2 max-w-xs text-body-sm text-body">
          Your team receives their first challenge tomorrow morning. Results appear
          in your dashboard within 24 hours.
        </p>
      </div>
      <button
        onClick={onGoToDashboard}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-8 text-button font-medium text-on-primary transition-colors hover:bg-primary-active"
      >
        Go to dashboard
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-body-sm font-medium text-body-strong">{label}</label>
      {children}
    </div>
  );
}

function StepFooter({
  onBack,
  onNext,
  nextLabel = 'Continue',
  disabled = false,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      <button
        onClick={onBack}
        className="text-body-sm text-muted hover:text-body-strong"
      >
        ← Back
      </button>
      <button
        onClick={onNext}
        disabled={disabled}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-button font-medium text-on-primary transition-colors hover:bg-primary-active disabled:opacity-60"
      >
        {nextLabel}
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
