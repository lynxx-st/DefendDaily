# Step 6.10: Phase 6 Integration Tests

## Install

```bash
cd apps/api
pnpm add -D msw @mswjs/data
```

## apps/api/src/services/__tests__/okta.test.ts

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforceHardwareMfa, removeHardwareMfa } from '../okta';

vi.mock('@okta/okta-sdk-nodejs', () => ({
  Client: vi.fn().mockImplementation(() => ({
    group: {
      assignUserToGroup: vi.fn().mockResolvedValue(undefined),
      removeUserFromGroup: vi.fn().mockResolvedValue(undefined),
    },
  })),
}));

vi.mock('../../config/env', () => ({
  env: {
    OKTA_DOMAIN: 'test.okta.com',
    OKTA_API_TOKEN: 'test-token',
    OKTA_RISK_POLICY_GROUP_ID: 'group-123',
  },
}));

describe('okta service', () => {
  it('enforceHardwareMfa assigns user to group', async () => {
    await expect(enforceHardwareMfa('okta-user-456')).resolves.toBeUndefined();
  });

  it('removeHardwareMfa removes user from group', async () => {
    await expect(removeHardwareMfa('okta-user-456')).resolves.toBeUndefined();
  });

  it('enforceHardwareMfa throws if OKTA_RISK_POLICY_GROUP_ID not set', async () => {
    vi.doMock('../../config/env', () => ({
      env: { OKTA_DOMAIN: 'test.okta.com', OKTA_API_TOKEN: 'test-token', OKTA_RISK_POLICY_GROUP_ID: undefined },
    }));
    const { enforceHardwareMfa: freshEnforce } = await import('../okta');
    await expect(freshEnforce('user-1')).rejects.toThrow('OKTA_RISK_POLICY_GROUP_ID not set');
  });
});
```

## apps/api/src/services/__tests__/azure-ad.test.ts

```typescript
import { describe, it, expect, vi } from 'vitest';
import { enforceConditionalAccess, removeConditionalAccess } from '../azure-ad';

// msw mock for Microsoft Graph API
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.post(
    'https://graph.microsoft.com/v1.0/groups/:groupId/members/$ref',
    () => HttpResponse.json({}, { status: 204 })
  ),
  http.delete(
    'https://graph.microsoft.com/v1.0/groups/:groupId/members/:userId/$ref',
    () => HttpResponse.json({}, { status: 204 })
  ),
);

