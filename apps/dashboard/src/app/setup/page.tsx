import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { signApiJwt } from '@/lib/api-jwt';
import { env } from '@/config/env';
import { SetupForm, type SetupState } from './setup-form';

const TZ_RE = /^[A-Za-z_]+\/[A-Za-z_]+$/;
const TIME_RE = /^\d{2}:\d{2}$/;

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-section">
      <p className="text-caption-uppercase text-muted mb-4">DefendDaily</p>
      <h1 className="text-display-sm font-sans text-body-strong mb-2">Welcome to DefendDaily</h1>
      <p className="text-body-sm text-body mb-8">
        Pick a timezone and a daily delivery time. You can change these any time in
        Settings.
      </p>
      <div className="rounded-xl bg-surface-card p-6">
        <SetupForm action={saveSetup} />
      </div>
    </main>
  );
}
