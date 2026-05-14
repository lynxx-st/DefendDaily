import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../db/client', () => ({
  db: { query: vi.fn() },
}))

import { db } from '../../db/client'
import { updateEloRatings, selectEloMatchedPuzzle } from '../eloCalibration'

const mockDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('updateEloRatings', () => {
  it('increases user Elo and decreases puzzle Elo on correct answer', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ user_elo: 1200, puzzle_elo: 1200 }] } as never)
    mockDb.query.mockResolvedValue({ rows: [] } as never)

    await updateEloRatings('u1', 'p1', true)

    const calls = mockDb.query.mock.calls
    const userEloArg = calls[1]?.[1]?.[0] as unknown as number
    const puzzleEloArg = calls[2]?.[1]?.[0] as unknown as number

    // User won vs equal Elo: expected = 0.5, actual = 1, delta = K*(1-0.5) = 16
    expect(userEloArg).toBe(1216)
    expect(puzzleEloArg).toBe(1184)
  })

  it('decreases user Elo and increases puzzle Elo on incorrect answer', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ user_elo: 1200, puzzle_elo: 1200 }] } as never)
    mockDb.query.mockResolvedValue({ rows: [] } as never)

    await updateEloRatings('u1', 'p1', false)

    const calls = mockDb.query.mock.calls
    const userEloArg = calls[1]?.[1]?.[0] as unknown as number
    const puzzleEloArg = calls[2]?.[1]?.[0] as unknown as number

    expect(userEloArg).toBe(1184)
    expect(puzzleEloArg).toBe(1216)
  })

  it('clamps user Elo to 800 minimum', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ user_elo: 800, puzzle_elo: 2400 }] } as never)
    mockDb.query.mockResolvedValue({ rows: [] } as never)

    await updateEloRatings('u1', 'p1', false)

    const calls = mockDb.query.mock.calls
    const userEloArg = calls[1]?.[1]?.[0] as unknown as number
    expect(userEloArg).toBeGreaterThanOrEqual(800)
  })

  it('clamps puzzle Elo to 2400 maximum', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ user_elo: 800, puzzle_elo: 2390 }] } as never)
    mockDb.query.mockResolvedValue({ rows: [] } as never)

    await updateEloRatings('u1', 'p1', false)

    const calls = mockDb.query.mock.calls
    const puzzleEloArg = calls[2]?.[1]?.[0] as unknown as number
    expect(puzzleEloArg).toBeLessThanOrEqual(2400)
  })

  it('returns early when no row found', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await updateEloRatings('u1', 'p1', true)

    expect(mockDb.query).toHaveBeenCalledTimes(1)
  })
})

describe('selectEloMatchedPuzzle', () => {
  it('returns puzzle closest to user Elo', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ elo_level: 1400 }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'puzzle-best-match' }] } as never)

    const result = await selectEloMatchedPuzzle('u1', [])
    expect(result).toBe('puzzle-best-match')

    const selectCall = mockDb.query.mock.calls[1]
    expect(selectCall?.[1]?.[1]).toBe(1400)
  })

  it('uses 1200 default Elo when user not found', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'puzzle-default' }] } as never)

    await selectEloMatchedPuzzle('u1', [])

    const selectCall = mockDb.query.mock.calls[1]
    expect(selectCall?.[1]?.[1]).toBe(1200)
  })

  it('returns null when no puzzle available', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ elo_level: 1200 }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    const result = await selectEloMatchedPuzzle('u1', [])
    expect(result).toBeNull()
  })

  it('passes a sentinel UUID when excludeIds is empty', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ elo_level: 1200 }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 'p1' }] } as never)

    await selectEloMatchedPuzzle('u1', [])

    const selectCall = mockDb.query.mock.calls[1]
    const excluded = selectCall?.[1]?.[0] as unknown as string[]
    expect(excluded[0]).toMatch(/^[0-9a-f-]{36}$/)
  })
})
