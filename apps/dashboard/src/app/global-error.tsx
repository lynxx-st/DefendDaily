'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body
        className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center"
        style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,7,205,0.14) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 10 }}>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#0007cd',
              marginBottom: '16px',
            }}
          >
            DefendDaily
          </p>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: '-1.68px',
              color: '#ffffff',
              margin: 0,
            }}
          >
            500
          </h1>
          <p
            style={{
              marginTop: '12px',
              fontSize: '16px',
              color: '#a8a8a8',
              maxWidth: '360px',
            }}
          >
            An unexpected server error occurred. Our team has been notified.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
              padding: '0 24px',
              borderRadius: '8px',
              backgroundColor: '#0007cd',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
