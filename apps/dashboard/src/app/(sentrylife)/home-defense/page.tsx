import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TerminalGrid, TerminalPane } from '@/components/ui/Terminal';

const KIT_FILES = [
  { glyph: 'DOC', label: 'Word Document', filename: 'Tax_Return_2026.docx' },
  { glyph: 'PDF', label: 'PDF', filename: 'Bank_Statements.pdf' },
  { glyph: 'XLS', label: 'Excel', filename: 'Passwords.xlsx' },
  { glyph: 'PNG', label: 'Image', filename: 'Drivers_License.png' },
  { glyph: 'URL', label: 'Web Shortcut', filename: 'Wallet_Backup.url' },
] as const;

export default function HomeDefensePage() {
  return (
    <>
      <HomeDefenseHero />

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card padding="lg">
          <CardHeader
            title="Canary Token Kit"
            description="Five honey-trap files generated fresh per download. Each one pings home the moment it's opened."
            action={
              <Badge tone="success" uppercase dot>
                Active
              </Badge>
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {KIT_FILES.map(file => (
              <div
                key={file.glyph}
                className="group relative flex flex-col items-center gap-2 rounded-lg border border-hairline bg-surface-card-elevated px-3 py-5 transition-colors hover:border-sentrylife/60"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-md border border-hairline-strong bg-canvas-deep font-mono text-caption-uppercase text-sentrylife"
                  style={{
                    boxShadow: 'inset 0 0 0 1px rgba(123,58,237,0.18)',
                  }}
                >
                  {file.glyph}
                </div>
                <span className="text-body-sm font-medium text-body-strong">{file.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-hairline pt-6">
            <Button
              variant="primary"
              href="/api/family/defense-kit"
              className="bg-sentrylife hover:bg-sentrylife-active"
            >
              <DownloadGlyph />
              Download Defense Kit
            </Button>
            <p className="text-body-sm text-muted">
              Generates 5 fresh canary tokens and packages them as a zip file.
            </p>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title="How it works" />
          <ol className="space-y-5">
            <Step
              n={1}
              title="Download the kit"
              body="Unzip on the computer you want to protect. Each file is a real document with an embedded tripwire."
            />
            <Step
              n={2}
              title="Place them as bait"
              body="Drop into Documents, Desktop, or any folder an attacker would target — Tax, Banking, Backups."
            />
            <Step
              n={3}
              title="Forget about them"
              body="If a file is ever opened — by anyone, including malware — you get an instant Slack DM and email alert."
            />
          </ol>
        </Card>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-caption-uppercase text-muted">Preview</p>
            <h2 className="mt-1 text-display-md font-medium text-body-strong">
              What the kit looks like
            </h2>
          </div>
          <Badge tone="neutral" uppercase>
            Generated example
          </Badge>
        </div>

        <TerminalGrid>
          <TerminalPane title="defense-kit/" badge="5 files">
            <div className="space-y-1.5">
              {KIT_FILES.map(file => (
                <div key={file.filename} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="text-sentrylife">{file.glyph}</span>
                    <span className="text-body-strong">{file.filename}</span>
                  </span>
                  <span className="text-muted">armed</span>
                </div>
              ))}
            </div>
          </TerminalPane>

          <TerminalPane title="canary.log" badge="tail -f">
            <div className="space-y-1.5">
              <div className="text-muted">[ready] waiting for tokens to fire…</div>
              <div className="text-muted">[ready] 5 tokens armed across 1 device</div>
              <div className="text-muted">───────────────────────────</div>
              <div className="text-semantic-success">[ok] no triggers in the last 30 days</div>
            </div>
          </TerminalPane>

          <TerminalPane title="alerts" badge="if triggered">
            <div className="space-y-1.5">
              <div>
                <span className="text-semantic-error">[ALERT]</span> Tax_Return_2026.docx
              </div>
              <div className="text-body">opened on Mac-Studio-7F2</div>
              <div className="text-body">22.5.1 / 192.168.x.x</div>
              <div className="text-body">2026-05-11 09:42 PT</div>
            </div>
          </TerminalPane>

          <TerminalPane title="actions" badge="recommended">
            <div className="space-y-1.5">
              <div className="text-body-strong">→ disconnect device from network</div>
              <div className="text-body-strong">→ rotate banking + email passwords</div>
              <div className="text-body-strong">→ run scan with built-in antivirus</div>
              <div className="text-body-strong">→ contact your CISO if work data</div>
            </div>
          </TerminalPane>
        </TerminalGrid>
      </section>

      <section className="mt-10">
        <Card padding="lg">
          <CardHeader
            title="Triggered tokens"
            description="Alerts fire here in real time. Empty is good."
          />
          <div className="rounded-lg border border-dashed border-hairline-strong bg-surface-card/40 px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-surface-card-elevated text-semantic-success">
              <CheckGlyph />
            </div>
            <p className="mt-4 text-title-sm text-body-strong">All clear</p>
            <p className="mt-1 text-body-sm text-muted">
              No canary tokens have triggered in the last 30 days.
            </p>
          </div>
        </Card>
      </section>
    </>
  );
}

function HomeDefenseHero() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-hairline bg-surface-card px-8 py-12 lg:px-12 lg:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 h-[420px] w-[640px] translate-x-1/4 -translate-y-1/4"
        style={{
          background:
            'radial-gradient(closest-side, rgba(123,58,237,0.28) 0%, rgba(123,58,237,0.10) 40%, transparent 70%)',
        }}
      />
      <div className="relative max-w-2xl">
        <Badge tone="neutral" uppercase dot>
          <span className="text-sentrylife">Home Defense</span>
        </Badge>
        <h1 className="mt-4 text-display-xl font-medium leading-[1.05] tracking-tight text-body-strong">
          Trip-wire your important folders
        </h1>
        <p className="mt-4 max-w-xl text-body-md text-body">
          Five booby-trapped files that look like things attackers want to steal. Drop them in
          Documents. If anyone — or anything — opens them, you'll know in seconds.
        </p>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-sentrylife/40 bg-sentrylife/10 text-caption-uppercase text-sentrylife"
        aria-hidden="true"
      >
        {n}
      </span>
      <div>
        <p className="text-title-sm text-body-strong">{title}</p>
        <p className="mt-1 text-body-sm text-body">{body}</p>
      </div>
    </li>
  );
}

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
