# Steps 8.12–8.15 — Admin Puzzle Studio

## 8.12 Admin puzzle studio (create/edit/preview)

**File:** `apps/dashboard/src/app/(ciso)/puzzles/page.tsx`

```typescript
import { requireSession } from '../../../lib/auth'
import { PuzzleStudio } from '../../../components/PuzzleStudio'

export default async function PuzzlesPage() {
  await requireSession(['ciso', 'admin'])
  return <PuzzleStudio />
}
```

**File:** `apps/dashboard/src/components/PuzzleStudio.tsx`

```typescript
'use client'
import { useState } from 'react'
import { BlockKitPreview } from './BlockKitPreview'

interface PuzzleFormData {
  type: string
  difficulty: string
  question: string
  options: Array<{ label: string; value: string }>
  correctAnswer: string
  explanation: string
  tags: string
}

const defaultForm: PuzzleFormData = {
  type: 'true_false',
  difficulty: 'medium',
  question: '',
  options: [{ label: '', value: 'A' }, { label: '', value: 'B' }],
  correctAnswer: 'A',
  explanation: '',
  tags: '',
}

export function PuzzleStudio() {
  const [form, setForm] = useState<PuzzleFormData>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const payload = {
    question: form.question,
    options: form.options,
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/puzzles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          difficulty: form.difficulty,
          payload,
          correct_answer: form.correctAnswer,
          explanation: form.explanation,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSuccess(true)
      setForm(defaultForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      <div className="space-y-4">
        <h1 className="text-xl font-medium text-white">Puzzle Studio</h1>

        <div>
          <label className="block text-sm text-white/60 mb-1">Type</label>
          <select
            className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          >
            <option value="true_false">True / False</option>
            <option value="spot_the_phish">Spot the Phish</option>
            <option value="scenario">Scenario</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Difficulty</label>
          <select
            className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            value={form.difficulty}
            onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Question</label>
          <textarea
            rows={3}
            className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
            value={form.question}
            onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
          />
        </div>

        {form.options.map((opt, idx) => (
          <div key={idx} className="flex gap-2">
            <span className="text-white/40 text-sm mt-2">{opt.value}</span>
            <input
              className="flex-1 bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              placeholder={`Option ${opt.value}`}
              value={opt.label}
              onChange={e => setForm(f => ({
                ...f,
                options: f.options.map((o, i) => i === idx ? { ...o, label: e.target.value } : o),
              }))}
            />
          </div>
        ))}

        <div>
          <label className="block text-sm text-white/60 mb-1">Correct Answer</label>
          <input
            className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            value={form.correctAnswer}
            onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Explanation</label>
          <textarea
            rows={4}
            className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none"
            value={form.explanation}
            onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1">Tags (comma-separated)</label>
          <input
            className="w-full bg-surface-card border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">Puzzle saved!</p>}

        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="w-full h-10 bg-primary rounded-md text-white text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Publish Puzzle'}
        </button>
      </div>

      <div>
        <h2 className="text-sm text-white/60 mb-3">Block Kit Preview</h2>
        <BlockKitPreview payload={payload} />
      </div>
    </div>
  )
}
```

**File:** `apps/dashboard/src/components/BlockKitPreview.tsx`

```typescript
'use client'

interface Option { label: string; value: string }
interface Payload { question: string; options: Option[] }

export function BlockKitPreview({ payload }: { payload: Payload }) {
  return (
    <div className="bg-[#1a1d21] border border-white/10 rounded-xl p-4 font-mono text-sm">
      <div className="text-white/40 text-xs mb-3">Slack DM preview</div>
      <div className="text-white font-medium mb-3 leading-relaxed">{payload.question || 'Your question will appear here...'}</div>
      <div className="space-y-2">
        {payload.options.map(opt => (
          <button
            key={opt.value}
            className="block w-full text-left px-3 py-2 rounded bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-colors"
          >
            {opt.label || `Option ${opt.value}`}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## 8.13 Community puzzle submissions (/suggest-puzzle)

**File:** `apps/api/src/bots/slack/commands/suggestPuzzle.ts`

```typescript
import type { SlashCommand, Middleware } from '@slack/bolt'
import { db } from '../../../db/client'

