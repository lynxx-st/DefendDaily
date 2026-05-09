import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-[1200px] px-6 py-section">
      <p className="text-caption-uppercase text-muted mb-4">DefendDaily</p>
      <h1 className="text-display-md font-sans text-body-strong mb-6">
        CISO Dashboard
      </h1>
      <p className="text-body-md text-body max-w-prose mb-8">
        Human Risk Management for Slack and Microsoft Teams. The dashboard surfaces
        Risk Score heatmaps, Peer Phish click-rate trends, and one-click compliance
        exports. Authentication and routing land in the next steps.
      </p>
      <Link
        href="/login"
        className="inline-flex h-10 items-center rounded-md bg-primary px-[18px] text-button text-on-primary hover:bg-primary-active"
      >
        Sign in
      </Link>
    </main>
  );
}
