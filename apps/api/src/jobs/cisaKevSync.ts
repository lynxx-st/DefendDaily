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
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)

    const vulns = response.data.vulnerabilities
      .map(v => VulnSchema.safeParse(v))
      .filter((r): r is { success: true; data: Vuln } => r.success)
      .map(r => r.data)
      .filter(v => new Date(v.dateAdded) >= cutoff)

    logger.info({ count: vulns.length }, 'New KEV entries this week')

    for (const vuln of vulns.slice(0, 5)) {
      const context = `CVE: ${vuln.cveID} affecting ${vuln.product} by ${vuln.vendorProject}. ${vuln.shortDescription}. Required action: ${vuln.requiredAction}`
      const puzzle = await generateApprovedPuzzle('scenario', context)
      if (!puzzle) continue

      const industries = INDUSTRY_MAP[vuln.vendorProject] ?? []
      const contextTrigger = industries[0] ?? null

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
  { connection, concurrency: 1 },
)

cisaKevWorker.on('failed', (job, err) => {
  logger.error({ err, jobId: job?.id }, 'cisa-kev job failed')
})

export async function scheduleCisaKevJob() {
  await cisaKevQueue.add('weekly-sync', {}, {
    repeat: { pattern: '0 6 * * MON' },
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 20 },
  })
}
