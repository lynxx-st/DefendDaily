import axios from 'axios'
import { db } from '../db/client'
import { env } from '../config/env'
import { logger } from '../config/logger'

// TextBelt is an MIT-licensed, self-hostable SMS gateway (https://github.com/typpo/textbelt).
// The public textbelt.com endpoint accepts the literal key "textbelt" for a 1-SMS/day free tier
// suitable for development; production deployments self-host or purchase quota.

type TextBeltResponse = {
  success: boolean
  quotaRemaining?: number
  textId?: string
  error?: string
}

type SmishingOptions = {
  targetUserId: string
  message: string
  trackingToken: string
  orgId: string
}

export async function sendSmishingSimulation(opts: SmishingOptions): Promise<void> {
  const { targetUserId, message, trackingToken, orgId } = opts

  const consentResult = await db.query<{
    smishing_consent_at: Date | null
    phone_number: string | null
  }>(
    'SELECT smishing_consent_at, phone_number FROM users WHERE id = $1',
    [targetUserId]
  )
  const targetUser = consentResult.rows[0]

  if (!targetUser?.smishing_consent_at) {
    throw new Error(`User ${targetUserId} has not consented to smishing simulations`)
  }
  if (!targetUser.phone_number) {
    throw new Error(`User ${targetUserId} has no phone number on file`)
  }

  await db.query(
    `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ($1, $2, 'smishing_pre_send', $3)`,
    [orgId, targetUserId, JSON.stringify({ token: trackingToken })]
  )

  const clickUrl = `${env.TRACKING_BASE_URL}/track/click/${trackingToken}`
  const response = await axios.post<TextBeltResponse>(
    `${env.TEXTBELT_API_URL}/text`,
    {
      phone: targetUser.phone_number,
      message: `${message} ${clickUrl}`,
      key: env.TEXTBELT_API_KEY,
    },
    { timeout: 10_000 }
  )

  if (!response.data.success) {
    logger.error({ targetUserId, error: response.data.error }, 'TextBelt send failed')
    throw new Error(`TextBelt send failed: ${response.data.error ?? 'unknown'}`)
  }

  await db.query(
    `INSERT INTO audit_log (org_id, user_id, action, metadata) VALUES ($1, $2, 'smishing_sent', $3)`,
    [
      orgId,
      targetUserId,
      JSON.stringify({
        token: trackingToken,
        textId: response.data.textId,
        quotaRemaining: response.data.quotaRemaining,
      }),
    ]
  )
}
