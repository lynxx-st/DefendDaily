# Step 3.12: Phase 3 Integration Tests

## apps/api/src/services/__tests__/phishSimulator.test.ts

```typescript
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';

// Mock Nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
    })),
  },
}));

// Mock DB
vi.mock('../../db/client', () => ({
  db: { query: vi.fn().mockResolvedValue({ rows: [{ id: 'campaign-1' }] }) },
}));

// Mock Redis
vi.mock('../../db/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn() },
}));

import { sendPhishSimulation } from '../phishSimulator';

describe('sendPhishSimulation', () => {
  it('returns a 64-character tracking token', async () => {
    const token = await sendPhishSimulation({
      senderId: 'sender-1',
      targetId: 'target-1',
      targetEmail: 'target@example.com',
      template: {
        id: 'tmpl-1',
        name: 'Test Template',
        subject: 'Test Subject',
        body_html: '<p>Click <a href="http://example.com">here</a></p>',
        lure_type: 'fake_invoice',
        difficulty: 'easy',
      },
      orgId: 'org-1',
    });

    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it('injects tracking pixel into email body', async () => {
    const nodemailer = await import('nodemailer');
    const mockTransport = nodemailer.default.createTransport({} as any);

    await sendPhishSimulation({
      senderId: 'sender-1',
      targetId: 'target-1',
      targetEmail: 'target@example.com',
      template: {
        id: 'tmpl-1',
        name: 'Test',
        subject: 'Test',
        body_html: '<p>Body</p>',
        lure_type: 'fake_invoice',
        difficulty: 'easy',
      },
      orgId: 'org-1',
    });

    const sendMailCalls = vi.mocked(mockTransport.sendMail).mock.calls;
    const htmlBody = sendMailCalls[0]?.[0]?.html as string;
    expect(htmlBody).toContain('/track/open/');
    expect(htmlBody).toContain('<img');
  });
});
```

## Phase 3 Exit Criteria

- [ ] `/phish-a-friend` modal opens with templates and opt-in targets
- [ ] Submitting modal sends an email (check Mailtrap inbox)
- [ ] Email contains tracking pixel (`<img>` with `/track/open/...`)
- [ ] Clicking tracking link in email records click in `phish_campaigns`
- [ ] Clicking link sends Slack teachable moment DM to target
- [ ] `/report-phish` awards 150 Defense Points and records `reported_at`
- [ ] Both `/track/open` and `/track/click` always return 200
- [ ] Rate limiter prevents brute-force token enumeration
- [ ] All 3 pre-send assertions fail gracefully (test each failure mode)
- [ ] All tests pass

**Commit:**
```bash
git add apps/api/src/services/__tests__/phishSimulator.test.ts
git commit -m "test(api): add Phase 3 phish simulator tests with Nodemailer mock"
```

**Update PROGRESS.md:**
- Check off 3.12
- Check off "Phase 3: Peer Phish" in Overall Phase Status
- Set Last Completed to "3.12 — Phase 3 complete ✅"
- Commit: `git commit -m "chore(progress): Phase 3 complete — Peer Phish ready"`
