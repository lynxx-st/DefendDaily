# Steps 10.07–10.08 — MSP Partner Portal

## 10.07 MSP partner portal layout

**Migration:** Add to `014_enterprise.sql`:

```sql
CREATE TABLE IF NOT EXISTS msp_partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  contact_email   VARCHAR(255) NOT NULL,
  margin_pct      SMALLINT DEFAULT 20,
  stripe_account_id VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS msp_partner_id UUID REFERENCES msp_partners(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS msp_partner_id UUID REFERENCES msp_partners(id);

CREATE INDEX idx_organizations_msp ON organizations(msp_partner_id);
```

**File:** `apps/dashboard/src/app/(msp)/layout.tsx`

```typescript
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'

export default async function MspLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-canvas">
      <nav className="h-14 border-b border-white/5 flex items-center px-6 gap-6">
        <span className="text-white font-medium text-sm">DefendDaily MSP Portal</span>
        <Link href="/msp" className="text-white/50 hover:text-white text-sm transition-colors">Overview</Link>
        <Link href="/msp/clients" className="text-white/50 hover:text-white text-sm transition-colors">Clients</Link>
        <Link href="/msp/billing" className="text-white/50 hover:text-white text-sm transition-colors">Billing</Link>
      </nav>
      <main>{children}</main>
    </div>
  )
}
```

---

## 10.08 Multi-org overview dashboard + white-label compliance PDF

**File:** `apps/dashboard/src/app/(msp)/page.tsx`

```typescript
import { requireMspSession } from '../../lib/auth'
import { apiClient } from '../../lib/apiClient'

export default async function MspOverviewPage() {
  const session = await requireMspSession()
  const data = await apiClient('/api/msp/overview', session)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-medium text-white">Managed Orgs Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Clients" value={data.totals.clients} />
        <StatCard label="Total Seats" value={data.totals.seats} />
        <StatCard label="Avg Risk Score" value={`${data.totals.avg_score}/100`} />
      </div>
      <div className="bg-surface-card rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-white/50 font-normal">Organization</th>
              <th className="text-left px-4 py-3 text-white/50 font-normal">Seats</th>
              <th className="text-left px-4 py-3 text-white/50 font-normal">Avg Score</th>
              <th className="text-left px-4 py-3 text-white/50 font-normal">Active (7d)</th>
              <th className="text-left px-4 py-3 text-white/50 font-normal">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((client: {
              id: string; name: string; seat_count: string; avg_score: string; active_7d: string; renewal_date: string | null
            }) => (
              <tr key={client.id} className="border-b border-white/5 hover:bg-white/2">
                <td className="px-4 py-3 text-white">{client.name}</td>
                <td className="px-4 py-3 text-white/70">{client.seat_count}</td>
                <td className="px-4 py-3 text-white/70">{client.avg_score}</td>
                <td className="px-4 py-3 text-white/70">{client.active_7d}</td>
                <td className="px-4 py-3 text-white/70">{client.renewal_date ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface-card rounded-xl p-5 border border-white/5">
      <div className="text-white/50 text-sm">{label}</div>
      <div className="text-2xl font-medium text-white mt-1">{value}</div>
    </div>
  )
}
```

**File:** `apps/api/src/routes/msp.ts`

```typescript
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { db } from '../db/client'

export const mspRouter = Router()
mspRouter.use(requireAuth, requireRole('msp_admin'))

mspRouter.get('/overview', async (_req, res) => {
  const { userId } = res.locals.principal!

  const partnerRow = await db.query<{ id: string }>(
    `SELECT msp_partner_id AS id FROM users WHERE id = $1`,
    [userId],
  )
  const partnerId = partnerRow.rows[0]?.id
  if (!partnerId) { res.status(403).json({ error: 'Not an MSP admin', code: 'FORBIDDEN', requestId: res.locals.requestId }); return }

  const [clients, totals] = await Promise.all([
    db.query<{ id: string; name: string; seat_count: string; avg_score: string; active_7d: string; renewal_date: string | null }>(
      `SELECT o.id, o.name,
         COUNT(DISTINCT u.id)::text AS seat_count,
         ROUND(AVG(u.risk_score))::text AS avg_score,
         COUNT(DISTINCT CASE WHEN u.last_active_date >= CURRENT_DATE - 7 THEN u.id END)::text AS active_7d,
         o.plan_expires_at::date::text AS renewal_date
       FROM organizations o
       JOIN users u ON u.org_id = o.id AND u.role = 'employee'
       WHERE o.msp_partner_id = $1
       GROUP BY o.id ORDER BY o.name`,
      [partnerId],
    ),
    db.query<{ clients: string; seats: string; avg_score: string }>(
      `SELECT COUNT(DISTINCT o.id)::text AS clients,
              COUNT(DISTINCT u.id)::text AS seats,
              ROUND(AVG(u.risk_score))::text AS avg_score
       FROM organizations o JOIN users u ON u.org_id = o.id
       WHERE o.msp_partner_id = $1`,
      [partnerId],
    ),
  ])

  res.json({
    clients: clients.rows,
    totals: { clients: totals.rows[0]?.clients, seats: totals.rows[0]?.seats, avg_score: totals.rows[0]?.avg_score },
  })
})
```

**Commit:** `feat(api,dashboard): MSP partner portal layout and multi-org overview (#10.07-10.08)`
