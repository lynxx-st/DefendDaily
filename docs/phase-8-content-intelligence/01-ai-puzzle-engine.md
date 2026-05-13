# Steps 8.01–8.03 — AI Puzzle Engine

## 8.01 Claude API integration for AI puzzle generation

**Install:** `pnpm add @anthropic-ai/sdk` in `apps/api`

Add to `apps/api/src/config/env.ts`:
```typescript
ANTHROPIC_API_KEY: z.string().min(1),
```

**File:** `apps/api/src/services/puzzleGenerator/prompts/spot_the_phish.txt`

```
You are a security awareness trainer creating a "Spot the Phish" puzzle for a corporate training platform.

Generate a realistic phishing scenario with exactly 4 answer options where only one is the correct red flag to spot.

Respond with valid JSON matching this exact structure:
{
  "question": "string (describe the scenario and what the user is looking at)",
  "options": [
    { "label": "string", "value": "A" },
    { "label": "string", "value": "B" },
    { "label": "string", "value": "C" },
    { "label": "string", "value": "D" }
  ],
  "correct_answer": "A" | "B" | "C" | "D",
  "explanation": "string (150+ words explaining the red flag in detail, including what the attacker intended and how to avoid similar attacks)",
  "difficulty": "easy" | "medium" | "hard",
  "tags": ["string"],
  "confidence": 0.0-1.0
}

Requirements:
- The scenario must be based on a real attack technique
- The explanation must be at least 150 words
- confidence must reflect your certainty that the correct answer is unambiguous
- Tags should include relevant MITRE ATT&CK technique IDs where applicable
```

**File:** `apps/api/src/services/puzzleGenerator/generate.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { z } from 'zod'
import { env } from '../../config/env'
import { logger } from '../../config/logger'

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

const GeneratedPuzzleSchema = z.object({
  question: z.string().min(20),
  options: z.array(z.object({ label: z.string(), value: z.string() })).min(2).max(6),
  correct_answer: z.string(),
  explanation: z.string().min(50),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
})

type GeneratedPuzzle = z.infer<typeof GeneratedPuzzleSchema>

const PROMPT_CACHE: Map<string, string> = new Map()

function loadPrompt(puzzleType: string): string {
  const cached = PROMPT_CACHE.get(puzzleType)
  if (cached) return cached
  const prompt = readFileSync(join(__dirname, 'prompts', `${puzzleType}.txt`), 'utf-8')
  PROMPT_CACHE.set(puzzleType, prompt)
  return prompt
}

export async function generatePuzzle(
  puzzleType: string,
  context?: string,
): Promise<GeneratedPuzzle | null> {
  const systemPrompt = loadPrompt(puzzleType)
  const userMessage = context
    ? `Generate a puzzle about: ${context}`
    : 'Generate a new puzzle.'

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.warn({ puzzleType }, 'AI response contained no JSON')
      return null
    }

    const parsed = GeneratedPuzzleSchema.safeParse(JSON.parse(jsonMatch[0]))
    if (!parsed.success) {
      logger.warn({ puzzleType, errors: parsed.error.flatten() }, 'AI puzzle failed schema validation')
      return null
    }
    return parsed.data
  } catch (err) {
    logger.error({ err, puzzleType }, 'AI puzzle generation failed')
    return null
  }
}
```

---

## 8.02 Puzzle quality scoring pipeline

**File:** `apps/api/src/services/puzzleGenerator/qualityCheck.ts`

