import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { db } from '../db/client'
import { env } from '../config/env'

// Transporter is created lazily to avoid crashing at startup when SMTP vars are not set
function getTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST ?? 'localhost',
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  })
}

type PhishTemplate = {
  id: string
  name: string
  subject: string
  body_html: string
  lure_type: string
  difficulty: string
}

type SendPhishOptions = {
  senderId: string
  targetId: string
  targetEmail: string
  template: PhishTemplate
  orgId: string
}

export async function sendPhishSimulation(opts: SendPhishOptions): Promise<string> {
  const { senderId, targetId, targetEmail, template, orgId } = opts

  const trackingToken = crypto.randomBytes(32).toString('hex')
  const trackingPixelUrl = `${env.TRACKING_BASE_URL}/track/open/${trackingToken}`
  const clickUrl = `${env.TRACKING_BASE_URL}/track/click/${trackingToken}`

  const trackedHtml =
    template.body_html.replace(/href="([^"]+)"/g, `href="${clickUrl}"`) +
    `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />`

  // Insert campaign record BEFORE sending — creates the legal audit trail regardless of send outcome
  await db.query(
    `INSERT INTO phish_campaigns (sender_id, target_id, template_id, tracking_token)
     VALUES ($1, $2, $3, $4)`,
    [senderId, targetId, template.id, trackingToken]
  )

  await db.query(
    `INSERT INTO audit_log (org_id, user_id, action, metadata)
     VALUES ($1, $2, 'peer_phish_sent', $3)`,
    [orgId, senderId, JSON.stringify({ targetId, templateId: template.id, token: trackingToken })]
  )

  await getTransporter().sendMail({
    from: `"IT Support" <noreply@${env.PHISH_FROM_DOMAIN}>`,
    to: targetEmail,
    subject: template.subject,
    html: trackedHtml,
    headers: { 'X-DefendDaily-Simulation': 'true' },
  })

  return trackingToken
}
