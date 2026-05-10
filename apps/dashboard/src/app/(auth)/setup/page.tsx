import { redirect } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { auth } from '@/auth';
import { signApiJwt } from '@/lib/api-jwt';
import { env } from '@/config/env';
import { Badge } from '@/components/ui/Badge';
import { SetupForm, type SetupState } from './setup-form';

const TZ_RE = /^[A-Za-z_]+\/[A-Za-z_]+$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const STEPS = [
  { n: 1, title: 'Connect Slack', done: true },
  { n: 2, title: 'Configure cadence', done: false, current: true },
  { n: 3, title: 'Invite team', done: false },
];

export default async function SetupPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const orgId = session.user.orgId;

  async function saveSetup(_prev: SetupState, formData: FormData): Promise<SetupState> {
    'use server';

    const current = await auth();
    if (!current?.user || current.user.orgId !== orgId || !current.user.id || !orgId) {
      return { error: 'Your account is not linked to an organization yet.' };
    }

    const timezone = String(formData.get('timezone') ?? '');
    const puzzleTime = String(formData.get('puzzle_time') ?? '');
    if (!TZ_RE.test(timezone)) return { error: 'Please choose a valid timezone.' };
    if (!TIME_RE.test(puzzleTime)) return { error: 'Please choose a valid delivery time.' };

    const token = await signApiJwt(current);
    const res = await fetch(`${env.API_URL}/api/orgs/${orgId}/setup`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ timezone, puzzle_time: puzzleTime }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return { error: `Setup failed (${res.status}). Please try again.` };
    }
    redirect('/dashboard');
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-section">
      <Badge tone="primary" dot>
        Onboarding
      </Badge>
      <h1 className="mt-4 text-display-md font-medium text-body-strong">
        Welcome to DefendDaily
      </h1>
      <p className="mt-2 max-w-xl text-body-md text-body">
        Two minutes of setup, then puzzles start landing tomorrow morning.
        You can change everything later in Settings.
      </p>

      <ol className="mt-10 grid grid-cols-3 gap-3 md:gap-6">
        {STEPS.map(step => (
          <li
            key={step.n}
            className={`rounded-lg border p-4 ${
              step.current
                ? 'border-primary/40 bg-surface-card-elevated'
                : 'border-hairline bg-surface-card'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded-pill text-caption font-semibold ${
                  step.done
                    ? 'bg-semantic-success/20 text-semantic-success'
                    : step.current
                      ? 'bg-primary/20 text-primary-glow'
                      : 'bg-surface-card-elevated text-muted'
                }`}
              >
                {step.done ? <CheckCircle2 size={12} /> : step.n}
              </span>
              <span className="text-caption-uppercase text-muted">Step {step.n}</span>
            </div>
            <p className="mt-2 text-body-sm font-medium text-body-strong">{step.title}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-xl border border-hairline bg-surface-card p-7">
        <SetupForm action={saveSetup} />
      </div>

      <p className="mt-6 text-caption text-muted">
        Need help? Email{' '}
        <a href="mailto:hello@defenddaily.com" className="text-body hover:text-body-strong">
          hello@defenddaily.com
        </a>
      </p>
    </main>
  );
}