```typescript
import { logger } from '../../config/logger'

interface GeneratedPuzzle {
  question: string
  options: Array<{ label: string; value: string }>
  correct_answer: string
  explanation: string
  difficulty: string
  tags: string[]
  confidence: number
}

interface QualityResult {
  approved: boolean
  reasons: string[]
}

export function checkPuzzleQuality(puzzle: GeneratedPuzzle): QualityResult {
  const reasons: string[] = []

  if (puzzle.explanation.split(/\s+/).length < 50) {
    reasons.push(`Explanation too short: ${puzzle.explanation.split(/\s+/).length} words (min 50)`)
  }
  if (puzzle.options.length < 2) {
    reasons.push(`Fewer than 2 answer options: ${puzzle.options.length}`)
  }
  if (!puzzle.options.some(o => o.value === puzzle.correct_answer)) {
    reasons.push(`Correct answer "${puzzle.correct_answer}" not found in options`)
  }
  if (puzzle.confidence < 0.8) {
    reasons.push(`Confidence too low: ${puzzle.confidence} (min 0.8)`)
  }
  if (puzzle.question.length < 20) {
    reasons.push('Question too short')
  }

  if (reasons.length > 0) {
    logger.warn({ reasons }, 'Puzzle quality check failed')
  }

  return { approved: reasons.length === 0, reasons }
}

export async function generateApprovedPuzzle(
  puzzleType: string,
  context?: string,
  maxAttempts = 3,
): Promise<GeneratedPuzzle | null> {
  const { generatePuzzle } = await import('./generate')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const puzzle = await generatePuzzle(puzzleType, context)
    if (!puzzle) continue
    const quality = checkPuzzleQuality(puzzle)
    if (quality.approved) return puzzle
    logger.info({ attempt, reasons: quality.reasons }, 'Retrying puzzle generation after quality failure')
  }
  logger.warn({ puzzleType, maxAttempts }, 'All puzzle generation attempts failed quality check')
  return null
}
```

---

## 8.03 Spaced repetition algorithm (Leitner box)

**Migration:** `apps/api/src/db/migrations/010_spaced_repetition.sql`

```sql
ALTER TABLE puzzles ADD COLUMN IF NOT EXISTS leitner_box SMALLINT DEFAULT 1 CHECK (leitner_box BETWEEN 1 AND 5);

CREATE TABLE IF NOT EXISTS user_puzzle_state (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id        UUID REFERENCES puzzles(id) ON DELETE CASCADE,
  leitner_box      SMALLINT DEFAULT 1 CHECK (leitner_box BETWEEN 1 AND 5),
  next_review_date DATE DEFAULT CURRENT_DATE,
  last_answered_at TIMESTAMPTZ,
  UNIQUE(user_id, puzzle_id)
);

CREATE INDEX idx_user_puzzle_state_review ON user_puzzle_state(user_id, next_review_date);
```

**File:** `apps/api/src/services/spacedRepetition.ts`

```typescript
import { db } from '../db/client'

const BOX_INTERVALS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }

export async function updateLeitnerBox(
  userId: string,
  puzzleId: string,
  isCorrect: boolean,
): Promise<void> {
  const state = await db.query<{ leitner_box: number }>(
    `SELECT leitner_box FROM user_puzzle_state WHERE user_id = $1 AND puzzle_id = $2`,
    [userId, puzzleId],
  )
  const currentBox = state.rows[0]?.leitner_box ?? 1
  const newBox = isCorrect
    ? Math.min(currentBox + 1, 5)
    : 1
  const interval = BOX_INTERVALS[newBox] ?? 1
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + interval)

  await db.query(
    `INSERT INTO user_puzzle_state (user_id, puzzle_id, leitner_box, next_review_date, last_answered_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, puzzle_id) DO UPDATE
       SET leitner_box = $3, next_review_date = $4, last_answered_at = NOW()`,
    [userId, puzzleId, newBox, nextReview.toISOString().split('T')[0]],
  )
}

export async function getDueReviewPuzzleId(userId: string): Promise<string | null> {
  const result = await db.query<{ puzzle_id: string }>(
    `SELECT puzzle_id FROM user_puzzle_state
     WHERE user_id = $1 AND next_review_date <= CURRENT_DATE AND leitner_box < 5
     ORDER BY next_review_date ASC, leitner_box ASC LIMIT 1`,
    [userId],
  )
  return result.rows[0]?.puzzle_id ?? null
}
```

Call `updateLeitnerBox` from the answer handler. Call `getDueReviewPuzzleId` in `dailyPuzzle.ts` to prioritize review puzzles before selecting new ones.

**Commit:** `feat(api): Claude AI puzzle generation, quality pipeline, spaced repetition (#8.01-8.03)`
