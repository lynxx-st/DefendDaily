import type { ReactNode } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline-soft">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Link href="/" aria-label="DefendDaily home">
            <Wordmark size="md" />
          </Link>
          <Link
            href="/"
            className="text-body-sm text-body hover:text-body-strong"
          >
            ← Back to site
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
