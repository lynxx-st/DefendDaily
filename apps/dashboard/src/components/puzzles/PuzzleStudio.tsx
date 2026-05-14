'use client'

import { useState, useTransition } from 'react'
import { BlockKitPreview } from './BlockKitPreview'
import { Button } from '@/components/ui/Button'
import { Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'

type Option = { label: string; value: string }

type DraftPuzzle = {
  type: 'spot_the_phish' | 'true_false' | 'scenario' | 'breach_alert'
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  options: Option[]
  correctAnswer: string
  explanation: string
  tags: string
}

const BLANK: DraftPuzzle = {
  type: 'scenario',
  difficulty: 'medium',
  question: '',
  options: [
    { label: '', value: 'a' },
    { label: '', value: 'b' },
  ],
  correctAnswer: 'a',
  explanation: '',
  tags: '',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-body-sm font-medium text-body-strong">{label}</label>
      {children}
    </div>
  )
}

const INPUT = 'w-full rounded-lg border border-hairline bg-surface-card px-3 py-2 text-body text-sm placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition'

export function PuzzleStudio({ orgId }: { orgId: string }) {
  const [draft, setDraft] = useState<DraftPuzzle>(BLANK)
  const [saving, startSave] = useTransition()
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle')

  function setField<K extends keyof DraftPuzzle>(key: K, value: DraftPuzzle[K]) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setStatus('idle')
  }

  function setOptionLabel(idx: number, label: string) {
    setDraft(prev => ({
      ...prev,
      options: prev.options.map((o, i) => i === idx ? { ...o, label } : o),
    }))
  }

  function addOption() {
    const nextValue = String.fromCharCode(97 + draft.options.length)
    setDraft(prev => ({ ...prev, options: [...prev.options, { label: '', value: nextValue }] }))
  }

  function removeOption(idx: number) {
    setDraft(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== idx),
    }))
  }

  function handleSave() {
    startSave(async () => {
      try {
        const res = await fetch(`/api/puzzles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: draft.type,
            difficulty: draft.difficulty,
            payload: { question: draft.question, options: draft.options },
            correct_answer: draft.correctAnswer,
            explanation: draft.explanation,
            tags: draft.tags.split(',').map(t => t.trim()).filter(Boolean),
            org_id: orgId,
          }),
        })
        if (!res.ok) throw new Error('Save failed')
        setStatus('ok')
        setDraft(BLANK)
      } catch {
        setStatus('err')
      }
    })
  }

  const payload = { question: draft.question, options: draft.options }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      {/* Left — editor */}
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Type">
            <select
              value={draft.type}
              onChange={e => setField('type', e.target.value as DraftPuzzle['type'])}
              className={INPUT}
            >
              <option value="scenario">Scenario</option>
              <option value="spot_the_phish">Spot the Phish</option>
              <option value="true_false">True / False</option>
              <option value="breach_alert">Breach Alert</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select
              value={draft.difficulty}
              onChange={e => setField('difficulty', e.target.value as DraftPuzzle['difficulty'])}
              className={INPUT}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
        </div>

        <Field label="Question">
          <textarea
            rows={4}
            value={draft.question}
            onChange={e => setField('question', e.target.value)}
            placeholder="Describe the scenario or question…"
            className={`${INPUT} resize-none`}
          />
        </Field>

        <Field label="Answer options">
          <div className="space-y-2">
            {draft.options.map((opt, idx) => (
              <div key={opt.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={draft.correctAnswer === opt.value}
                  onChange={() => setField('correctAnswer', opt.value)}
                  className="accent-primary shrink-0"
                />
                <input
                  value={opt.label}
                  onChange={e => setOptionLabel(idx, e.target.value)}
                  placeholder={`Option ${opt.value.toUpperCase()}`}
                  className={`${INPUT} flex-1`}
                />
                {draft.options.length > 2 && (
                  <button onClick={() => removeOption(idx)} className="text-muted hover:text-semantic-error transition shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            {draft.options.length < 4 && (
              <button onClick={addOption} className="flex items-center gap-1.5 text-body-sm text-muted hover:text-body transition">
                <Plus size={13} /> Add option
              </button>
            )}
          </div>
        </Field>

        <Field label="Explanation (shown after answer)">
          <textarea
            rows={3}
            value={draft.explanation}
            onChange={e => setField('explanation', e.target.value)}
            placeholder="Explain what the red flag is and why…"
            className={`${INPUT} resize-none`}
          />
        </Field>

        <Field label="Tags (comma-separated)">
          <input
            value={draft.tags}
            onChange={e => setField('tags', e.target.value)}
            placeholder="phishing, credential-harvesting, T1566"
            className={INPUT}
          />
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving || !draft.question || !draft.explanation}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save Puzzle'}
          </Button>
          <Button variant="ghost" onClick={() => { setDraft(BLANK); setStatus('idle') }}>
            Reset
          </Button>
          {status === 'ok' && (
            <span className="flex items-center gap-1.5 text-semantic-success text-body-sm">
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
          {status === 'err' && (
            <span className="flex items-center gap-1.5 text-semantic-error text-body-sm">
              <AlertCircle size={14} /> Failed to save
            </span>
          )}
        </div>
      </div>

      {/* Right — live preview */}
      <div className="space-y-3 lg:sticky lg:top-24">
        <p className="text-body-sm text-muted font-medium uppercase tracking-wide">Slack preview</p>
        <BlockKitPreview payload={payload} correctAnswer={draft.correctAnswer} />
      </div>
    </div>
  )
}
