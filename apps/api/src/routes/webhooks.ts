import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { db } from '../db/client'
import { slackApp } from '../bots/slack/app'
import { logger } from '../config/logger'
import { env } from '../config/env'

export const webhooksRouter = Router()

// Rate limit: 60 req/min per IP — never reveal limiting to requester (return 200 always)
const trackingLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(200).send()
  },
})

// 44-byte transparent 1×1 GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

webhooksRouter.get('/track/open/:token', trackingLimiter, (req: Request, res: Response) => {
  res.set('Content-Type', 'image/gif')
  res.set('Cache-Control', 'no-store')
  res.status(200).send(PIXEL)
  void recordOpen(req.params['token'] ?? '')
})

webhooksRouter.get('/track/click/:token', trackingLimiter, (req: Request, res: Response) => {
  // Always redirect regardless of token validity — never leak whether a token exists
  res.redirect(302, 'https://www.defenddaily.com/clicked')
  void recordClick(req.params['token'] ?? '')
})

async function recordOpen(token: string): Promise<void> {
  try {
    await db.query(
      `UPDATE phish_campaigns SET opened_at = NOW()
       WHERE tracking_token = $1 AND opened_at IS NULL`,
      [token]
    )
  } catch (err) {
    logger.error({ err, token }, 'recordOpen failed')
  }
}

// POST /webhooks/canary/:userId — fired by Canarytokens.org when a honey-trap file is opened.
// Always 200 immediately; processing is fire-and-forget. Never reveal token validity.
webhooksRouter.post('/webhooks/canary/:userId', trackingLimiter, (req: Request, res: Response) => {
  res.status(200).json({ ok: true })
  const userIdParse = z.string().uuid().safeParse(req.params['userId'])
  if (!userIdParse.success) return
  const tokenStr = z.string().min(1).safeParse(
    (req.body as Record<string, unknown>)['token'],
  )
  if (!tokenStr.success) return
  void processCanaryTrigger(userIdParse.data, tokenStr.data)
})

async function processCanaryTrigger(userId: string, token: string): Promise<void> {
  try {
    const result = await db.query<{ description: string; file_type: string }>(
      `UPDATE canary_tokens SET triggered_at = NOW()
       WHERE user_id = $1 AND token_id = $2 AND triggered_at IS NULL
       RETURNING description, file_type`,
      [userId, token],
    )
    const row = result.rows[0]
    if (!row) return

    logger.warn({ userId, fileType: row.file_type }, 'Canary token triggered')

    const userResult = await db.query<{ provider_id: string | null }>(
      'SELECT provider_id FROM users WHERE id = $1',
      [userId],
    )
    const providerId = userResult.rows[0]?.provider_id
    if (!providerId) return

    await slackApp.client.chat.postMessage({
      token: env.SLACK_BOT_TOKEN,
      channel: providerId,
      text: '⚠️ Security Alert: a canary token was triggered',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '⚠️ Security Alert: Canary Token Triggered' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Your canary token *"${row.description}"* (${row.file_type}) was just accessed.\n\n*This may mean your device or folder has been compromised.*\n\n*Immediate steps:*\n1. Disconnect from the internet\n2. Run a full antivirus scan\n3. Rotate your email and banking passwords\n4. Contact IT support if this is a work device`,
          },
        },
      ],
    })
  } catch (err) {
    logger.error({ err, userId }, 'Canary webhook processing failed')
  }
}

async function recordClick(token: string): Promise<void> {
  try {
    const result = await db.query<{ target_id: string; sender_id: string }>(
      `UPDATE phish_campaigns
       SET clicked_at = NOW(), outcome = 'clicked'
       WHERE tracking_token = $1 AND clicked_at IS NULL
       RETURNING target_id, sender_id`,
      [token]
    )
    if (!result.rows[0]) return

    const { target_id, sender_id } = result.rows[0]

    const userResult = await db.query<{ provider_id: string }>(
      'SELECT provider_id FROM users WHERE id = $1',
      [target_id]
    )
    if (!userResult.rows[0]) return

    await slackApp.client.chat.postMessage({
      token: env.SLACK_BOT_TOKEN,
      channel: userResult.rows[0].provider_id,
      text: '🎣 You clicked a simulated phishing link!',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🎣 Simulated Phishing Alert!' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: "You just clicked a *simulated phishing link* sent by a coworker as part of DefendDaily's Peer Phish program.\n\nThis was a safe simulation — no harm done! Here's what to watch for next time:",
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '• Check the sender address — does it match the real company domain?\n• Hover over links before clicking — does the URL look right?\n• Unexpected urgency is a red flag (wire transfers, password resets, prizes)\n• When in doubt, report it with `/report-phish`',
          },
        },
      ],
    })

    // Award attacker points to sender (5 points per successful phish)
    await db.query('UPDATE users SET longest_streak = longest_streak + 5 WHERE id = $1', [
      sender_id,
    ])
  } catch (err) {
    logger.error({ err, token }, 'recordClick failed')
  }
}
