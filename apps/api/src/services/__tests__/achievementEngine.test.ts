import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../db/client', () => ({
  db: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}))
vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { db } from '../../db/client'
import { checkAndGrantAchievements } from '../achievementEngine'

const mockDb = vi.mocked(db)

const baseCtx = {
  userId: 'user-1',
  orgId: 'org-1',
  isCorrect: true,
  responseTimeMs: 5_000,
  puzzleType: 'true_false',
  streak: 1,
  totalCorrect: 1,
  totalDeliveries: 1,
  localHour: 10,
}

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
}

function setupMocks(unearnedRows: { id: string; slug: string; name: string; icon: string; threshold: number | null }[]) {
  mockDb.query.mockResolvedValueOnce({ rows: unearnedRows } as never)
  mockDb.connect.mockResolvedValue(mockClient as never)
  mockClient.query.mockResolvedValue({ rows: [] } as never)
}

describe('checkAndGrantAchievements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when no unearned achievements', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)
    const result = await checkAndGrantAchievements(baseCtx)
    expect(result).toEqual([])
  })

  it('grants first_blood on first correct answer', async () => {
    setupMocks([{ id: 'ach-1', slug: 'first_blood', name: 'First Blood', icon: '🩸', threshold: 1 }])
    const result = await checkAndGrantAchievements(baseCtx)
    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('first_blood')
  })

  it('does not grant first_blood when totalCorrect > 1', async () => {
    setupMocks([{ id: 'ach-1', slug: 'first_blood', name: 'First Blood', icon: '🩸', threshold: 1 }])
    const result = await checkAndGrantAchievements({ ...baseCtx, totalCorrect: 2 })
    expect(result).toHaveLength(0)
  })

  it('grants streak_7 when streak reaches 7', async () => {
    setupMocks([{ id: 'ach-2', slug: 'streak_7', name: 'Week Warrior', icon: '🔥', threshold: 7 }])
    const result = await checkAndGrantAchievements({ ...baseCtx, streak: 7 })
    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('streak_7')
  })

  it('grants speed_demon when response under 10s', async () => {
    setupMocks([{ id: 'ach-3', slug: 'speed_demon', name: 'Speed Demon', icon: '⚡', threshold: null }])
    const result = await checkAndGrantAchievements({ ...baseCtx, responseTimeMs: 9_999 })
    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('speed_demon')
  })

  it('does not grant speed_demon when response over 10s', async () => {
    setupMocks([{ id: 'ach-3', slug: 'speed_demon', name: 'Speed Demon', icon: '⚡', threshold: null }])
    const result = await checkAndGrantAchievements({ ...baseCtx, responseTimeMs: 10_001 })
    expect(result).toHaveLength(0)
  })

  it('grants centurion at 100 total deliveries', async () => {
    setupMocks([{ id: 'ach-4', slug: 'centurion', name: 'Centurion', icon: '💯', threshold: 100 }])
    const result = await checkAndGrantAchievements({ ...baseCtx, totalDeliveries: 100 })
    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('centurion')
  })

  it('returns empty on db error and does not throw', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'ach-1', slug: 'first_blood', name: 'First Blood', icon: '🩸', threshold: 1 }] } as never)
    mockDb.connect.mockResolvedValue({ ...mockClient, query: vi.fn().mockRejectedValueOnce(new Error('DB error')) } as never)
    const result = await checkAndGrantAchievements(baseCtx)
    expect(result).toEqual([])
  })
})
