import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios')
vi.mock('../../db/client', () => ({ db: { query: vi.fn() } }))
vi.mock('../../config/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

import { db } from '../../db/client'
import { createCanaryToken, createHomeDefenseKit } from '../canary'

const mockAxios = vi.mocked(axios)
const mockDb = vi.mocked(db)

const FAKE_RESPONSE = {
  data: {
    token: 'tok_abc123',
    token_url: 'https://canarytokens.org/download/tok_abc123',
    auth_token: 'auth_xyz',
    hostname: 'canarytokens.org',
  },
}

describe('createCanaryToken', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls Canarytokens API and stores result in DB', async () => {
    mockAxios.post = vi.fn().mockResolvedValueOnce(FAKE_RESPONSE)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)

    const result = await createCanaryToken('user-1', 'pdf', 'Test PDF token')

    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://canarytokens.org/generate',
      expect.any(URLSearchParams),
      expect.objectContaining({ headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
    )
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO canary_tokens'),
      ['user-1', 'tok_abc123', 'pdf', 'Test PDF token'],
    )
    expect(result.token).toBe('tok_abc123')
    expect(result.file_type).toBe('pdf')
  })

  it('propagates DB errors', async () => {
    mockAxios.post = vi.fn().mockResolvedValueOnce(FAKE_RESPONSE)
    mockDb.query.mockRejectedValueOnce(new Error('DB connection lost'))

    await expect(createCanaryToken('user-1', 'doc', 'Test')).rejects.toThrow('DB connection lost')
  })
})

describe('createHomeDefenseKit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('generates 5 tokens covering all file types', async () => {
    mockAxios.post = vi.fn().mockResolvedValue(FAKE_RESPONSE)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockDb.query.mockResolvedValue({ rows: [] } as any)

    const kit = await createHomeDefenseKit('user-1')

    expect(kit).toHaveLength(5)
    const fileTypes = kit.map(t => t.file_type)
    expect(fileTypes).toContain('doc')
    expect(fileTypes).toContain('pdf')
    expect(fileTypes).toContain('excel')
    expect(fileTypes).toContain('img')
    expect(fileTypes).toContain('url')
    // 5 API calls + 5 DB inserts = 10 calls total
    expect(mockDb.query).toHaveBeenCalledTimes(5)
  })
})
