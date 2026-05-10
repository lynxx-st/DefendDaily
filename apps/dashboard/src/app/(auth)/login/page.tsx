import { ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { availableProviders, signIn } from '@/auth';
import { Badge } from '@/components/ui/Badge';
import { Spotlight } from '@/components/ui/Spotlight';

const VALUE_PROPS = [
  {
    icon: <ShieldCheck size={16} />,
    title: 'SSO + JWT only',
    body: 'No passwords stored. Sessions are HS256-signed, 5-minute scoped tokens to the API.',
  },
  {
    icon: <Sparkles size={16} />,
    title: 'Daily 60-second challenge',
    body: 'Your team gets one targeted scenario in Slack at 9 AM local — no app, no portal.',
  },
  {
    icon: <Lock size={16} />,
    title: 'SOC 2 evidence by Friday',
    body: 'Compliance PDF auto-generated from the same audit log your CISO already trusts.',
  },
];

export default function LoginPage() {
  const { google, microsoft } = availableProviders;
  const noProviders = !google && !microsoft;

  return (
    <main className="grid min-h-[calc(100vh-65px)] grid-cols-1 lg:grid-cols-2">
      <section className="relative flex items-center justify-center px-6 py-section">
        <Spotlight size="md" className="-z-0" />
        <div className="relative w-full max-w-sm">
          <Badge tone="primary" dot>
            Sign in
          </Badge>
          <h1 className="mt-4 text-display-md font-medium text-body-strong">
            Welcome back
          </h1>
          <p className="mt-2 text-body-sm text-body">
            Continue with the work account your DefendDaily admin enrolled.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {noProviders && (
              <div className="rounded-md border border-hairline bg-surface-card p-4 text-body-sm text-body">
                <p className="font-medium text-body-strong">
                  No identity providers configured
                </p>
                <p className="mt-1">
                  Set <code className="font-mono text-caption">GOOGLE_CLIENT_ID</code> /{' '}
                  <code className="font-mono text-caption">SECRET</code> or{' '}
                  <code className="font-mono text-caption">AZURE_AD_*</code> to enable sign-in.
                </p>
              </div>
            )}

            {google && (
              <form
                action={async () => {
                  'use server';
                  await signIn('google', { redirectTo: '/dashboard' });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-button text-on-primary hover:bg-primary-active"
                >
                  <GoogleGlyph />
                  Continue with Google
                </button>
              </form>
            )}

            {microsoft && (
              <form
                action={async () => {
                  'use server';
                  await signIn('microsoft-entra-id', { redirectTo: '/dashboard' });
                }}
              >
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-surface-card-elevated px-4 text-button text-body-strong hover:bg-surface-strong"
                >
                  <MicrosoftGlyph />
                  Continue with Microsoft
                </button>
              </form>
            )}
          </div>

          <p className="mt-8 text-caption text-muted">
            By continuing you agree to the{' '}
            <a href="#" className="text-body hover:text-body-strong">
              Terms
            </a>{' '}
            and{' '}
            <a href="#" className="text-body hover:text-body-strong">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </section>

      <aside className="relative hidden border-l border-hairline-soft bg-canvas-deep px-10 py-section lg:flex lg:items-center">
        <Spotlight size="lg" className="opacity-60" />
        <div className="relative max-w-md">
          <Badge>Why DefendDaily</Badge>
          <h2 className="mt-4 text-display-sm font-medium text-body-strong">
            The dashboard your security team will actually open every Monday.
          </h2>
          <ul className="mt-8 space-y-6">
            {VALUE_PROPS.map(prop => (
              <li key={prop.title} className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-surface-card text-primary-glow">
                  {prop.icon}
                </span>
                <div>
                  <p className="text-title-sm text-body-strong">{prop.title}</p>
                  <p className="mt-1 text-body-sm text-body">{prop.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-12 rounded-lg border border-hairline bg-surface-card p-5 text-body-sm text-body">
            <p className="font-mono text-caption text-muted">avg renewal sentiment</p>
            <p className="mt-2 text-display-sm font-medium text-body-strong">
              4.8 <span className="text-body-md text-muted">/ 5</span>
            </p>
            <p className="mt-2">across 47 active CISO customers · NPS 71</p>
          </div>
        </div>
      </aside>
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="#FFFFFF"
        d="M21.6 12.227c0-.687-.062-1.347-.178-1.98H12v3.745h5.39a4.604 4.604 0 0 1-1.997 3.022v2.51h3.232c1.892-1.74 2.975-4.305 2.975-7.297z"
      />
      <path
        fill="#FFFFFF"
        opacity=".75"
        d="M12 22c2.7 0 4.964-.895 6.62-2.422l-3.232-2.51c-.896.6-2.04.954-3.388.954-2.605 0-4.81-1.76-5.598-4.123H3.064v2.59A9.997 9.997 0 0 0 12 22z"
      />
      <path
        fill="#FFFFFF"
        opacity=".55"
        d="M6.402 13.9A6.014 6.014 0 0 1 6.087 12c0-.66.114-1.302.315-1.9V7.51H3.064A10 10 0 0 0 2 12c0 1.614.388 3.142 1.064 4.49L6.402 13.9z"
      />
      <path
        fill="#FFFFFF"
        opacity=".35"
        d="M12 5.977c1.47 0 2.787.504 3.825 1.495l2.867-2.867C16.96 2.99 14.696 2 12 2A9.997 9.997 0 0 0 3.064 7.51L6.402 10.1C7.19 7.737 9.394 5.977 12 5.977z"
      />
    </svg>
  );
}

function MicrosoftGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" fill="#FFFFFF" opacity=".95" />
      <rect x="13" y="2" width="9" height="9" fill="#FFFFFF" opacity=".75" />
      <rect x="2" y="13" width="9" height="9" fill="#FFFFFF" opacity=".55" />
      <rect x="13" y="13" width="9" height="9" fill="#FFFFFF" opacity=".35" />
    </svg>
  );
}