export const suggestPuzzleCommand: Middleware<SlashCommand> = async ({ command, ack, client }) => {
  await ack()

  await client.views.open({
    trigger_id: command.trigger_id,
    view: {
      type: 'modal',
      callback_id: 'submit_puzzle_suggestion',
      title: { type: 'plain_text', text: 'Suggest a Puzzle' },
      submit: { type: 'plain_text', text: 'Submit' },
      blocks: [
        {
          type: 'input', block_id: 'scenario',
          element: { type: 'plain_text_input', action_id: 'scenario_input', multiline: true, placeholder: { type: 'plain_text', text: 'Describe the security scenario...' } },
          label: { type: 'plain_text', text: 'Scenario' },
        },
        {
          type: 'input', block_id: 'correct_action',
          element: { type: 'plain_text_input', action_id: 'correct_action_input', placeholder: { type: 'plain_text', text: 'What should the user do?' } },
          label: { type: 'plain_text', text: 'Correct Action' },
        },
      ],
    },
  })
}

// Handle submission: insert into puzzle_suggestions table for admin review
slackApp.view('submit_puzzle_suggestion', async ({ view, ack, body }) => {
  await ack()
  const scenario = view.state.values['scenario']?.['scenario_input']?.value ?? ''
  const correctAction = view.state.values['correct_action']?.['correct_action_input']?.value ?? ''

  await db.query(
    `INSERT INTO puzzle_suggestions (submitter_slack_id, scenario, correct_action, status)
     VALUES ($1, $2, $3, 'pending')`,
    [body.user.id, scenario, correctAction],
  )
})
```

**Migration:** Add to `011_elo.sql`:
```sql
CREATE TABLE IF NOT EXISTS puzzle_suggestions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_slack_id  VARCHAR(100) NOT NULL,
  scenario            TEXT NOT NULL,
  correct_action      TEXT NOT NULL,
  status              VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by         UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8.14 MITRE ATT&CK tag taxonomy

Tags are stored in `puzzles.tags TEXT[]`. The weakness map queries incorrect answers grouped by ATT&CK technique:

**File:** `apps/api/src/routes/weaknessMap.ts`

```typescript
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import { db } from '../db/client'

export const weaknessMapRouter = Router()
weaknessMapRouter.use(requireAuth, requireRole('ciso', 'admin'))

weaknessMapRouter.get('/:orgId', async (req, res) => {
  const { orgId } = res.locals.principal!
  const result = await db.query<{ tag: string; incorrect_count: string }>(
    `SELECT unnest(p.tags) AS tag, COUNT(*)::text AS incorrect_count
     FROM puzzle_deliveries pd
     JOIN puzzles p ON p.id = pd.puzzle_id
     JOIN users u ON u.id = pd.user_id
     WHERE u.org_id = $1 AND pd.is_correct = false
       AND pd.delivered_at >= CURRENT_DATE - 90
     GROUP BY tag
     ORDER BY incorrect_count DESC LIMIT 20`,
    [orgId],
  )
  res.json({ weaknesses: result.rows })
})
```

---

## 8.15 Puzzle retirement system

**File:** `apps/api/src/jobs/puzzleRetirement.ts`

```typescript
import { Worker, Queue } from 'bullmq'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'

export const retirementQueue = new Queue('puzzle-retirement', { connection })

export const retirementWorker = new Worker(
  'puzzle-retirement',
  async () => {
    const result = await db.query<{ id: string; accuracy: string; total: string }>(
      `SELECT p.id,
              ROUND(COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1)::text AS accuracy,
              COUNT(*)::text AS total
       FROM puzzles p
       JOIN puzzle_deliveries pd ON pd.puzzle_id = p.id
       WHERE p.active = true
       GROUP BY p.id
       HAVING COUNT(*) >= 100
         AND (COUNT(CASE WHEN pd.is_correct THEN 1 END)::numeric / COUNT(*) * 100) >= 95`,
    )

    for (const row of result.rows) {
      await db.query(`UPDATE puzzles SET active = false WHERE id = $1`, [row.id])
      logger.info({ puzzleId: row.id, accuracy: row.accuracy, total: row.total }, 'Puzzle retired: too easy')
    }

    if (result.rows.length > 0) {
      logger.info({ count: result.rows.length }, 'Puzzles retired this cycle')
    }
  },
  { connection, concurrency: 1, timeout: 30_000 },
)

retirementWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'puzzle-retirement job failed')
})

await retirementQueue.add('weekly', {}, {
  repeat: { pattern: '0 4 * * SUN' },
  removeOnComplete: { count: 10 },
  removeOnFail: { count: 10 },
})
```

**Commit:** `feat(api,dashboard): puzzle studio, /suggest-puzzle, MITRE tags, retirement system (#8.12-8.15)`
