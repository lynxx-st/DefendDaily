'use client'

import { useState, useTransition } from 'react'
import { ArrowRight, X, Zap } from 'lucide-react'

interface Props {
  plan: string
  planStatus: string
  orgId: string
}

const GROWTH_FEATURES = ['Phishing simulations', 'CISO dashboard', 'Risk Score heatmap', 'Compliance PDF export']

export function UpgradeBanner({ plan, planStatus }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [loading, start] = useTransition()

  if (dismissed || plan !== 'starter' || planStatus === 'canceled') return null

  function handleUpgrade() {
    start(async () => {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'growth', seat_count: 50 }),
      })
      if (!res.ok) return
      const { url } = await res.json() as { url: string }
      window.location.href = url
    })
  }

  return (
    <div className="relative rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted hover:text-body transition"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/15 p-2 shrink-0">
          <Zap size={16} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-strong font-medium text-sm">Upgrade to Growth — $10/user/year</p>
          <p className="text-muted text-xs mt-0.5 mb-3">Unlock phishing simulations, compliance exports, and full CISO analytics.</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
            {GROWTH_FEATURES.map(f => (
              <li key={f} className="text-xs text-muted flex items-center gap-1">
                <span className="text-semantic-success">✓</span> {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-primary text-on-primary text-sm font-medium hover:bg-primary-active transition disabled:opacity-50"
          >
            {loading ? 'Redirecting…' : 'Start 14-day free trial'}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
