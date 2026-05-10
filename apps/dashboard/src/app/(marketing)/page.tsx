import {
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  Clock4,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spotlight, GridDecoration } from '@/components/ui/Spotlight';
import { TerminalGrid, TerminalPane } from '@/components/ui/Terminal';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <HowItWorks />
      <Features />
      <Integrations />
      <Pricing />
      <Testimonial />
      <FinalCTA />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-hairline">
      <GridDecoration />
      <Spotlight size="xl" className="-top-40" />
      <div className="relative mx-auto max-w-[1200px] px-6 pb-24 pt-24 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="primary" dot>
            Human risk management
          </Badge>
          <h1 className="mt-6 text-display-mega font-medium leading-[1.05] text-body-strong sm:text-[88px]">
            Stop annual training.
            <br />
            <span className="text-body">Start daily defense.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-body-md text-body sm:text-lg">
            DefendDaily turns security awareness into a 60-second daily habit
            inside Slack and Teams — with phishing simulations, a live Risk Score,
            and one-click compliance reports your CISO actually wants to share.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button href="/login" size="md">
              Start a 14-day free trial
              <ArrowRight size={14} />
            </Button>
            <Button href="#how" variant="outline" size="md">
              See how it works
            </Button>
          </div>
          <p className="mt-4 text-caption text-muted">
            No credit card · Slack &amp; Teams ready · Cancel any time
          </p>
        </div>

        <div className="mt-16 md:mt-20">
          <TerminalGrid>
            <TerminalPane title="defenddaily — slack-dm.txt" badge="09:00 · daily">
              <p className="text-body-strong">@defenddaily</p>
              <p className="mt-2">
                Spot the phish ↓ which sender is fake?
              </p>
              <ul className="mt-3 space-y-1.5">
                <li>
                  <span className="text-muted">[A]</span>{' '}
                  <span className="text-body-strong">notifications@github.com</span>
                </li>
                <li>
                  <span className="text-muted">[B]</span>{' '}
                  <span className="text-semantic-error">support@github-billing.co</span>
                </li>
                <li>
                  <span className="text-muted">[C]</span>{' '}
                  <span className="text-body-strong">noreply@accounts.google.com</span>
                </li>
              </ul>
              <p className="mt-3 text-caption text-muted">
                +120 pts · 17-day streak 🔥
              </p>
            </TerminalPane>

            <TerminalPane title="defenddaily — risk-score.tsx" badge="rising">
              <pre className="whitespace-pre-wrap text-body">
{`avg_risk_score = 78 / 100
                 ↑ +6 vs last week

          ███████████████░░░░░░  78

breakdown:
  awareness    .......... 82
  consistency  .........  76
  real-world   .........  74`}
              </pre>
            </TerminalPane>

            <TerminalPane title="defenddaily — leaderboard.json" badge="this week">
              <pre className="whitespace-pre-wrap text-body">
{`🥇  priya.k        2,140
🥈  marc.delaney   1,980
🥉  jordan.r       1,845
4.  alex.tucci     1,720
5.  sam.lin        1,612
6.  rohit.s        1,534`}
              </pre>
            </TerminalPane>

            <TerminalPane title="defenddaily — compliance.pdf" badge="export">
              <p className="text-body-strong">Security Awareness Training Report</p>
              <p className="mt-1 text-muted">Q1 2026 · Acme Inc</p>
              <ul className="mt-3 space-y-1.5">
                <li>✓ 482 employees trained</li>
                <li>✓ 24,310 interactions logged</li>
                <li>✓ 11% phish click rate (↓ from 38%)</li>
                <li>✓ Signed attestation block</li>
              </ul>
              <p className="mt-3 text-caption text-muted">
                SOC 2 · HIPAA · cyber-insurance evidence
              </p>
            </TerminalPane>
          </TerminalGrid>
        </div>
      </div>
    </section>
  );
}

const PROOF_LOGOS = ['Northwind', 'Acme Co.', 'Initech', 'Hooli', 'Globex', 'Soylent'];

