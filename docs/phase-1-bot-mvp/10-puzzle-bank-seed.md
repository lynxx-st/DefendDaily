# Step 1.17: Puzzle Bank Seed (30+ Puzzles)

## Puzzle JSON schema

All puzzles are stored as `.json` files in `packages/puzzle-bank/{type}/`.

```typescript
// Each file must conform to this shape:
type PuzzleFile = {
  type: 'spot_the_phish' | 'true_false' | 'scenario' | 'breach_alert';
  difficulty: 'easy' | 'medium' | 'hard';
  context_trigger?: 'travel' | 'finance' | 'new_hire' | 'breach' | null;
  payload: TrueFalsePayload | SpotThePhishPayload | ScenarioPayload | BreachAlertPayload;
  correct_answer: string;
  explanation: string;
  tags: string[];
};
```

## Example puzzle files to create (minimum 30 total)

### packages/puzzle-bank/true-false/001-mfa-push.json
```json
{
  "type": "true_false",
  "difficulty": "easy",
  "payload": {
    "question": "You receive an MFA push notification on your phone, but you did NOT just log in anywhere. You should approve it to see what happens."
  },
  "correct_answer": "false",
  "explanation": "Never approve unsolicited MFA pushes — this is a classic MFA fatigue attack. Attackers spam push requests hoping you'll accidentally approve one. Deny and report it to IT.",
  "tags": ["mfa", "social-engineering", "fatigue-attack"]
}
```

### packages/puzzle-bank/true-false/002-password-reuse.json
```json
{
  "type": "true_false",
  "difficulty": "easy",
  "payload": {
    "question": "Using the same password for your work email and a gaming website is fine as long as the password is strong (20+ characters)."
  },
  "correct_answer": "false",
  "explanation": "Password strength doesn't matter if the site you reuse it on gets breached. Credential stuffing attacks use leaked passwords from one site to log into others. Use a password manager.",
  "tags": ["passwords", "credential-stuffing", "reuse"]
}
```

### packages/puzzle-bank/scenarios/001-hotel-wifi.json
```json
{
  "type": "scenario",
  "difficulty": "medium",
  "context_trigger": "travel",
  "payload": {
    "question": "You're staying at a hotel for a work conference. You need to access your company's internal dashboard. What should you do?",
    "options": [
      "Connect to Hotel_Guest_WiFi and browse normally",
      "Connect via your company VPN before accessing anything work-related",
      "Only visit HTTPS sites so you're protected",
      "Use the hotel's business center computer instead"
    ]
  },
  "correct_answer": "Connect via your company VPN before accessing anything work-related",
  "explanation": "Public WiFi can be intercepted (evil twin attacks, sniffing). A VPN encrypts your traffic end-to-end. HTTPS alone doesn't protect metadata or DNS queries. The business center PC is likely shared and unmanaged.",
  "tags": ["travel", "wifi", "vpn", "network-security"]
}
```

### packages/puzzle-bank/scenarios/002-ceo-wire-transfer.json
```json
{
  "type": "scenario",
  "difficulty": "hard",
  "payload": {
    "question": "Your CFO emails you asking to wire $45,000 to a new vendor ASAP. They say they're in a board meeting and can't talk. The email looks legitimate. What do you do?",
    "options": [
      "Process it — the CFO is trustworthy and it's urgent",
      "Reply to the email asking for more details before wiring",
      "Call the CFO directly on their known work phone to verify",
      "Forward to your manager and let them decide"
    ]
  },
  "correct_answer": "Call the CFO directly on their known work phone to verify",
  "explanation": "This is Business Email Compromise (BEC) — one of the most costly cybercrimes. Email can be spoofed. Always verify wire transfers out-of-band (phone call to a known number, NOT a number in the email). Replying to the email just reaches the attacker.",
  "tags": ["bec", "wire-fraud", "social-engineering", "impersonation"]
}
```

Create at minimum:
- **10 true_false** puzzles (mix easy + medium): mfa, passwords, phishing tells, HTTPS misconceptions, USB drops, public WiFi, screen locking, software updates
- **10 scenarios** (mix medium + hard): BEC wire transfer, hotel WiFi, shoulder surfing, USB drop, software installation request, HR data request, IT impersonation, travel security, smishing, vishing
- **8 spot_the_phish** (medium + hard): fake login pages (Google, Microsoft, bank), suspicious URLs, typosquatting, mismatched sender domains, urgency language, fake invoices
- **2 breach_alert** (hard): credential breach response, password change priority

## apps/api/src/db/seed.ts

```typescript
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { db } from './client';

async function seed() {
  const bankDir = join(__dirname, '../../../packages/puzzle-bank');
  const typeDirs = readdirSync(bankDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let count = 0;
  for (const typeDir of typeDirs) {
    const files = readdirSync(join(bankDir, typeDir)).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const puzzle = JSON.parse(readFileSync(join(bankDir, typeDir, file), 'utf8'));
      await db.query(`
        INSERT INTO puzzles (type, difficulty, context_trigger, payload, correct_answer, explanation, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [
        puzzle.type,
        puzzle.difficulty,
        puzzle.context_trigger ?? null,
        JSON.stringify(puzzle.payload),
        puzzle.correct_answer,
        puzzle.explanation,
        puzzle.tags ?? [],
      ]);
      count++;
    }
  }
  console.log(`✅ Seeded ${count} puzzles`);
  await db.end();
}

seed().catch((err) => { console.error(err); process.exit(1); });
```

Run: `pnpm seed`
Expected: `✅ Seeded 30 puzzles` (or however many you created)

**Commit:**
```bash
git add packages/puzzle-bank/ apps/api/src/db/seed.ts
git commit -m "feat(puzzle-bank): seed 30+ puzzles across all types and difficulties"
```

**Update PROGRESS.md:** Check off 1.17. Set Last Completed to "1.17 — puzzle bank seeded".
