# Step 1.19: Phase 1 Integration Tests

## Setup

```bash
cd apps/api
pnpm add -D vitest @vitest/coverage-v8 msw
```

Create `apps/api/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/services/**'],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
  },
});
```

## apps/api/src/services/__tests__/puzzleEngine.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { calcPoints } from '../puzzleEngine';

describe('calcPoints — scoring formula', () => {
  it('returns 0 for incorrect answer regardless of difficulty', () => {
    expect(calcPoints(false, 'easy', 5000, 0)).toBe(0);
    expect(calcPoints(false, 'hard', 1000, 100)).toBe(0);
  });

  it('applies difficulty multiplier: easy=1.0, medium=1.5, hard=2.0', () => {
    // All: correct, > 60s response, 0 streak → no speed/streak bonus
    expect(calcPoints(true, 'easy',   90_000, 0)).toBe(100);  // 100 × 1.0 × 1.0 × 1.0
    expect(calcPoints(true, 'medium', 90_000, 0)).toBe(150);  // 100 × 1.5 × 1.0 × 1.0
    expect(calcPoints(true, 'hard',   90_000, 0)).toBe(200);  // 100 × 2.0 × 1.0 × 1.0
  });

  it('applies 1.5x speed bonus for response < 30 seconds', () => {
    expect(calcPoints(true, 'easy', 25_000, 0)).toBe(150);  // 100 × 1.0 × 1.5 × 1.0
  });

  it('applies 1.2x speed bonus for response 30–60 seconds', () => {
    expect(calcPoints(true, 'easy', 45_000, 0)).toBe(120);  // 100 × 1.0 × 1.2 × 1.0
  });

  it('applies streak multiplier: streak=10 → 1 + (10×0.02) = 1.2', () => {
    expect(calcPoints(true, 'easy', 90_000, 10)).toBe(120); // 100 × 1.0 × 1.0 × 1.2
  });

  it('caps streak multiplier at 1.5 when streak >= 25', () => {
    expect(calcPoints(true, 'easy', 90_000, 25)).toBe(150); // 1 + 25×0.02 = 1.5
    expect(calcPoints(true, 'easy', 90_000, 100)).toBe(150); // still capped at 1.5
  });

  it('combines difficulty + speed + streak correctly', () => {
    // hard × < 30s × streak=10: 200 × 1.5 × 1.2 = 360
    expect(calcPoints(true, 'hard', 20_000, 10)).toBe(360);
  });

  it('rounds fractional points to nearest integer', () => {
    // medium × 1.2 speed × streak=5: 150 × 1.2 × (1+5×0.02) = 150 × 1.2 × 1.1 = 198
    expect(calcPoints(true, 'medium', 45_000, 5)).toBe(198);
  });
});
```

Run: `pnpm test`
Expected: all 8 tests pass.

Run with coverage: `pnpm test:coverage`
Expected: `src/services/puzzleEngine.ts` ≥ 80% on all metrics.

## Phase 1 Exit Criteria Checklist

Before moving to Phase 2, verify each item manually:

- [ ] `curl http://localhost:3001/health` returns `{"ok":true,...}`
- [ ] `docker compose ps` shows postgres + redis as healthy
- [ ] `pnpm migrate` runs without errors from a clean DB
- [ ] `pnpm seed` reports 30+ puzzles seeded
- [ ] `/defend` in Slack delivers a puzzle to the calling user
- [ ] Clicking an answer button responds with correct/incorrect + explanation
- [ ] Incorrect answer sets streak to 0 in Redis
- [ ] Correct answer increments streak + updates leaderboard sorted set
- [ ] `/leaderboard` shows top users (or "no scores yet")
- [ ] Daily puzzle job is scheduled and visible in BullMQ queue
- [ ] All 8 scoring formula tests pass
- [ ] Coverage ≥ 80% on `src/services/`

**Commit:**
```bash
git add apps/api/vitest.config.ts apps/api/src/services/__tests__/
git commit -m "test(api): add scoring formula integration tests — all Phase 1 tests passing"
```

**Update PROGRESS.md:**
- Check off 1.19
- Check off "Phase 1: Bot MVP" in Overall Phase Status
- Set Last Completed to "1.19 — Phase 1 complete ✅"
- Commit PROGRESS.md: `git commit -m "chore(progress): Phase 1 complete — Bot MVP ready"`
