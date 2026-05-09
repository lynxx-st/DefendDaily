# Step 6.06: SSO SAML/OIDC via NextAuth

## Approach

For Enterprise customers, each org maps to a specific OIDC/SAML identity provider.
NextAuth supports OIDC providers natively. SAML requires an adapter library.

## Install

```bash
cd apps/dashboard
pnpm add next-auth@beta
# For SAML support:
pnpm add @auth/core
```

## apps/dashboard/src/auth.ts — add enterprise OIDC provider

```typescript
// Add to the providers array in auth.ts:

// Dynamic OIDC provider for enterprise SSO
// The issuer and clientId are looked up from the DB based on the user's email domain
import type { OIDCConfig } from '@auth/core/providers';

function createEnterpriseOIDCProvider(
  issuer: string,
  clientId: string,
  clientSecret: string
): OIDCConfig<Record<string, unknown>> {
  return {
    id: 'enterprise-sso',
    name: 'Enterprise SSO',
    type: 'oidc',
    issuer,
    clientId,
    clientSecret,
  };
}
```

## Enterprise org OIDC config (new DB table in 006_enterprise_sso.sql)

```sql
CREATE TABLE IF NOT EXISTS org_sso_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider      VARCHAR(20) NOT NULL, -- 'oidc' | 'saml'
  issuer_url    VARCHAR(500),
  client_id     VARCHAR(255),
  client_secret VARCHAR(500),
  saml_metadata_url VARCHAR(500),
  email_domain  VARCHAR(255) NOT NULL, -- e.g., 'acme.com'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email_domain)
);
```

## SSO flow: look up provider by email domain

```typescript
// In auth.ts signIn callback:
async signIn({ user, account }) {
  if (!user.email) return false;
  const domain = user.email.split('@')[1];

  // Check if org has SSO config for this domain
  const ssoResult = await fetch(`${process.env.API_URL}/api/auth/sso-config?domain=${domain}`);
  if (ssoResult.ok) {
    const config = await ssoResult.json();
    // Redirect to OIDC provider — handled by dynamic provider setup
    // For MVP: manually configure per org, or use a SAML middleware
  }
  return true;
}
```

> **Note:** Full SAML implementation requires `@boxyhq/saml-jackson` or similar.
> For MVP Enterprise: start with OIDC (Okta, Azure AD, Google Workspace) which NextAuth
> supports natively. Add SAML in a follow-up sprint.

**Commit:**
```bash
git add apps/dashboard/src/auth.ts apps/api/src/db/migrations/006_enterprise_sso.sql
git commit -m "feat(enterprise): add org-level OIDC SSO config table and NextAuth enterprise provider scaffolding"
```

**Update PROGRESS.md:** Check off 6.06. Set Last Completed to "6.06 — SSO SAML/OIDC scaffolded".
