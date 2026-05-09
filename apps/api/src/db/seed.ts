import { resolve } from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: resolve(__dirname, '../../../../.env') })

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { Pool } from 'pg'
import pino from 'pino'

const logger = pino({ level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } })
const pool = new Pool({ connectionString: process.env['DATABASE_URL'] })

const PUZZLE_BANK_ROOT = resolve(__dirname, '../../../../packages/puzzle-bank')

interface PuzzleFile {
  type: 'spot_the_phish' | 'true_false' | 'scenario' | 'breach_alert'
  difficulty: 'easy' | 'medium' | 'hard'
  context_trigger?: string | null
  payload: Record<string, unknown>
  correct_answer: string
  explanation: string
  tags?: string[]
}

function loadPuzzles(): PuzzleFile[] {
  const subdirs = ['true-false', 'scenarios', 'spot-the-phish', 'breach-alert']
  const puzzles: PuzzleFile[] = []

  for (const subdir of subdirs) {
    const dir = join(PUZZLE_BANK_ROOT, subdir)
    let files: string[]
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.json'))
    } catch {
      logger.warn({ dir }, 'Puzzle bank directory not found, skipping')
      continue
    }

    for (const file of files) {
      const raw = readFileSync(join(dir, file), 'utf-8')
      puzzles.push(JSON.parse(raw) as PuzzleFile)
    }
  }

  return puzzles
}

const PHISH_TEMPLATES = [
  { name: 'Fake IT Password Reset', subject: 'Action Required: Reset Your Password', body_html: '<p>Dear Employee,</p><p>Our security team has detected unusual activity on your account. <a href="#">Click here to reset your password immediately</a> to prevent account lockout.</p><p>IT Security Team</p>', lure_type: 'mfa_request', difficulty: 'easy' },
  { name: 'Fake Invoice', subject: 'Invoice #INV-8821 Due for Payment', body_html: "<p>Please find attached invoice #INV-8821 for $4,250.00 due within 24 hours. <a href=\"#\">Review and approve payment here</a>.</p><p>Accounts Payable</p>", lure_type: 'fake_invoice', difficulty: 'medium' },
  { name: 'CEO Wire Transfer Request', subject: 'Urgent: Confidential Wire Transfer Needed', body_html: "<p>Hi,</p><p>I need you to process an urgent wire transfer of $35,000 to a new vendor. I'm in a board meeting and can't talk. <a href=\"#\">Access the transfer portal here</a>. Keep this confidential.</p><p>Best, CEO</p>", lure_type: 'fake_invoice', difficulty: 'hard' },
  { name: 'Fake HR Benefits Update', subject: 'Action Needed: Update Your Benefits Before Deadline', body_html: '<p>Open enrollment closes Friday. Failure to update your selections will result in loss of coverage. <a href="#">Log in to HR portal to update now</a>.</p><p>Human Resources</p>', lure_type: 'hr_update', difficulty: 'easy' },
  { name: 'Package Delivery Notification', subject: 'Your package could not be delivered — action required', body_html: '<p>We attempted to deliver your package but were unable to complete the delivery. <a href="#">Click here to reschedule delivery and confirm your address</a>.</p><p>Delivery Support Team</p>', lure_type: 'package_delivery', difficulty: 'easy' },
  { name: 'Microsoft 365 License Expiring', subject: 'Your Microsoft 365 license expires in 24 hours', body_html: '<p>Your Microsoft 365 subscription is about to expire. <a href="#">Click here to renew your license</a> and avoid service interruption.</p><p>Microsoft Support</p>', lure_type: 'mfa_request', difficulty: 'medium' },
  { name: 'Payroll Direct Deposit Update', subject: 'Update Required: Direct Deposit Information', body_html: '<p>Finance is updating payroll systems. All employees must verify their bank information by EOD Friday. <a href="#">Verify your direct deposit details here</a>.</p><p>Payroll Department</p>', lure_type: 'hr_update', difficulty: 'hard' },
  { name: 'Shared Document Notification', subject: 'Your colleague shared a document with you', body_html: '<p>John Smith has shared "Q4 Budget Review" with you. <a href="#">Click here to view the document</a>.</p><p>This link expires in 48 hours.</p>', lure_type: 'hr_update', difficulty: 'medium' },
  { name: 'Fake Security Alert', subject: 'Security Alert: Unauthorized Login Attempt Detected', body_html: '<p>We detected a login attempt from an unrecognized device in [Location]. <a href="#">Click here to verify your identity and secure your account</a>. If you did not attempt to log in, your account may be compromised.</p>', lure_type: 'mfa_request', difficulty: 'medium' },
  { name: 'IT Equipment Return', subject: 'Required: Schedule Your Equipment Return', body_html: '<p>Per company policy, all remote employees must schedule equipment return or renewal. <a href="#">Complete the equipment form here</a> by end of week to avoid service interruption.</p><p>IT Department</p>', lure_type: 'hr_update', difficulty: 'easy' },
]

async function seedPhishTemplates(client: import('pg').PoolClient): Promise<void> {
  let inserted = 0
  let skipped = 0
  for (const t of PHISH_TEMPLATES) {
    const result = await client.query(
      `INSERT INTO phish_templates (name, subject, body_html, lure_type, difficulty)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [t.name, t.subject, t.body_html, t.lure_type, t.difficulty]
    )
    if (result.rowCount && result.rowCount > 0) inserted++
    else skipped++
  }
  logger.info({ inserted, skipped }, 'Phish templates seeded')
}

async function seed() {
  const puzzles = loadPuzzles()
  logger.info({ count: puzzles.length }, 'Loaded puzzles from bank')

  const client = await pool.connect()
  try {
    let inserted = 0
    let skipped = 0

    for (const puzzle of puzzles) {
      const result = await client.query(
        `INSERT INTO puzzles (type, difficulty, context_trigger, payload, correct_answer, explanation, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          puzzle.type,
          puzzle.difficulty,
          puzzle.context_trigger ?? null,
          JSON.stringify(puzzle.payload),
          puzzle.correct_answer,
          puzzle.explanation,
          puzzle.tags ?? [],
        ]
      )

      if (result.rowCount && result.rowCount > 0) {
        inserted++
      } else {
        skipped++
      }
    }

    logger.info({ inserted, skipped }, 'Puzzles seeded')
    await seedPhishTemplates(client)
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err) => {
  logger.error(err, 'Seed failed')
  process.exit(1)
})
