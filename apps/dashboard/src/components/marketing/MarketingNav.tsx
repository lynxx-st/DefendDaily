import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';
import { Button } from '@/components/ui/Button';

const LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#integrations', label: 'Integrations' },
  { href: '#pricing', label: 'Pricing' },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline-soft bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href="/" aria-label="DefendDaily home">
            <Wordmark size="md" />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="text-nav-link text-body hover:text-body-strong"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button href="/login" variant="ghost" size="sm">
            Sign in
          </Button>
          <Button href="/login" variant="primary" size="sm">
            Start free trial
          </Button>
        </div>
      </div>
    </header>
  );
}
