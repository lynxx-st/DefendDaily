import axios from 'axios'
import { db } from '../db/client'
import { env } from '../config/env'
import { logger } from '../config/logger'

type CanaryFileType = 'doc' | 'pdf' | 'excel' | 'img' | 'url'

export type CanaryTokenResult = {
  token: string
  token_url: string
  auth_token: string
  hostname: string
  file_type: CanaryFileType
}

const CANARY_API = 'https://canarytokens.org/generate'

const KIT_CONFIGS: Array<{ fileType: CanaryFileType; description: string }> = [
  { fileType: 'doc',   description: 'Home Defense — Word Document' },
  { fileType: 'pdf',   description: 'Home Defense — PDF Document' },
  { fileType: 'excel', description: 'Home Defense — Excel Spreadsheet' },
  { fileType: 'img',   description: 'Home Defense — Image File' },
  { fileType: 'url',   description: 'Home Defense — Web Shortcut' },
]

export async function createCanaryToken(
  userId: string,
  fileType: CanaryFileType,
  description: string,
): Promise<CanaryTokenResult> {
  const webhookBase = env.CANARY_WEBHOOK_BASE ?? 'http://localhost:3001/webhooks/canary'
  const webhookUrl = `${webhookBase}/${userId}`

  const response = await axios.post<{ token: string; token_url: string; auth_token: string; hostname: string }>(
    CANARY_API,
    new URLSearchParams({ type: fileType, webhook_url: webhookUrl, memo: description }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  )

  const { token, token_url, auth_token, hostname } = response.data

  await db.query(
    `INSERT INTO canary_tokens (user_id, token_id, file_type, description)
     VALUES ($1, $2, $3, $4)`,
    [userId, token, fileType, description],
  )

  logger.info({ userId, fileType }, 'Canary token created')
  return { token, token_url, auth_token, hostname, file_type: fileType }
}

export async function createHomeDefenseKit(userId: string): Promise<CanaryTokenResult[]> {
  const results: CanaryTokenResult[] = []
  for (const { fileType, description } of KIT_CONFIGS) {
    const token = await createCanaryToken(userId, fileType, description)
    results.push(token)
  }
  return results
}
