import { availableProviders, signIn } from '@/auth';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-section">
      <p className="text-caption-uppercase text-muted mb-4">DefendDaily</p>
      <h1 className="text-display-sm font-sans text-body-strong mb-2">Sign in</h1>
      <p className="text-body-sm text-body mb-8">
        Use your work account to access the CISO dashboard.
      </p>

      {!availableProviders.google && !availableProviders.microsoft && (
        <p className="text-body-sm text-muted">
          No identity providers configured. Set GOOGLE_CLIENT_ID/SECRET or
          AZURE_AD_CLIENT_ID/SECRET to enable sign-in.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {availableProviders.google && (
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-[18px] text-button text-on-primary hover:bg-primary-active"
            >
              Continue with Google
            </button>
          </form>
        )}
        {availableProviders.microsoft && (
          <form
            action={async () => {
              'use server';
              await signIn('microsoft-entra-id', { redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-surface-card-elevated px-[18px] text-button text-body-strong hover:bg-surface-strong"
            >
              Continue with Microsoft
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
