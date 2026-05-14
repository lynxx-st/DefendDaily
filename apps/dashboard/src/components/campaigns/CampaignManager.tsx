'use client'

import { useState, useTransition } from 'react'
import type { Campaign } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Trash2, Calendar, Users, Target } from 'lucide-react'

type NewCampaign = {
  name: string
  description: string
  puzzle_type: string
  difficulty: string
  start_date: string
  end_date: string
}

const BLANK: NewCampaign = {
  name: '',
  description: '',
  puzzle_type: '',
  difficulty: '',
  start_date: new Date().toISOString().split('T')[0] ?? '',
  end_date: new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0] ?? '',
}

const INPUT = 'w-full rounded-lg border border-hairline bg-surface-card px-3 py-2 text-body text-sm placeholder:text-muted focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition'

function CampaignCard({ campaign, onDelete }: { campaign: Campaign; onDelete: () => void }) {
  const [deleting, start] = useTransition()
  const now = new Date()
  const start_ = new Date(campaign.start_date)
  const end = new Date(campaign.end_date)
  const status = now < start_ ? 'upcoming' : now <= end ? 'active' : 'ended'

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body-strong font-medium truncate">{campaign.name}</h3>
          {campaign.description && (
            <p className="text-muted text-body-sm mt-0.5 line-clamp-2">{campaign.description}</p>
          )}
        </div>
        <Badge variant={status === 'active' ? 'success' : status === 'upcoming' ? 'default' : 'error'}>
          {status}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {campaign.start_date} → {campaign.end_date}
        </span>
        {campaign.puzzle_type && (
          <span className="flex items-center gap-1">
            <Target size={12} />
            {campaign.puzzle_type.replace(/_/g, ' ')}
          </span>
        )}
        {campaign.difficulty && (
          <span className="flex items-center gap-1">
            <Users size={12} />
            {campaign.difficulty}
          </span>
        )}
      </div>

      <div className="pt-1 flex justify-end">
        <button
          onClick={() => start(onDelete)}
          disabled={deleting}
          className="text-muted hover:text-semantic-error transition text-xs flex items-center gap-1"
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>
    </Card>
  )
}

export function CampaignManager({ initial }: { initial: Campaign[] }) {
  const [campaigns, setCampaigns] = useState(initial)
  const [draft, setDraft] = useState(BLANK)
  const [creating, startCreate] = useTransition()
  const [showForm, setShowForm] = useState(false)

  function setField(key: keyof NewCampaign, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  function handleCreate() {
    startCreate(async () => {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description || undefined,
          puzzle_type: draft.puzzle_type || undefined,
          difficulty: draft.difficulty || undefined,
          start_date: draft.start_date,
          end_date: draft.end_date,
        }),
      })
      if (!res.ok) return
      const { id } = await res.json() as { id: string }
      const newCampaign: Campaign = {
        ...draft,
        id,
        puzzle_type: draft.puzzle_type || null,
        difficulty: draft.difficulty || null,
        description: draft.description || null,
        dept_filter: [],
        created_at: new Date().toISOString(),
      }
      setCampaigns(prev => [newCampaign, ...prev])
      setDraft(BLANK)
      setShowForm(false)
    })
  }

  async function handleDelete(id: string) {
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted text-body-sm">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} />
          New Campaign
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 space-y-4 border-primary/30">
          <h3 className="text-body-strong font-medium">New Training Campaign</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-body-sm font-medium text-body-strong">Campaign Name</label>
              <input value={draft.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Phishing Awareness Month" className={INPUT} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-body-sm font-medium text-body-strong">Description (optional)</label>
              <input value={draft.description} onChange={e => setField('description', e.target.value)} placeholder="Brief description…" className={INPUT} />
            </div>
            <div className="space-y-1.5">
              <label className="text-body-sm font-medium text-body-strong">Puzzle Type</label>
              <select value={draft.puzzle_type} onChange={e => setField('puzzle_type', e.target.value)} className={INPUT}>
                <option value="">All types</option>
                <option value="spot_the_phish">Spot the Phish</option>
                <option value="true_false">True / False</option>
                <option value="scenario">Scenario</option>
                <option value="breach_alert">Breach Alert</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-body-sm font-medium text-body-strong">Difficulty</label>
              <select value={draft.difficulty} onChange={e => setField('difficulty', e.target.value)} className={INPUT}>
                <option value="">Mixed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-body-sm font-medium text-body-strong">Start Date</label>
              <input type="date" value={draft.start_date} onChange={e => setField('start_date', e.target.value)} className={INPUT} />
            </div>
            <div className="space-y-1.5">
              <label className="text-body-sm font-medium text-body-strong">End Date</label>
              <input type="date" value={draft.end_date} onChange={e => setField('end_date', e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleCreate} disabled={creating || !draft.name || !draft.start_date || !draft.end_date}>
              {creating ? 'Creating…' : 'Create Campaign'}
            </Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {campaigns.length === 0 && !showForm ? (
        <Card className="p-12 text-center text-muted">
          No campaigns yet. Create one to assign themed puzzle sets to your team.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(c => (
            <CampaignCard key={c.id} campaign={c} onDelete={() => handleDelete(c.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
