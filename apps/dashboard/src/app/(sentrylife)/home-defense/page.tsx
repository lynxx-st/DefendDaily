import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const KIT_FILES = [
  { label: 'Word Doc', glyph: 'DOC' },
  { label: 'PDF', glyph: 'PDF' },
  { label: 'Excel', glyph: 'XLS' },
  { label: 'Image', glyph: 'PNG' },
  { label: 'Web Link', glyph: 'URL' },
] as const;

export default function HomeDefensePage() {
  return (
    <>
      <PageHeader
        eyebrow="SentryLife"
        title="Home Defense Kit"
        description="Five honey-trap files. Drop them in your Documents folder. If anyone — or anything — opens them, you get an instant alert."
      />

      <Card>
        <CardHeader
          title="Canary Token Kit"
          description="Generated fresh per download. Each file pings home the moment it's opened."
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {KIT_FILES.map(file => (
            <div
              key={file.label}
              className="flex flex-col items-center gap-2 rounded-lg border border-hairline bg-surface-card-elevated p-4"
            >
              <span className="font-mono text-code text-body-strong">{file.glyph}</span>
              <span className="text-body-sm text-body">{file.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button variant="primary" className="bg-sentrylife hover:bg-sentrylife-active" disabled>
            Download Defense Kit
          </Button>
          <p className="text-body-sm text-muted">
            Generation activates in step 5.07 once the canary token service is live.
          </p>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="How it works" />
          <ol className="space-y-3 text-body-sm text-body">
            <li>
              <span className="text-body-strong">1.</span> Download the kit and unzip it on the
              computer you want to protect.
            </li>
            <li>
              <span className="text-body-strong">2.</span> Place the files inside folders an
              attacker would target — Documents, Desktop, Tax, Banking.
            </li>
            <li>
              <span className="text-body-strong">3.</span> Forget about them. If a file is ever
              opened, you receive a Slack DM and an email alert.
            </li>
          </ol>
        </Card>
        <Card>
          <CardHeader title="Triggered tokens" description="Alerts fire here in real time." />
          <p className="text-body-sm text-muted">No tokens triggered yet. That's a good thing.</p>
        </Card>
      </div>
    </>
  );
}
