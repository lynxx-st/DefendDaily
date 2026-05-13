# Steps 10.05–10.06 — SSO SAML/OIDC

## 10.05 SSO SAML/OIDC via NextAuth enterprise providers

**Migration:** Add to `014_enterprise.sql`:

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sso_type VARCHAR(10); -- 'saml' | 'oidc'
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sso_metadata_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sso_client_id VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sso_client_secret TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sso_issuer TEXT;
```

**Install:** `pnpm add next-auth @auth/core` (update existing) and for SAML: `pnpm add @node-saml/passport-saml`

**File:** `apps/dashboard/src/lib/ssoProvider.ts`

```typescript
import type { OAuthConfig, OAuthUserConfig } from 'next-auth/providers'

interface OrgSsoConfig {
  orgId: string
  ssoType: 'saml' | 'oidc'
  metadataUrl?: string
  clientId?: string
  clientSecret?: string
  issuer?: string
}

export function buildOidcProvider(config: OrgSsoConfig): OAuthConfig<{ sub: string; email: string; name: string }> {
  return {
    id: `sso-${config.orgId}`,
    name: 'SSO',
    type: 'oidc',
    issuer: config.issuer!,
    clientId: config.clientId!,
    clientSecret: config.clientSecret!,
    wellKnown: config.metadataUrl,
    profile(profile) {
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.name,
      }
    },
  }
}
```

**File:** `apps/dashboard/src/app/api/auth/[...nextauth]/route.ts` (update)

```typescript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { env } from '../../../../lib/env'
import { buildOidcProvider } from '../../../../lib/ssoProvider'
import { db } from '../../../../lib/db'

async function getDynamicProviders() {
  const ssoOrgs = await db.query<{
    id: string; sso_type: string; sso_metadata_url: string; sso_client_id: string; sso_client_secret: string; sso_issuer: string
  }>(
    `SELECT id, sso_type, sso_metadata_url, sso_client_id, sso_client_secret, sso_issuer FROM organizations WHERE sso_type IS NOT NULL`,
  )
  return ssoOrgs.rows.map(org => buildOidcProvider({
    orgId: org.id,
    ssoType: org.sso_type as 'saml' | 'oidc',
    metadataUrl: org.sso_metadata_url,
    clientId: org.sso_client_id,
    clientSecret: org.sso_client_secret,
    issuer: org.sso_issuer,
  }))
}

const handler = NextAuth({
  providers: [
    GoogleProvider({ clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! }),
    AzureADProvider({ clientId: env.AZURE_AD_CLIENT_ID!, clientSecret: env.AZURE_AD_CLIENT_SECRET!, tenantId: 'common' }),
    ...(await getDynamicProviders()),
  ],
  // ... rest of existing NextAuth config
})

export { handler as GET, handler as POST }
```

---

## 10.06 Org-level IdP URL mapping

**File:** `apps/dashboard/src/app/(ciso)/settings/sso/page.tsx`

```typescript
import { requireSession } from '../../../../lib/auth'
import { SsoSettings } from '../../../../components/SsoSettings'

export default async function SsoPage() {
  await requireSession(['ciso', 'admin'])
  return <SsoSettings />
}
```

**File:** `apps/dashboard/src/components/SsoSettings.tsx`

```typescript
'use client'
import { useState } from 'react'

export function SsoSettings() {
  const [form, setForm] = useState({ ssoType: 'oidc', issuer: '', clientId: '', clientSecret: '', metadataUrl: '' })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await fetch('/api/settings/sso', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
  }

  return (
    <div className="p-6 space-y-4 max-w-lg">
      <h1 className="text-xl font-medium text-white">SSO Configuration</h1>
      <p className="text-white/50 text-sm">Configure SAML or OIDC single sign-on for your organization.</p>

      <div>
        <label className="block text-sm text-white/60 mb-1">SSO Type</label>
        <select
          className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          value={form.ssoType}
          onChange={e => setForm(f => ({ ...f, ssoType: e.target.value }))}
        >
          <option value="oidc">OIDC</option>
          <option value="saml">SAML 2.0</option>
        </select>
      </div>

      {form.ssoType === 'oidc' && (
        <>
          <InputField label="Issuer URL" value={form.issuer} onChange={v => setForm(f => ({ ...f, issuer: v }))} />
          <InputField label="Client ID" value={form.clientId} onChange={v => setForm(f => ({ ...f, clientId: v }))} />
          <InputField label="Client Secret" value={form.clientSecret} onChange={v => setForm(f => ({ ...f, clientSecret: v }))} type="password" />
        </>
      )}

      {form.ssoType === 'saml' && (
        <InputField label="SAML Metadata URL" value={form.metadataUrl} onChange={v => setForm(f => ({ ...f, metadataUrl: v }))} />
      )}

      <button
        onClick={() => void handleSave()}
        disabled={saving}
        className="h-10 px-6 bg-primary rounded-md text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save SSO Config'}
      </button>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm text-white/60 mb-1">{label}</label>
      <input
        type={type}
        className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}
```

**File:** `apps/dashboard/src/app/api/settings/sso/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '../../../../lib/db'

export async function PUT(req: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { ssoType: string; issuer?: string; clientId?: string; clientSecret?: string; metadataUrl?: string }
  const orgRow = await db.query<{ id: string }>(
    `SELECT o.id FROM organizations o JOIN users u ON u.org_id = o.id WHERE u.email = $1 AND u.role IN ('ciso', 'admin')`,
    [session.user?.email],
  )
  if (!orgRow.rows[0]) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.query(
    `UPDATE organizations SET sso_type = $1, sso_issuer = $2, sso_client_id = $3, sso_client_secret = $4, sso_metadata_url = $5 WHERE id = $6`,
    [body.ssoType, body.issuer ?? null, body.clientId ?? null, body.clientSecret ?? null, body.metadataUrl ?? null, orgRow.rows[0].id],
  )
  return NextResponse.json({ ok: true })
}
```

**Commit:** `feat(api,dashboard): SAML/OIDC SSO with per-org IdP mapping (#10.05-10.06)`
