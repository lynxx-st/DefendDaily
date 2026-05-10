import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';

const COLUMNS = [
  {
    heading: 'Product',
    links: [
      { href: '#features', label: 'Features' },
      { href: '#how', label: 'How it works' },
      { href: '#integrations', label: 'Integrations' },
      { href: '#pricing', label: 'Pricing' },
    ],
  },
  {
    heading: 'Solutions',
    links: [
      { href: '#', label: 'For CISOs' },
      { href: '#', label: 'For SMBs' },
      { href: '#', label: 'Cyber insurance' },
      { href: '#', label: 'SentryLife (Family)' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { href: '#', label: 'Docs' },
      { href: '#', label: 'API reference' },
      { href: '#', label: 'Changelog' },
      { href: '#', label: 'Status' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '#', label: 'About' },
      { href: '#', label: 'Customers' },
      { href: '#', label: 'Security' },
      { href: '#', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '#', label: 'Privacy' },
      { href: '#', label: 'Terms' },
      { href: '#', label: 'DPA' },
      { href: '#', label: 'Trust center' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="mx-auto max-w-[1200px] px-6 pb-12 pt-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-3">
            <Wordmark size="md" />
            <p className="mt-4 max-w-xs text-body-sm text-body">
              Human Risk Management built for Slack, Teams, and the daily-habit loop.
            </p>
          </div>
          {COLUMNS.map(col => (
            <div key={col.heading} className="md:col-span-2">
              <h4 className="text-caption-uppercase text-muted">{col.heading}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-body-sm text-body hover:text-body-strong">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-8 text-body-sm text-muted">
          <p>© {new Date().getFullYear()} DefendDaily, Inc. SOC 2 Type II in progress.</p>
          <p className="font-mono text-caption">
            v0.1.0 · build {new Date().toISOString().slice(0, 10)}
          </p>
        </div>
      </div>
    </footer>
  );
}
