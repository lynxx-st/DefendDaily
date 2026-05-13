# Steps 6.01 + 6.02: Marketing Homepage

## 6.01 — Hero Band + Terminal Mockup Grid + Spotlight Glow

### apps/dashboard/app/(marketing)/page.tsx

```tsx
import { HeroSection } from '@/components/marketing/HeroSection';
import { PricingSection } from '@/components/marketing/PricingSection';
import { CtaBand } from '@/components/marketing/CtaBand';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';

export default function MarketingHomePage() {
  return (
    <main className="bg-canvas min-h-screen">
      <HeroSection />
      <PricingSection />
      <CtaBand />
      <MarketingFooter />
    </main>
  );
}
```

### apps/dashboard/components/marketing/HeroSection.tsx

```tsx
'use client';

import Link from 'next/link';
import { TerminalMockupGrid } from '@/components/marketing/TerminalMockupGrid';

export function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden bg-canvas">
      {/* Radial spotlight glow — primary color per design system */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(0,7,205,0.18) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto gap-8 pt-24 pb-16">
        {/* Wordmark */}
        <span className="text-primary font-medium tracking-tight text-lg">
          DefendDaily
        </span>

        {/* Display headline — display-mega token: 72px / weight 500 */}
        <h1 className="text-display-mega font-display leading-none tracking-tight text-white">
          60 seconds a day.
          <br />
          <span className="text-primary">Zero breaches.</span>
        </h1>

        <p className="text-body text-canvas-muted max-w-xl text-xl">
          Replace stale annual training with daily micro-challenges delivered inside
          Slack or Teams. Measure real behavioral change. Prove ROI to your insurer.
        </p>

        <div className="flex items-center gap-4 flex-wrap justify-center">
          {/* Primary CTA — button-primary spec: 40px height, 8px radius */}
          <Link
            href="/setup"
            className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            Add to Slack — free 14 days
          </Link>
          <Link
            href="#pricing"
            className="inline-flex items-center justify-center h-10 px-6 rounded-md border border-white/20 text-white font-medium text-sm hover:bg-white/5 transition-colors"
          >
            See pricing
          </Link>
        </div>

        {/* Terminal mockup grid — 2×2 per design system component */}
        <div className="w-full mt-8">
          <TerminalMockupGrid />
        </div>
      </div>
    </section>
  );
}
```

### apps/dashboard/components/marketing/TerminalMockupGrid.tsx

```tsx
export function TerminalMockupGrid() {
  const panes = [
    {
      label: 'Daily Puzzle',
      lines: [
        '> /defend',
        '',
        '🎯 Spot the Phish — Medium',
        'Which URL is malicious?',
        '',
        'A) https://paypa1.com/secure',
        'B) https://paypal.com/secure',
        '',
        '[A — Correct!] +150 pts  🔥 12-day streak',
      ],
    },
    {
      label: 'Risk Score',
      lines: [
        '> /risk',
        '',
        '🛡️  Your Risk Score: 82',
        '',
        'Awareness:    94/100',
        'Consistency:  80/100',
        'Breach risk:  low',
        '',
        'Keep it up — top 10% of your org.',
      ],
    },
    {
      label: 'Leaderboard',
      lines: [
        '> /leaderboard',
        '',
        '🥇  sarah.k      4,820 pts',
        '🥈  james.r      4,105 pts',
        '🥉  priya.m      3,990 pts',
        '    you          3,840 pts  (#4)',
        '',
        'Weekly reset in 2 days.',
      ],
    },
    {
      label: 'Guardian Alert',
      lines: [
        '🚨 Guardian Alert',
        '',
        'A linked family member may need',
        'support. Their Risk Score dropped',
        'to 38 this week.',
        '',
        'They are struggling with',
        'tech-support scam scenarios.',
        '',
        'View SentryLife dashboard →',
      ],
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-4xl mx-auto">
      {panes.map((pane) => (
        <div
          key={pane.label}
          className="bg-canvas-deep rounded-xl border border-white/10 p-4 text-left font-mono text-xs text-canvas-muted overflow-hidden"
          style={{ background: '#0a0a0a' }}
        >
          {/* Terminal title bar */}
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <span className="ml-3 text-white/40 text-[10px]">{pane.label}</span>
          </div>
          {pane.lines.map((line, i) => (
            <div key={i} className={line.startsWith('>') ? 'text-green-400' : 'text-white/70'}>
              {line || <>&nbsp;</>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/app/\(marketing\)/ apps/dashboard/components/marketing/HeroSection.tsx apps/dashboard/components/marketing/TerminalMockupGrid.tsx
git commit -m "feat(dashboard): add marketing hero band with terminal mockup grid and spotlight glow"
```

