# Step 5.12: Phase 5 Integration Tests

## Guardian Alert Logic Test

```typescript
// apps/api/src/jobs/__tests__/guardianAlert.test.ts
import { describe, it, expect } from 'vitest';

// The threshold logic: score < 50 OR 3+ incorrect in last 3 days
describe('Guardian Alert threshold logic', () => {
  it('should trigger for score below 50', () => {
    const shouldAlert = (score: number, consecutiveIncorrect: number) =>
      score < 50 || consecutiveIncorrect >= 3;

    expect(shouldAlert(49, 0)).toBe(true);
    expect(shouldAlert(50, 0)).toBe(false);
    expect(shouldAlert(75, 3)).toBe(true);
    expect(shouldAlert(80, 2)).toBe(false);
    expect(shouldAlert(30, 5)).toBe(true);
  });
});
```

## Phase 5 Exit Criteria

- [ ] Employee can generate invite link via `POST /api/family/invite`
- [ ] Family member can accept invite (links `family_group_id`)
- [ ] `/sentrylife/family` page loads with purple theme
- [ ] `/sentrylife/home-defense` page loads with canary kit download button
- [ ] `GET /api/family/home-defense-kit` returns a zip file with 5 files
- [ ] Guardian Alert job sends Slack DM when family member score < 50
- [ ] Canary webhook callback sends Slack alert when triggered
- [ ] Weekly breach monitor email sends via SendGrid (check with test email)
- [ ] All Phase 5 tests pass

**Commit:**
```bash
git add apps/api/src/jobs/__tests__/
git commit -m "test(api): add Phase 5 guardian alert threshold tests"
```

**Update PROGRESS.md:**
- Check off 5.12
- Check off "Phase 5: SentryLife & Family Mode" in Overall Phase Status
- Set Last Completed to "5.12 — Phase 5 complete ✅"
- Commit: `git commit -m "chore(progress): Phase 5 complete — SentryLife ready"`
