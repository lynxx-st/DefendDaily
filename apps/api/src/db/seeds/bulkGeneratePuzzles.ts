// Run with: pnpm tsx apps/api/src/db/seeds/bulkGeneratePuzzles.ts
import 'dotenv/config'
import { db } from '../client'
import { env } from '../../config/env'
import { generateApprovedPuzzle } from '../../services/puzzleGenerator/qualityCheck'

if (!env.ANTHROPIC_API_KEY) {
  process.stderr.write('ANTHROPIC_API_KEY not set\n')
  process.exit(1)
}

const BATCH: Array<{ type: 'scenario' | 'spot_the_phish' | 'true_false'; context: string; tags: string[] }> = [
  // Deepfake / AI social engineering
  { type: 'scenario', context: 'An employee receives a voice message on WhatsApp that sounds exactly like their CEO asking for an urgent wire transfer. The caller ID shows the CEO\'s number.', tags: ['deepfake', 'vishing', 'social-engineering', 'T1566'] },
  { type: 'scenario', context: 'A video call is requested with someone claiming to be the CFO, but the video looks slightly jerky and the lip sync is off. They are requesting login credentials.', tags: ['deepfake', 'video-call', 'social-engineering'] },
  { type: 'scenario', context: 'An AI-generated email perfectly mimics your manager\'s writing style and includes details from your last team meeting, asking you to approve a vendor payment.', tags: ['deepfake', 'spear-phishing', 'T1566.001'] },
  { type: 'true_false', context: 'Real-time audio deepfakes can be generated during a live phone call to impersonate known voices.', tags: ['deepfake', 'vishing'] },
  { type: 'scenario', context: 'A recruiter on LinkedIn has a photo, work history, and mutual connections, but reverse image search reveals the photo matches a model stock image.', tags: ['deepfake', 'social-engineering', 'linkedin'] },

  // Physical security
  { type: 'scenario', context: 'A well-dressed person follows you through a badge-controlled door, saying "Thanks, my hands are full." They are carrying boxes with a company logo.', tags: ['physical-security', 'tailgating', 'social-engineering'] },
  { type: 'scenario', context: 'Someone in a parking lot asks if they can borrow your badge to print something, saying they forgot theirs. They name-drop your manager.', tags: ['physical-security', 'badge-cloning', 'social-engineering'] },
  { type: 'true_false', context: 'Leaving a laptop on a desk locked with a screensaver is sufficient protection if you step away for 30 minutes in an open office.', tags: ['physical-security', 'laptop', 'evil-maid'] },
  { type: 'scenario', context: 'You find a USB drive in the office parking lot with a company logo sticker on it. A label reads "Q4 Salary Review - Confidential."', tags: ['physical-security', 'usb-drop', 'T1091'] },
  { type: 'scenario', context: 'A maintenance worker arrives without an appointment, says they need to inspect the server room, and has a generic ID badge with no company name.', tags: ['physical-security', 'impersonation', 'social-engineering'] },

  // Supply chain
  { type: 'scenario', context: 'An npm package your team uses released an urgent "security patch" overnight. The changelog only says "critical fix" and was authored by an unfamiliar account.', tags: ['supply-chain', 'malicious-package', 'T1195.001'] },
  { type: 'scenario', context: 'A browser extension you installed for productivity requests permission to "read and change all your data on websites you visit."', tags: ['supply-chain', 'browser-extension', 'T1176'] },
  { type: 'true_false', context: 'An open-source library with 50,000 GitHub stars is guaranteed to be safe to use in production without review.', tags: ['supply-chain', 'open-source', 'T1195'] },
  { type: 'scenario', context: 'Your company\'s CI/CD pipeline pulls base Docker images from Docker Hub. A third-party image you depend on was last updated 3 years ago by an account now marked inactive.', tags: ['supply-chain', 'docker', 'T1195.002'] },
  { type: 'scenario', context: 'A contractor shares a zip file containing a PowerPoint deck for review. Your security tool flags one of the embedded macros as unusual.', tags: ['supply-chain', 'macros', 'T1566.001'] },

  // General phishing / scenario
  { type: 'scenario', context: 'You receive a Slack DM from IT support saying your account will be suspended unless you verify your password in the next 30 minutes via a linked form.', tags: ['phishing', 'impersonation', 'T1566'] },
  { type: 'scenario', context: 'An email from "payroll@company-hr.co" says your direct deposit information needs to be re-verified before the next pay run.', tags: ['phishing', 'bec', 'T1566.002'] },
  { type: 'scenario', context: 'A calendar invite arrives for a Zoom meeting with an external partner. The join link goes to z00m.us instead of zoom.us.', tags: ['phishing', 'homograph', 'T1566.002'] },
  { type: 'true_false', context: 'HTTPS in a URL proves that the website is legitimate and not a phishing site.', tags: ['phishing', 'https', 'T1566.002'] },
  { type: 'scenario', context: 'You receive an automated alert that your cloud storage is 95% full with a link to upgrade. The sender domain is "dropbox-billing.net."', tags: ['phishing', 'cloud-storage', 'T1566.002'] },
]

void (async () => {
  let inserted = 0
  for (const spec of BATCH) {
    const puzzle = await generateApprovedPuzzle(spec.type, spec.context)
    if (!puzzle) {
      process.stdout.write(`Skipped: ${spec.context.slice(0, 60)}…\n`)
      continue
    }

    await db.query(
      `INSERT INTO puzzles (type, difficulty, payload, correct_answer, explanation, tags, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [
        spec.type,
        puzzle.difficulty,
        JSON.stringify({ question: puzzle.question, options: puzzle.options }),
        puzzle.correct_answer,
        puzzle.explanation,
        [...spec.tags, ...puzzle.tags],
      ],
    )
    inserted++
    process.stdout.write(`Inserted: ${puzzle.question.slice(0, 70)}…\n`)
  }

  process.stdout.write(`\nDone. ${inserted}/${BATCH.length} puzzles inserted.\n`)
  await db.end()
})()
