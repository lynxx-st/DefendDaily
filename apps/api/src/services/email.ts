import sgMail from '@sendgrid/mail'
import { env } from '../config/env'
import { logger } from '../config/logger'

if (env.SENDGRID_API_KEY) {
  sgMail.setApiKey(env.SENDGRID_API_KEY)
}

type BreachItem = { name: string; date: string; dataClasses: string[] }

export async function sendBreachMonitorEmail(to: string, breaches: BreachItem[]): Promise<void> {
  if (!env.SENDGRID_API_KEY) {
    logger.warn({ to }, 'SENDGRID_API_KEY not configured — skipping breach monitor email')
    return
  }

  const breachRows =
    breaches.length > 0
      ? breaches
          .map(
            b =>
              `<li><strong>${b.name}</strong> (${b.date})<br>Exposed: ${b.dataClasses.join(', ')}</li>`,
          )
          .join('')
      : '<li>No new breaches detected this week. ✅</li>'

  const dateLabel = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  await sgMail.send({
    to,
    from: { email: env.SENDGRID_FROM_EMAIL, name: 'DefendDaily SentryLife' },
    subject: `Your Weekly Security Report — ${dateLabel}`,
    html: `
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#ffffff;padding:32px;border-radius:12px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
          <span style="background:#7b3aed;color:#fff;padding:6px 10px;border-radius:8px;font-size:14px;font-weight:600;">SentryLife</span>
          <span style="color:#888;font-size:13px;">Weekly Security Report</span>
        </div>
        <h1 style="font-size:24px;font-weight:500;margin:0 0 8px;letter-spacing:-0.5px;">Breach Monitor Summary</h1>
        <p style="color:#a8a8a8;font-size:15px;margin:0 0 24px;">
          Here's the weekly breach scan for all email addresses in your family group.
        </p>
        <ul style="background:#181818;border:1px solid #222;border-radius:8px;padding:20px 20px 20px 36px;color:#a8a8a8;font-size:14px;line-height:1.7;">
          ${breachRows}
        </ul>
        <p style="color:#666;font-size:12px;margin-top:24px;border-top:1px solid #222;padding-top:16px;">
          Breach data sourced from HaveIBeenPwned. Sent by DefendDaily SentryLife.
          To stop receiving these emails, contact your org admin.
        </p>
      </div>
    `,
  })
}
