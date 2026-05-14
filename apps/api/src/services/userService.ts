import { db } from '../db/client'

interface UserRow {
  id: string
  streak: number
  org_id: string
}

export async function getUserByProviderId(
  providerId: string,
  providerType: 'slack' | 'teams',
): Promise<UserRow | undefined> {
  const { rows } = await db.query<UserRow>(
    `SELECT id, streak, org_id FROM users WHERE provider_id = $1 AND provider_type = $2`,
    [providerId, providerType],
  )
  return rows[0]
}
