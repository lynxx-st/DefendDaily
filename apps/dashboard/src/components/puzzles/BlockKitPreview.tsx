'use client'

type Option = { label: string; value: string }

type PuzzlePayload = {
  question: string
  options?: Option[]
  image_url?: string
}

export function BlockKitPreview({ payload, correctAnswer }: { payload: PuzzlePayload; correctAnswer: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-deep p-4 space-y-4 font-mono text-sm">
      {/* Slack-like header bar */}
      <div className="flex items-center gap-2 pb-3 border-b border-hairline">
        <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-on-primary font-bold text-xs">D</div>
        <span className="text-body-strong font-sans font-medium">DefendDaily</span>
        <span className="text-muted text-xs font-sans ml-auto">APP</span>
      </div>

      {/* Divider section */}
      <div className="h-px bg-primary/30 rounded" />

      {/* Question */}
      {payload.image_url && (
        <div className="rounded-lg overflow-hidden border border-hairline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={payload.image_url} alt="Puzzle image" className="w-full object-cover max-h-40" />
        </div>
      )}

      <p className="text-body-strong font-sans leading-relaxed whitespace-pre-wrap">{payload.question}</p>

      {/* Options */}
      {payload.options && payload.options.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {payload.options.map((opt) => (
            <button
              key={opt.value}
              disabled
              className={[
                'px-3 py-1.5 rounded text-xs font-sans font-medium border transition-colors',
                opt.value === correctAnswer
                  ? 'bg-semantic-success/15 border-semantic-success/40 text-semantic-success'
                  : 'bg-surface-card border-hairline text-body',
              ].join(' ')}
            >
              {opt.label}
              {opt.value === correctAnswer && ' ✓'}
            </button>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 border-t border-hairline text-muted text-xs font-sans flex items-center gap-1">
        <span>🛡️</span>
        <span>Delivered via DefendDaily · Reply to answer</span>
      </div>
    </div>
  )
}
