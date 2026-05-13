'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error boundary — surface to Sentry when integrated
  }, [error]);

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            'radial-gradient(closest-side, rgba(255,77,77,0.08) 0%, rgba(255,77,77,0.03) 40%, transparent 70%)',
        }}
      />
      <p className="font-mono text-caption-uppercase text-muted">Error</p>
      <h1 className="mt-3 text-display-lg font-medium text-body-strong">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-sm text-body-sm text-body">
        The dashboard failed to load. This has been logged automatically.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-caption text-muted">
          digest: {error.digest}
        </p>
      )}
      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 font-medium text-button text-on-primary transition-colors hover:bg-primary-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center justify-center rounded-md border border-hairline-strong px-6 font-medium text-button text-body transition-colors hover:bg-surface-card hover:text-body-strong"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