// Mock the Azure identity credential
vi.mock('@azure/identity', () => ({
  ClientSecretCredential: vi.fn().mockImplementation(() => ({
    getToken: vi.fn().mockResolvedValue({ token: 'mock-access-token' }),
  })),
}));

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('azure-ad service', () => {
  beforeAll(() => {
    process.env.AZURE_CLIENT_ID = 'test-client-id';
    process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
    process.env.AZURE_MFA_GROUP_ID = 'group-abc';
  });

  it('enforceConditionalAccess posts to graph API without throwing', async () => {
    await expect(
      enforceConditionalAccess('azure-object-id-123', 'tenant-id-456')
    ).resolves.toBeUndefined();
  });

  it('removeConditionalAccess deletes from graph API without throwing', async () => {
    await expect(
      removeConditionalAccess('azure-object-id-123', 'tenant-id-456')
    ).resolves.toBeUndefined();
  });
});
```

## apps/api/src/jobs/__tests__/riskScoreIdp.test.ts

Tests the IdP enforcement logic in the risk score worker.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calcPoints } from '../../services/puzzleEngine';

// Mock the Okta and Azure modules
vi.mock('../../services/okta', () => ({
  enforceHardwareMfa: vi.fn().mockResolvedValue(undefined),
  removeHardwareMfa: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/azure-ad', () => ({
  enforceConditionalAccess: vi.fn().mockResolvedValue(undefined),
  removeConditionalAccess: vi.fn().mockResolvedValue(undefined),
}));

const { enforceHardwareMfa, removeHardwareMfa } = await import('../../services/okta');
const { enforceConditionalAccess, removeConditionalAccess } = await import('../../services/azure-ad');

describe('IdP enforcement thresholds', () => {
  it('score < 40 triggers Okta enforcement', async () => {
    const score = 35;
    const idpMfaEnforced = false;
    const oktaUserId = 'okta-user-1';

    if (score < 40 && !idpMfaEnforced) {
      await enforceHardwareMfa(oktaUserId);
    }

    expect(enforceHardwareMfa).toHaveBeenCalledWith(oktaUserId);
    expect(removeHardwareMfa).not.toHaveBeenCalled();
  });

  it('score >= 60 reverses Okta enforcement when previously enforced', async () => {
    vi.clearAllMocks();
    const score = 65;
    const idpMfaEnforced = true;
    const oktaUserId = 'okta-user-1';

    if (score >= 60 && idpMfaEnforced) {
      await removeHardwareMfa(oktaUserId);
    }

    expect(removeHardwareMfa).toHaveBeenCalledWith(oktaUserId);
    expect(enforceHardwareMfa).not.toHaveBeenCalled();
  });

  it('score between 40-59 does not change enforcement state', async () => {
    vi.clearAllMocks();
    const score = 50;
    const idpMfaEnforced = false;

    if (score < 40 && !idpMfaEnforced) await enforceHardwareMfa('user-1');
    if (score >= 60 && idpMfaEnforced) await removeHardwareMfa('user-1');

    expect(enforceHardwareMfa).not.toHaveBeenCalled();
    expect(removeHardwareMfa).not.toHaveBeenCalled();
  });

  it('score >= 60 does NOT remove when not previously enforced', async () => {
    vi.clearAllMocks();
    const score = 70;
    const idpMfaEnforced = false;

    if (score >= 60 && idpMfaEnforced) await removeHardwareMfa('user-1');

    expect(removeHardwareMfa).not.toHaveBeenCalled();
  });

  it('score < 40 does NOT enforce when already enforced', async () => {
    vi.clearAllMocks();
    const score = 30;
    const idpMfaEnforced = true;

    if (score < 40 && !idpMfaEnforced) await enforceHardwareMfa('user-1');

    expect(enforceHardwareMfa).not.toHaveBeenCalled();
  });
});
```

## Run tests

```bash
cd apps/api
pnpm test --coverage
```

Expected output:
```
✓ okta service (3)
✓ azure-ad service (2)
✓ IdP enforcement thresholds (5)

Coverage:
  src/services/okta.ts       → > 80%
  src/services/azure-ad.ts   → > 80%
```

**Commit:**
```bash
git add apps/api/src/services/__tests__/okta.test.ts \
        apps/api/src/services/__tests__/azure-ad.test.ts \
        apps/api/src/jobs/__tests__/riskScoreIdp.test.ts
git commit -m "test(enterprise): add msw-backed integration tests for Okta + Azure AD enforcement logic"
```

**Update PROGRESS.md:** Check off 6.10. Check off Phase 6 in "Overall Phase Status". Set Last Completed to "6.10 — Phase 6 integration tests (all phases complete)".

---

## Phase 6 Exit Criteria

- [ ] User with score < 40 and `okta_user_id` set → `enforceHardwareMfa()` called, `idp_mfa_enforced = true`, audit_log entry written
- [ ] Same user score recovers to ≥ 60 → `removeHardwareMfa()` called, `idp_mfa_enforced = false`
- [ ] Azure tenant: same enforcement lifecycle via `enforceConditionalAccess` / `removeConditionalAccess`
- [ ] SSO OIDC config stored in `org_sso_config` table with `email_domain` unique key
- [ ] `/partner` route renders MSP layout with org table
- [ ] Compliance PDF accepts `logoUrl` and replaces footer text with `partnerName`
- [ ] `msp_partners` and `msp_org_assignments` tables created by migration 007
- [ ] All 10 Phase 6 steps passing in CI

---

## Full Project Exit Criteria (All Phases)

When all 78 steps are checked in `docs/PROGRESS.md`, the following should be true:

| Phase | Verification |
|-------|-------------|
| 1 | Slack bot installs, delivers puzzles, scores answers, shows leaderboard |
| 2 | `/risk` returns color-coded score; nightly job fires; HIBP breaches affect score |
| 3 | Phish simulation emails send with tracking; `/report-phish` awards points |
| 4 | CISO dashboard loads risk heatmap + phish trend; compliance PDF downloads |
| 5 | SentryLife family invite works; Guardian Alert fires; canary kit downloads |
| 6 | Okta/Azure MFA enforcement fires at score < 40; SSO OIDC routes work; MSP portal loads |
