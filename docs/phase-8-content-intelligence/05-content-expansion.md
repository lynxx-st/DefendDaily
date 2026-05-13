# Steps 8.16–8.20 — Content Expansion

## 8.16 DeepL API translation pipeline

**Install:** `pnpm add deepl-node` in `apps/api`

Add to `env.ts`: `DEEPL_API_KEY: z.string().optional()`

**File:** `apps/api/src/services/translation.ts`

```typescript
import * as deepl from 'deepl-node'
import { db } from '../db/client'
import { logger } from '../config/logger'
import { env } from '../config/env'

const TARGET_LOCALES: deepl.TargetLanguageCode[] = ['es', 'fr', 'de']

export async function translatePuzzle(puzzleId: string): Promise<void> {
  if (!env.DEEPL_API_KEY) {
    logger.warn('DEEPL_API_KEY not configured — skipping translation')
    return
  }

  const translator = new deepl.Translator(env.DEEPL_API_KEY)
  const row = await db.query<{ payload: { question: string; options: Array<{ label: string; value: string }> }; explanation: string }>(
    `SELECT payload, explanation FROM puzzles WHERE id = $1`,
    [puzzleId],
  )
  const puzzle = row.rows[0]
  if (!puzzle) return

  const translations: Record<string, unknown> = {}

  for (const locale of TARGET_LOCALES) {
    try {
      const [questionResult, explanationResult, ...optionResults] = await Promise.all([
        translator.translateText(puzzle.payload.question, null, locale),
        translator.translateText(puzzle.explanation, null, locale),
        ...puzzle.payload.options.map(opt => translator.translateText(opt.label, null, locale)),
      ])

      translations[locale] = {
        question: (questionResult as deepl.TextResult).text,
        explanation: (explanationResult as deepl.TextResult).text,
        options: puzzle.payload.options.map((opt, i) => ({
          label: (optionResults[i] as deepl.TextResult).text,
          value: opt.value,
        })),
      }
    } catch (err) {
      logger.warn({ err, puzzleId, locale }, 'Translation failed for locale')
    }
  }

  await db.query(
    `UPDATE puzzles SET translations = $1 WHERE id = $2`,
    [JSON.stringify(translations), puzzleId],
  )
  logger.info({ puzzleId, locales: Object.keys(translations) }, 'Puzzle translated')
}

export async function translateNewPuzzles(): Promise<void> {
  const result = await db.query<{ id: string }>(
    `SELECT id FROM puzzles WHERE active = true AND (translations = '{}' OR translations IS NULL) LIMIT 20`,
  )
  for (const row of result.rows) {
    await translatePuzzle(row.id)
  }
}
```

Schedule weekly: `0 3 * * WED` in a BullMQ repeatable job.

---

## 8.17 AI-assisted phishing screenshot generation

Use Claude's vision capability to generate textual descriptions of phishing screenshots for use in `spot_the_phish` puzzles. Full screenshot generation requires a headless browser (Playwright) which is out-of-scope for MVP — instead, generate realistic HTML-based mockups:

**File:** `apps/api/src/services/puzzleGenerator/prompts/spot_the_phish_html.txt`

```
You are generating a realistic HTML email that contains exactly ONE phishing red flag.

Requirements:
- The email must look like a legitimate corporate communication
- It must contain exactly one subtle red flag (domain typo, urgency language, mismatched sender, suspicious link, etc.)
- The HTML must be self-contained (no external resources)
- Output ONLY the HTML, no explanation

After the HTML, on a new line starting with "RED_FLAG:", describe the single red flag in 20 words or fewer.
After the HTML, on a new line starting with "EXPLANATION:", provide 150+ words explaining the red flag.
```

The `spot_the_phish` puzzle type can display this HTML in a sandboxed iframe in the dashboard preview. In Slack, the question text describes what the user would see (the image_url field can point to a pre-rendered screenshot stored in S3).

---

## 8.18 500+ puzzle bank expansion

**File:** `apps/api/src/db/seeds/bulkGeneratePuzzles.ts`

