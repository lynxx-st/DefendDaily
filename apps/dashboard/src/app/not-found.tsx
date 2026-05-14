import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';
import { GridDecoration, Spotlight } from '@/components/ui/Spotlight';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-6 text-center">
      <GridDecoration />
      <Spotlight size="lg" />

      <div className="relative z-10 flex flex-col items-center">
        <Link href="/" aria-label="DefendDaily home" className="mb-16">
          <Wordmark size="md" />
        </Link>

        <p className="font-mono text-caption-uppercase tracking-widest text-primary">
          404
        </p>
        <h1 className="mt-4 text-display-lg font-medium text-body-strong">
          Page not found
        </h1>
        <p className="mt-3 max-w-sm text-body-md text-body">
          This page doesn&apos;t exist. It may have been moved, deleted, or you
          typed the address wrong.
        </p>

        <div className="mt-10 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 font-medium text-button text-on-primary transition-colors hover:bg-primary-active focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Back to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-md border border-hairline-strong px-6 font-medium text-button text-body transition-colors hover:bg-surface-card hover:text-body-strong"
          >
            Homepage
          </Link>
        </div>

        <p className="mt-16 font-mono text-caption text-muted">
          If you believe this is a bug,{' '}
          <Link href="/contact" className="hover:text-body-strong underline underline-offset-2">
            let us know
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