**Update PROGRESS.md:** Check off 6.01. Set Last Completed to "6.01 — marketing hero band".

---

## 6.02 — Pricing Band + CTA Spotlight + Dark Footer

### apps/dashboard/components/marketing/PricingSection.tsx

```tsx
import Link from 'next/link';

const tiers = [
  {
    name: 'Starter',
    price: '$6',
    period: '/user/year',
    description: 'Daily puzzles for small teams. No fluff.',
    features: [
      'Daily Slack/Teams micro-challenges',
      'Basic leaderboard',
      'Streak tracking',
      'Email support',
    ],
    cta: 'Start free trial',
    href: '/setup?plan=starter',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '$10',
    period: '/user/year',
    description: 'Phishing simulations + CISO analytics.',
    features: [
      'Everything in Starter',
      'Peer Phish simulations',
      'CISO Risk Dashboard',
      'Human Risk Score per user',
      'Compliance PDF export',
      'Priority support',
    ],
    cta: 'Start free trial',
    href: '/setup?plan=growth',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$14',
    period: '/user/year',
    description: 'IdP automation + compliance + SSO.',
    features: [
      'Everything in Growth',
      'Okta / Azure AD automation',
      'SAML/OIDC SSO',
      'SOC 2 / HIPAA audit exports',
      'Dedicated CSM',
      'SLA 99.9%',
    ],
    cta: 'Contact sales',
    href: '/contact',
    highlighted: false,
  },
] as const;

export function PricingSection() {
  return (
    <section id="pricing" className="py-section px-6 bg-canvas">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-display font-medium text-white text-center mb-4">
          Simple, predictable pricing
        </h2>
        <p className="text-canvas-muted text-center mb-16 max-w-xl mx-auto">
          No per-module fees. No training minimums. One price covers every employee,
          every day.
        </p>

        <div className="grid grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={[
                'rounded-xl border p-8 flex flex-col gap-6',
                tier.highlighted
                  ? 'bg-surface-card-elevated border-primary'
                  : 'bg-surface-card border-white/10',
              ].join(' ')}
            >
              <div>
                <p className="text-sm text-canvas-muted font-medium mb-1">{tier.name}</p>
                <div className="flex items-end gap-1">
                  <span className="text-5xl font-display font-medium text-white">{tier.price}</span>
                  <span className="text-canvas-muted text-sm pb-1">{tier.period}</span>
                </div>
                <p className="text-canvas-muted text-sm mt-2">{tier.description}</p>
              </div>

              <ul className="flex flex-col gap-2 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                    <span className="text-primary mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={[
                  'inline-flex items-center justify-center h-10 px-6 rounded-md font-medium text-sm transition-colors',
                  tier.highlighted
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'border border-white/20 text-white hover:bg-white/5',
                ].join(' ')}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

### apps/dashboard/components/marketing/CtaBand.tsx

```tsx
import Link from 'next/link';

export function CtaBand() {
  return (
    <section className="relative py-section px-6 bg-canvas overflow-hidden">
      {/* Centered spotlight glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,7,205,0.15) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
        <h2 className="text-4xl font-display font-medium text-white">
          Ready to measure real behavior change?
        </h2>
        <p className="text-canvas-muted max-w-lg">
          Add DefendDaily to your Slack workspace in 90 seconds. Free for 14 days,
          no credit card required.
        </p>
        <Link
          href="/setup"
          className="inline-flex items-center justify-center h-10 px-8 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Add to Slack — it&apos;s free
        </Link>
      </div>
    </section>
  );
}
```

### apps/dashboard/components/marketing/MarketingFooter.tsx

```tsx
import Link from 'next/link';

const links = [
  { label: 'Pricing', href: '#pricing' },
  { label: 'Security', href: '/security' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact', href: '/contact' },
] as const;

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-canvas py-12 px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-6">
        <span className="text-primary font-medium">DefendDaily</span>
        <nav className="flex items-center gap-6 flex-wrap">
          {links.map((l) => (
            <Link key={l.label} href={l.href} className="text-sm text-canvas-muted hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-canvas-muted">
          &copy; {new Date().getFullYear()} DefendDaily. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
```

**Commit:**
```bash
git add apps/dashboard/components/marketing/PricingSection.tsx apps/dashboard/components/marketing/CtaBand.tsx apps/dashboard/components/marketing/MarketingFooter.tsx
git commit -m "feat(dashboard): add pricing band, CTA spotlight, and dark footer to marketing homepage"
```

**Update PROGRESS.md:** Check off 6.02. Set Last Completed to "6.02 — pricing + footer".