```typescript
import { generateApprovedPuzzle } from '../../services/puzzleGenerator/qualityCheck'
import { db } from '../client'

const GENERATION_PLAN = [
  { type: 'spot_the_phish',   count: 100, contexts: ['invoice fraud', 'password reset', 'CEO impersonation', 'MFA bypass', 'fake IT support', 'package delivery', 'job offer', 'tax form', 'benefits update', 'cloud storage link'] },
  { type: 'true_false',       count: 100, contexts: ['password hygiene', 'MFA methods', 'social engineering', 'HTTPS misconceptions', 'public Wi-Fi risks', 'USB security', 'software updates', 'email authentication', 'browser security', 'mobile security'] },
  { type: 'scenario',         count: 150, contexts: ['insider threat', 'tailgating', 'vishing', 'smishing', 'ransomware response', 'data classification', 'secure file sharing', 'incident reporting', 'travel security', 'home office security', 'supply chain', 'cloud misconfiguration', 'API key leakage', 'shadow IT', 'BYOD risks'] },
  { type: 'deepfake_social',  count: 50,  contexts: ['CEO audio clone', 'fake video call', 'AI-generated phishing email', 'fake LinkedIn profile', 'voice phishing with AI'] },
  { type: 'physical_security', count: 50, contexts: ['tailgating', 'shoulder surfing', 'dumpster diving', 'USB drop', 'printer security', 'whiteboard data', 'badge security'] },
  { type: 'supply_chain',     count: 50,  contexts: ['malicious npm package', 'typosquatting PyPI', 'compromised CI pipeline', 'fake VS Code extension', 'malicious browser extension'] },
]

let generated = 0
let failed = 0

for (const plan of GENERATION_PLAN) {
  for (const context of plan.contexts) {
    const perContext = Math.ceil(plan.count / plan.contexts.length)
    for (let i = 0; i < perContext; i++) {
      const puzzle = await generateApprovedPuzzle(plan.type, `${context} (variant ${i + 1})`)
      if (!puzzle) { failed++; continue }

      await db.query(
        `INSERT INTO puzzles (type, difficulty, payload, correct_answer, explanation, tags, active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT DO NOTHING`,
        [
          plan.type === 'deepfake_social' || plan.type === 'physical_security' || plan.type === 'supply_chain' ? 'scenario' : plan.type,
          puzzle.difficulty,
          JSON.stringify({ question: puzzle.question, options: puzzle.options, context_tag: plan.type }),
          puzzle.correct_answer,
          puzzle.explanation,
          puzzle.tags,
        ],
      )
      generated++
    }
  }
}

process.stdout.write(`Generated: ${generated}, Failed: ${failed}\n`)
```

Run with: `pnpm tsx apps/api/src/db/seeds/bulkGeneratePuzzles.ts`

---

## 8.19 Puzzle effectiveness dashboard

**File:** `apps/dashboard/src/app/(ciso)/puzzles/effectiveness/page.tsx`

```typescript
import { requireSession } from '../../../../lib/auth'
import { apiClient } from '../../../../lib/apiClient'
import { DataTable } from '../../../../components/ui/DataTable'

export default async function PuzzleEffectivenessPage() {
  const session = await requireSession(['ciso', 'admin'])
  const data = await apiClient('/api/analytics/puzzles/engagement', session)

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-medium text-white">Puzzle Effectiveness</h1>
      <DataTable
        columns={[
          { key: 'type',            label: 'Type' },
          { key: 'difficulty',      label: 'Difficulty' },
          { key: 'total_shown',     label: 'Shown' },
          { key: 'accuracy',        label: 'Accuracy %', sortable: true },
          { key: 'skip_rate',       label: 'Skip Rate %', sortable: true },
          { key: 'avg_response_ms', label: 'Avg Response (ms)', sortable: true },
        ]}
        rows={data.puzzles}
      />
    </div>
  )
}
```

---

## 8.20 Phase 8 tests

**File:** `apps/api/src/services/__tests__/spacedRepetition.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../db/client', () => ({ db: { query: vi.fn() } }))

import { db } from '../../db/client'
import { updateLeitnerBox } from '../spacedRepetition'

const mockDb = vi.mocked(db)

describe('updateLeitnerBox', () => {
  beforeEach(() => vi.clearAllMocks())

  it('moves box up on correct answer', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ leitner_box: 2 }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await updateLeitnerBox('user-1', 'puzzle-1', true)

    const upsertCall = mockDb.query.mock.calls[1]!
    expect(upsertCall[1]?.[2]).toBe(3) // box advanced from 2 to 3
  })

  it('resets to box 1 on incorrect answer', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ leitner_box: 4 }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await updateLeitnerBox('user-1', 'puzzle-1', false)

    const upsertCall = mockDb.query.mock.calls[1]!
    expect(upsertCall[1]?.[2]).toBe(1) // reset to box 1
  })

  it('caps at box 5', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ leitner_box: 5 }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await updateLeitnerBox('user-1', 'puzzle-1', true)

    const upsertCall = mockDb.query.mock.calls[1]!
    expect(upsertCall[1]?.[2]).toBe(5) // capped at 5
  })

  it('defaults to box 1 when no existing state', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await updateLeitnerBox('user-1', 'puzzle-1', true)

    const upsertCall = mockDb.query.mock.calls[1]!
    expect(upsertCall[1]?.[2]).toBe(2) // 1 (default) + 1 on correct
  })
})
```

**File:** `apps/api/src/services/__tests__/eloCalibration.test.ts`

```typescript
import { describe, it, expect } from 'vitest'

// Pure math test - no DB needed
function expectedScore(playerElo: number, puzzleElo: number): number {
  return 1 / (1 + Math.pow(10, (puzzleElo - playerElo) / 400))
}

describe('Elo expected score', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5)
  })

  it('returns > 0.5 when player is stronger', () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5)
  })

  it('returns < 0.5 when puzzle is harder', () => {
    expect(expectedScore(1200, 1600)).toBeLessThan(0.5)
  })
})

// A/B determinism test
function assignVariant(userId: string, group: string): 'A' | 'B' {
  const { createHash } = require('crypto') as typeof import('crypto')
  const hash = createHash('sha256').update(userId + group).digest('hex')
  return parseInt(hash.slice(0, 8), 16) % 2 === 0 ? 'A' : 'B'
}

describe('A/B variant assignment', () => {
  it('is deterministic for the same user and group', () => {
    const v1 = assignVariant('user-abc', 'group-1')
    const v2 = assignVariant('user-abc', 'group-1')
    expect(v1).toBe(v2)
  })

  it('differs by group for the same user', () => {
    const results = new Set(['A', 'B'])
    // With enough groups, both variants should appear
    const variants = Array.from({ length: 20 }, (_, i) => assignVariant('user-abc', `group-${i}`))
    expect(variants.filter(v => v === 'A').length).toBeGreaterThan(0)
    expect(variants.filter(v => v === 'B').length).toBeGreaterThan(0)
    variants.forEach(v => expect(results.has(v)).toBe(true))
  })
})
```

**Commit:** `feat(api,dashboard): translations, puzzle expansion, effectiveness dashboard, phase 8 tests (#8.16-8.20)`
