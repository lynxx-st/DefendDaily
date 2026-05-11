import { Router, type Request, type Response, type NextFunction } from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import { z } from 'zod'
import archiver from 'archiver'
import { db } from '../db/client'
import { env } from '../config/env'
import { requireAuth } from '../middleware/apiAuth'
import { createHomeDefenseKit } from '../services/canary'
import { logger } from '../config/logger'

export const familyRouter = Router()

const inviteBodySchema = z.object({
  role: z.enum(['senior', 'child']).default('senior'),
  email: z.string().email().optional(),
})

const acceptBodySchema = z.object({
  token: z.string().min(1),
})

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({
    error: message,
    code,
    requestId: res.locals.requestId ?? 'unknown',
  })
}

familyRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.locals.requestId = randomUUID()
  next()
})

familyRouter.post('/invite', requireAuth, async (req: Request, res: Response) => {
  const parsed = inviteBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'invalid_body', parsed.error.flatten().formErrors.join(', '))
  }

  const { role, email } = parsed.data
  const userId = res.locals.principal!.userId

  const token = randomBytes(32).toString('hex')

  await db.query(
    `INSERT INTO family_invites (inviter_id, token, email, role) VALUES ($1, $2, $3, $4)`,
    [userId, token, email ?? null, role],
  )

  const inviteUrl = `${env.CORS_ORIGIN}/sentrylife/join?token=${token}`
  res.json({ invite_url: inviteUrl, token, expires_in: '7 days' })
})

familyRouter.post('/accept', requireAuth, async (req: Request, res: Response) => {
  const parsed = acceptBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return sendError(res, 400, 'invalid_body', 'token is required')
  }

  const { token } = parsed.data
  const newUserId = res.locals.principal!.userId

  const inviteResult = await db.query<{ id: string; inviter_id: string; role: string }>(
    `SELECT id, inviter_id, role FROM family_invites
     WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [token],
  )

  const invite = inviteResult.rows[0]
  if (!invite) {
    return sendError(res, 400, 'invalid_invite', 'Invalid or expired invite')
  }

  const inviterResult = await db.query<{ family_group_id: string | null }>(
    'SELECT family_group_id FROM users WHERE id = $1',
    [invite.inviter_id],
  )
  let familyGroupId = inviterResult.rows[0]?.family_group_id ?? null

  if (!familyGroupId) {
    const groupResult = await db.query<{ family_group_id: string }>(
      `UPDATE users SET family_group_id = gen_random_uuid() WHERE id = $1 RETURNING family_group_id`,
      [invite.inviter_id],
    )
    familyGroupId = groupResult.rows[0]!.family_group_id
  }

  await db.query(
    `UPDATE users SET family_group_id = $1, role = $2 WHERE id = $3`,
    [familyGroupId, invite.role, newUserId],
  )

  await db.query(
    'UPDATE family_invites SET accepted_at = NOW() WHERE id = $1',
    [invite.id],
  )

  res.json({ ok: true, family_group_id: familyGroupId })
})

const KIT_FILENAMES = [
  'documents_backup.docx',
  'important_info.pdf',
  'passwords_backup.xlsx',
  'family_photo.jpg',
  'bank_portal.url',
] as const

const README = `# DefendDaily Home Defense Kit

These 5 files are "canary tokens" — digital traps that fire an alert the moment anyone opens them.

SETUP INSTRUCTIONS:
1. Place each file in a folder attackers would target: Documents, Desktop, Tax, Banking
2. Do NOT open them yourself — any open triggers an alert
3. If DefendDaily alerts you that one was triggered, your device may be compromised

Files included:
  documents_backup.docx  — Word document token
  important_info.pdf     — PDF token
  passwords_backup.xlsx  — Excel token (do not use as real password storage)
  family_photo.jpg       — Image token
  bank_portal.url        — Web shortcut token

If a token fires, immediately:
  1. Disconnect from the internet
  2. Run a full antivirus scan
  3. Rotate your email and banking passwords
  4. Contact IT support if this is a work device
`

// GET /api/family/home-defense-kit
familyRouter.get('/home-defense-kit', requireAuth, async (req: Request, res: Response) => {
  const userId = res.locals.principal!.userId

  try {
    const tokens = await createHomeDefenseKit(userId)

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="DefendDaily_HomeDefenseKit.zip"',
    )

    const archive = archiver('zip', { zlib: { level: 9 } })
    archive.on('error', (err) => {
      logger.error({ err, userId }, 'Zip archive error during home defense kit generation')
    })
    archive.pipe(res)

    const readmeWithDate = `${README}\nGenerated: ${new Date().toISOString()}\n`
    archive.append(readmeWithDate, { name: 'README.txt' })

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const filename = KIT_FILENAMES[i] ?? `canary_${i}.txt`
      const content = [
        'This file is a DefendDaily canary token.',
        `Token URL: ${token!.token_url}`,
        'Do not open this file — it is a security tripwire.',
      ].join('\n')
      archive.append(content, { name: filename })
    }

    await archive.finalize()
  } catch (err) {
    logger.error({ err, userId }, 'Home defense kit generation failed')
    if (!res.headersSent) {
      sendError(res, 500, 'kit_error', 'Failed to generate defense kit')
    }
  }
})
