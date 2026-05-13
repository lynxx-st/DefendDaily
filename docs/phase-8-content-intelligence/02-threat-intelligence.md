# Steps 8.04–8.07 — Threat Intelligence Integration

## 8.04 CISA KEV feed integration

**File:** `apps/api/src/jobs/cisaKevSync.ts`

```typescript
import { Worker, Queue } from 'bullmq'
import axios from 'axios'
import { z } from 'zod'
import { connection } from './queue'
import { db } from '../db/client'
import { logger } from '../config/logger'
import { generateApprovedPuzzle } from '../services/puzzleGenerator/qualityCheck'

const KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'

const VulnSchema = z.object({
  cveID: z.string(),
  vendorProject: z.string(),
  product: z.string(),
  vulnerabilityName: z.string(),
  dateAdded: z.string(),
  shortDescription: z.string(),
  requiredAction: z.string(),
  dueDate: z.string(),
})

type Vuln = z.infer<typeof VulnSchema>

const INDUSTRY_MAP: Record<string, string[]> = {
  Microsoft: ['finance', 'healthcare', 'saas', 'legal'],
  Cisco: ['finance', 'healthcare'],
  VMware: ['saas'],
  Apache: ['saas'],
  Google: ['saas'],
  Adobe: ['legal', 'saas'],
}

export const cisaKevQueue = new Queue('cisa-kev', { connection })

export const cisaKevWorker = new Worker(
  'cisa-kev',
  async () => {
    const response = await axios.get<{ vulnerabilities: unknown[] }>(KEV_URL, { timeout: 15_000 })
    const vulns = response.data.vulnerabilities
      .map(v => VulnSchema.safeParse(v))
      .filter(r => r.success)
      .map(r => (r as { success: true; data: Vuln }).data)
      .filter(v => {
        const added = new Date(v.dateAdded)
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - 7)
        return added >= cutoff
      })

    logger.info({ count: vulns.length }, 'New KEV entries this week')

    for (const vuln of vulns.slice(0, 5)) {
      const context = `CVE: ${vuln.cveID} affecting ${vuln.product} by ${vuln.vendorProject}. ${vuln.shortDescription}. Required action: ${vuln.requiredAction}`

      const puzzle = await generateApprovedPuzzle('scenario', context)
      if (!puzzle) continue

      const industries = INDUSTRY_MAP[vuln.vendorProject] ?? []
      const contextTrigger = industries.length > 0 ? industries[0] : null

      await db.query(
        `INSERT INTO puzzles (type, difficulty, context_trigger, payload, correct_answer, explanation, tags, active)
         VALUES ('scenario', $1, $2, $3, $4, $5, $6, true)
         ON CONFLICT DO NOTHING`,
        [
          puzzle.difficulty,
          contextTrigger,
          JSON.stringify({ question: puzzle.question, options: puzzle.options, cve_id: vuln.cveID }),
          puzzle.correct_answer,
          puzzle.explanation,
          [...puzzle.tags, vuln.cveID],
        ],
      )
      logger.info({ cveId: vuln.cveID }, 'Created KEV puzzle')
    }
  },
  { connection, concurrency: 1, timeout: 120_000 },
)

cisaKevWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'cisa-kev job failed')
})

await cisaKevQueue.add('weekly-sync', {}, {
  repeat: { pattern: '0 6 * * MON' },
  removeOnComplete: { count: 10 },
  removeOnFail: { count: 20 },
})
```

---

## 8.05 Deepfake & AI social engineering puzzle category

**File:** `apps/api/src/services/puzzleGenerator/prompts/deepfake_social.txt`

```
You are a security awareness trainer creating a puzzle about deepfake and AI-powered social engineering attacks.

Topics include: AI-generated voice cloning (vishing), deepfake video for CEO fraud, LLM-powered spear phishing, AI-generated fake profiles on LinkedIn.

Generate a realistic scenario with exactly 4 answer choices.

Respond with JSON:
{
  "question": "string",
  "options": [{"label": "string", "value": "A"}, ...],
  "correct_answer": "A"|"B"|"C"|"D",
  "explanation": "string (150+ words — explain the deepfake technique, how to detect it, and what the defender should do)",
  "difficulty": "medium"|"hard",
  "tags": ["deepfake", "T1566", ...],
  "confidence": 0.0-1.0
}
```

Seed script to populate initial deepfake puzzles from prompts:
```typescript
// Run once: apps/api/src/db/seeds/seedDeepfakePuzzles.ts
import { generateApprovedPuzzle } from '../../services/puzzleGenerator/qualityCheck'
import { db } from '../client'

const contexts = [
  'CEO audio deepfake used in wire transfer fraud',
  'AI-generated LinkedIn profile used in spear phishing',
  'Voice clone of IT helpdesk used to reset credentials',
  'Deepfake video of executive authorizing policy change',
  'LLM-crafted personalized phishing email using OSINT',
]

for (const context of contexts) {
  const puzzle = await generateApprovedPuzzle('deepfake_social', context)
  if (!puzzle) continue
  await db.query(
    `INSERT INTO puzzles (type, difficulty, context_trigger, payload, correct_answer, explanation, tags, active)
     VALUES ('scenario', $1, 'deepfake_social', $2, $3, $4, $5, true)`,
    [puzzle.difficulty, JSON.stringify({ question: puzzle.question, options: puzzle.options }), puzzle.correct_answer, puzzle.explanation, puzzle.tags],
  )
}
```

---

## 8.06 Physical security puzzle category

**File:** `apps/api/src/services/puzzleGenerator/prompts/physical_security.txt`

```
You are a security awareness trainer creating a physical security puzzle.

Topics include: tailgating through badge-access doors, shoulder surfing, dumpster diving for sensitive documents, USB drop attacks, badge cloning, secure desk policy violations.

Generate a realistic office scenario with exactly 4 answer choices.

Respond with JSON:
{
  "question": "string (describe what the employee observes or encounters)",
  "options": [{"label": "string", "value": "A"}, ...],
  "correct_answer": "A"|"B"|"C"|"D",
  "explanation": "string (150+ words — explain the physical attack vector, consequences, and correct response)",
  "difficulty": "easy"|"medium"|"hard",
  "tags": ["physical-security", "tailgating", ...],
  "confidence": 0.0-1.0
}
```

Add to puzzle bank seed script, targeting `context_trigger = 'physical_security'`.

---

## 8.07 Supply chain attack puzzle category

**File:** `apps/api/src/services/puzzleGenerator/prompts/supply_chain.txt`

```
You are a security awareness trainer creating a supply chain security puzzle.

Topics include: malicious npm/PyPI packages (dependency confusion, typosquatting), fake software updates, compromised build pipelines (SolarWinds-style), vendor email compromise, malicious VS Code extensions.

Generate a realistic developer or business user scenario with exactly 4 answer choices.

Respond with JSON:
{
  "question": "string",
  "options": [{"label": "string", "value": "A"}, ...],
  "correct_answer": "A"|"B"|"C"|"D",
  "explanation": "string (150+ words — explain the supply chain attack technique, T1195 or similar ATT&CK technique, and defensive measures)",
  "difficulty": "medium"|"hard",
  "tags": ["supply-chain", "T1195", ...],
  "confidence": 0.0-1.0
}
```

**Commit:** `feat(api): CISA KEV feed, deepfake/physical/supply-chain puzzle categories (#8.04-8.07)`
