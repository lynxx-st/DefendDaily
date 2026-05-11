import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FamilyPage() {
  return (
    <>
      <PageHeader
        eyebrow="SentryLife"
        title="Family Security Hub"
        description="Protect parents, partners, and kids with the same daily training that defends your workplace."
        actions={
          <Button variant="primary" className="bg-sentrylife hover:bg-sentrylife-active">
            + Invite Family Member
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Members Linked" />
          <p className="text-display-md font-medium text-body-strong">0</p>
          <p className="mt-2 text-body-sm text-muted">Invite up to 5 family members.</p>
        </Card>
        <Card>
          <CardHeader title="Average Risk Score" />
          <p className="text-display-md font-medium text-body-strong">—</p>
          <p className="mt-2 text-body-sm text-muted">Updates once family members join.</p>
        </Card>
        <Card>
          <CardHeader title="Guardian Alerts" />
          <p className="text-display-md font-medium text-body-strong">0</p>
          <p className="mt-2 text-body-sm text-muted">No alerts triggered this week.</p>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Linked Accounts"
            description="Family members appear here once they accept your SentryLife invite."
          />
          <EmptyState
            title="No family members yet"
            description="Send an invite link from the button above. Each invite is valid for 7 days."
          />
        </Card>
      </div>
    </>
  );
}