function SocialProof() {
  return (
    <section className="border-b border-hairline-soft bg-canvas">
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <p className="text-center text-caption-uppercase text-muted">
          Trusted by security teams at fast-growing companies
        </p>
        <div className="mt-6 grid grid-cols-3 items-center gap-x-6 gap-y-4 md:grid-cols-6">
          {PROOF_LOGOS.map(name => (
            <div
              key={name}
              className="flex h-10 items-center justify-center text-title-md font-medium text-muted"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Install in Slack or Teams',
    body: 'Two clicks via your workspace admin. Auto-detects users, no agent or VPN required.',
  },
  {
    n: '02',
    title: 'Daily 60-second puzzle',
    body: "Each employee gets one targeted scenario at 9 AM local. Spot-the-phish, scenario, breach alerts.",
  },
  {
    n: '03',
    title: 'Live Risk Score per person',
    body: 'Awareness × consistency − real-world breach exposure. Updated nightly, exposed by department.',
  },
  {
    n: '04',
    title: 'Compliance, automatic',
    body: 'SOC 2 / HIPAA / cyber-insurance evidence as a one-click PDF — generated from the same audit log.',
  },
];

function HowItWorks() {
  return (
    <section id="how" className="border-b border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 py-section">
        <div className="max-w-2xl">
          <Badge>How it works</Badge>
          <h2 className="mt-4 text-display-lg font-medium text-body-strong">
            Behavioral change, not click-through training.
          </h2>
          <p className="mt-3 text-body-md text-body">
            Annual videos test memory once a year. DefendDaily exercises the same
            decision muscle every day — and quantifies it.
          </p>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(step => (
            <li
              key={step.n}
              className="rounded-xl border border-hairline bg-surface-card p-6"
            >
              <span className="font-mono text-caption text-primary-glow">{step.n}</span>
              <h3 className="mt-3 text-title-md text-body-strong">{step.title}</h3>
              <p className="mt-2 text-body-sm text-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: <Zap size={20} />,
    title: 'Adaptive puzzle engine',
    body: 'Difficulty rises with rolling accuracy. Travel-mode puzzles trigger from Slack status.',
  },
  {
    icon: <ShieldCheck size={20} />,
    title: 'Peer Phish simulations',
    body: 'Coworkers test coworkers — opt-in only, admin-curated lures, full audit log.',
  },
  {
    icon: <Activity size={20} />,
    title: 'Human Risk Score',
    body: 'A single 0–100 number per person, per department. Drives MFA escalation in Okta or Entra ID.',
  },
  {
    icon: <TrendingUp size={20} />,
    title: 'Click-rate trendlines',
    body: '90-day chart of click vs report rate — the renewal-winning slide for every QBR.',
  },
  {
    icon: <CheckCircle2 size={20} />,
    title: 'Compliance PDFs in one click',
    body: 'Exportable evidence for SOC 2, HIPAA, and the cyber-insurance questionnaire your broker just sent.',
  },
  {
    icon: <Clock4 size={20} />,
    title: '60 seconds, daily',
    body: 'Designed to never interrupt — single-message, single-tap, expires after 24h with a graceful retry.',
  },
];

function Features() {
  return (
    <section id="features" className="border-b border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 py-section">
        <div className="max-w-2xl">
          <Badge>Features</Badge>
          <h2 className="mt-4 text-display-lg font-medium text-body-strong">
            Everything a 50–2,000 seat company needs.
            <br />
            Nothing the CISO has to babysit.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(f => (
            <Card key={f.title} padding="lg">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary-glow">
                {f.icon}
              </div>
              <h3 className="mt-4 text-title-md text-body-strong">{f.title}</h3>
              <p className="mt-2 text-body-sm text-body">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const INTEGRATIONS = [
  { name: 'Slack', tag: 'Bot · OAuth' },
  { name: 'Microsoft Teams', tag: 'Adaptive Cards' },
  { name: 'Okta', tag: 'Risk-driven MFA' },
  { name: 'Entra ID', tag: 'Conditional Access' },
  { name: 'Google Workspace', tag: 'Directory · SSO' },
  { name: 'HaveIBeenPwned', tag: 'Breach intel' },
  { name: 'Canarytokens', tag: 'Honey docs' },
  { name: 'Twilio', tag: 'Smishing' },
];

function Integrations() {
  return (
    <section id="integrations" className="border-b border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 py-section">
        <div className="max-w-2xl">
          <Badge>Integrations</Badge>
          <h2 className="mt-4 text-display-lg font-medium text-body-strong">
            Plays nicely with the stack you already pay for.
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {INTEGRATIONS.map(t => (
            <div
              key={t.name}
              className="rounded-lg border border-hairline bg-surface-card p-5 transition-colors hover:bg-surface-card-elevated"
            >
              <div className="grid h-10 w-10 place-items-center rounded-md bg-surface-card-elevated text-title-md text-body-strong">
                {t.name[0]}
              </div>
              <p className="mt-4 text-title-sm text-body-strong">{t.name}</p>
              <p className="mt-1 text-caption text-muted">{t.tag}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TIERS = [
  {
    name: 'Starter',
    price: 6,
    cadence: '/user/year',
    summary: 'Daily puzzles + Slack bot for small teams getting started.',
    features: [
      'Daily security challenges',
      'Slack & Teams bot',
      'Basic streak leaderboard',
      'Weekly Risk Score email',
    ],
    cta: 'Start free trial',
  },
  {
    name: 'Growth',
    price: 10,
    cadence: '/user/year',
    summary: 'Phishing simulation + CISO dashboard. Most popular for SMBs.',
    features: [
      'Everything in Starter',
      'Peer Phish simulations',
      'CISO dashboard with Risk Heatmap',
      'Click-rate trendlines + leaderboard',
    ],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 14,
    cadence: '/user/year',
    summary: 'Compliance exports + IdP automation for regulated orgs.',
    features: [
      'Everything in Growth',
      'SOC 2 / HIPAA PDF exports',
      'Okta + Entra ID Conditional Access',
      'SAML / OIDC SSO + SLA',
    ],
    cta: 'Talk to sales',
  },
];

function Pricing() {
  return (
    <section id="pricing" className="border-b border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 py-section">
        <div className="max-w-2xl">
          <Badge>Pricing</Badge>
          <h2 className="mt-4 text-display-lg font-medium text-body-strong">
            Per-seat pricing. No setup fees.
          </h2>
          <p className="mt-3 text-body-md text-body">
            Simple, transparent, and roughly half the cost of legacy SAT vendors.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {TIERS.map(tier => (
            <div
              key={tier.name}
              className={`relative rounded-xl border p-7 ${
                tier.highlight
                  ? 'border-primary/40 bg-surface-card-elevated'
                  : 'border-hairline bg-surface-card'
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-7">
                  <Badge tone="primary">Most popular</Badge>
                </span>
              )}
              <h3 className="text-title-md text-body-strong">{tier.name}</h3>
              <p className="mt-1 text-body-sm text-body">{tier.summary}</p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-display-lg font-medium text-body-strong">
                  ${tier.price}
                </span>
                <span className="text-body-sm text-muted">{tier.cadence}</span>
              </p>
              <Button
                href="/login"
                variant={tier.highlight ? 'primary' : 'secondary'}
                className="mt-5 w-full"
              >
                {tier.cta}
              </Button>
              <ul className="mt-6 space-y-2.5">
                {tier.features.map(feature => (
                  <li key={feature} className="flex items-start gap-2 text-body-sm text-body">
                    <CheckCircle2
                      size={14}
                      className="mt-1 shrink-0 text-semantic-success"
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 py-section">
        <Card padding="xl" className="mx-auto max-w-3xl text-center">
          <p className="text-display-sm font-medium leading-snug text-body-strong">
            “We replaced a $32k annual SAT contract with DefendDaily in a single
            sprint. The phish click-rate dropped from 24% to 6% in 90 days, and our
            cyber-insurance broker accepted the PDF export as evidence on the
            first try.”
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-pill bg-primary/20 text-caption font-semibold text-primary-glow">
              MD
            </span>
            <div className="text-left">
              <p className="text-body-sm font-medium text-body-strong">Marc Delaney</p>
              <p className="text-caption text-muted">CISO · Northwind (1,140 seats)</p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <Spotlight size="lg" />
      <div className="relative mx-auto max-w-[1200px] px-6 py-section text-center">
        <h2 className="mx-auto max-w-2xl text-display-xl font-medium text-body-strong">
          Your team&rsquo;s next click is the one that matters.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-body-md text-body">
          Install in Slack in under 60 seconds. Free for 14 days, no credit card.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/login" size="md">
            Start free trial
            <ArrowRight size={14} />
          </Button>
          <Button href="#pricing" variant="outline" size="md">
            View pricing
          </Button>
        </div>
      </div>
    </section>
  );
}
