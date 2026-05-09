# Step 1.13: Block Kit Message Builders

## Puzzle payload schemas (stored in `puzzles.payload` JSONB)

Each puzzle type has a fixed payload shape:

```typescript
// true_false
type TrueFalsePayload = { question: string };

// spot_the_phish
type SpotThePhishPayload = {
  image_url: string;    // S3/R2 URL to screenshot
  question: string;     // "What's wrong with this email?"
  options: string[];    // 3-4 options, one correct
};

// scenario
type ScenarioPayload = {
  question: string;
  options: string[];    // 3-4 options
};

// breach_alert
type BreachAlertPayload = {
  breach_name: string;
  question: string;
  options: string[];
};
```

## apps/api/src/bots/slack/messages/puzzleMessage.ts

```typescript
import { KnownBlock } from '@slack/bolt';

export type PuzzleRow = {
  id: string;
  type: 'spot_the_phish' | 'true_false' | 'scenario' | 'breach_alert';
  difficulty: 'easy' | 'medium' | 'hard';
  payload: Record<string, unknown>;
  correct_answer: string;
  explanation: string;
};

const DIFFICULTY_EMOJI = { easy: '🟢', medium: '🟡', hard: '🔴' } as const;

export function buildPuzzleBlocks(puzzle: PuzzleRow, deliveryId: string): KnownBlock[] {
  return [
    buildHeaderBlock(puzzle),
    ...buildContentBlocks(puzzle, deliveryId),
    buildFooterBlock(),
  ];
}

function buildHeaderBlock(puzzle: PuzzleRow): KnownBlock {
  const emoji = DIFFICULTY_EMOJI[puzzle.difficulty];
  const typeLabel = puzzle.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return {
    type: 'header',
    text: { type: 'plain_text', text: `${emoji} Daily Security Puzzle — ${typeLabel}` },
  };
}

function buildContentBlocks(puzzle: PuzzleRow, deliveryId: string): KnownBlock[] {
  switch (puzzle.type) {
    case 'true_false':    return buildTrueFalse(puzzle, deliveryId);
    case 'spot_the_phish': return buildSpotThePhish(puzzle, deliveryId);
    case 'scenario':      return buildScenario(puzzle, deliveryId);
    case 'breach_alert':  return buildBreachAlert(puzzle, deliveryId);
  }
}

function makeAnswerButton(label: string, answer: string, deliveryId: string, style?: 'primary' | 'danger'): object {
  const btn: Record<string, unknown> = {
    type: 'button',
    text: { type: 'plain_text', text: label },
    action_id: 'puzzle_answer',
    value: JSON.stringify({ deliveryId, answer }),
  };
  if (style) btn.style = style;
  return btn;
}

function buildTrueFalse(puzzle: PuzzleRow, deliveryId: string): KnownBlock[] {
  const p = puzzle.payload as { question: string };
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${p.question}*` } },
    {
      type: 'actions',
      elements: [
        makeAnswerButton('✅ True', 'true', deliveryId, 'primary'),
        makeAnswerButton('❌ False', 'false', deliveryId),
      ],
    },
  ];
}

function buildSpotThePhish(puzzle: PuzzleRow, deliveryId: string): KnownBlock[] {
  const p = puzzle.payload as { image_url: string; question: string; options: string[] };
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${p.question}*` } },
    { type: 'image', image_url: p.image_url, alt_text: 'Suspicious email screenshot' },
    {
      type: 'actions',
      elements: p.options.map(opt => makeAnswerButton(opt, opt, deliveryId)),
    },
  ];
}

function buildScenario(puzzle: PuzzleRow, deliveryId: string): KnownBlock[] {
  const p = puzzle.payload as { question: string; options: string[] };
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `*${p.question}*` } },
    {
      type: 'actions',
      elements: p.options.map(opt => makeAnswerButton(opt, opt, deliveryId)),
    },
  ];
}

function buildBreachAlert(puzzle: PuzzleRow, deliveryId: string): KnownBlock[] {
  const p = puzzle.payload as { breach_name: string; question: string; options: string[] };
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `⚠️ *Breach Alert: ${p.breach_name}*\n\n${p.question}`,
      },
    },
    {
      type: 'actions',
      elements: p.options.map(opt => makeAnswerButton(opt, opt, deliveryId)),
    },
  ];
}

function buildFooterBlock(): KnownBlock {
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: '⏰ Answer within 24 hours to keep your streak. _DefendDaily_' }],
  };
}
```

**Commit:**
```bash
git add apps/api/src/bots/slack/messages/
git commit -m "feat(slack): add Block Kit puzzle message builders for all puzzle types"
```

**Update PROGRESS.md:** Check off 1.13. Set Last Completed to "1.13 — Block Kit builders".
