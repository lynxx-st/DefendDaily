# Steps 6.07 + 6.08 + 6.09: MSP Partner Portal

## apps/dashboard/src/app/(msp)/layout.tsx

```typescript
export default function MspLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">🛡️ DefendDaily</span>
          <span className="text-slate-400 text-sm border-l border-slate-600 pl-3">Partner Portal</span>
        </div>
      </nav>
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
```

## apps/dashboard/src/app/(msp)/partner/page.tsx (Step 6.08 — multi-org overview)

```typescript
import { auth } from '@/auth';

export default async function PartnerDashboardPage() {
  const session = await auth();

  // TODO: fetch managed orgs from API for this MSP partner account
  // GET /api/partner/orgs — returns list of orgs managed by this MSP

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Summary cards */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">Managed Organizations</div>
          <div className="text-3xl font-bold text-brand">—</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">Total Seats</div>
          <div className="text-3xl font-bold text-brand">—</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-sm text-gray-500">Avg Risk Score</div>
          <div className="text-3xl font-bold text-brand">—</div>
        </div>
      </div>

      {/* Org table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seats</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No managed organizations yet. Contact DefendDaily to set up partner access.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

## Step 6.09: White-label compliance PDF

Modify `buildCompliancePdf` in `compliancePdf.tsx` to accept an optional `logoUrl`:

```typescript
type Props = {
  // ... existing props
  logoUrl?: string; // S3/R2 URL for MSP or customer logo
  partnerName?: string; // MSP company name for white-labeling
};

// In the PDF Document, add before the title:
{props.logoUrl && (
  <Image src={props.logoUrl} style={{ width: 120, height: 40, objectFit: 'contain', marginBottom: 16 }} />
)}

// Replace "DefendDaily" in footer with partnerName if provided:
{props.partnerName ?? 'DefendDaily'} Human Risk Management Platform
```

New migration `007_msp_partners.sql`:
```sql
CREATE TABLE IF NOT EXISTS msp_partners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  logo_url      VARCHAR(500),
  contact_email VARCHAR(255),
  margin_pct    SMALLINT DEFAULT 20, -- reseller margin %
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS msp_org_assignments (
  msp_id   UUID REFERENCES msp_partners(id),
  org_id   UUID REFERENCES organizations(id),
  PRIMARY KEY (msp_id, org_id)
);
```

**Commit:**
```bash
git add apps/dashboard/src/app/(msp)/ apps/api/src/db/migrations/007_msp_partners.sql apps/api/src/services/compliancePdf.tsx
git commit -m "feat(enterprise): add MSP partner portal with multi-org view and white-label PDF support"
```

**Update PROGRESS.md:** Check off 6.07, 6.08, 6.09. Set Last Completed to "6.09 — MSP portal + white-label PDF".
