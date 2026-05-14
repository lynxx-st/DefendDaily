import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../db/client', () => ({
  db: { query: vi.fn() },
}))

import { db } from '../../db/client'
import { updateLeitnerBox, getDueReviewPuzzleId } from '../spacedRepetition'

const mockDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('updateLeitnerBox', () => {
  it('promotes to box 2 on first correct answer (no prior state)', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    vi.setSystemTime(new Date('2024-03-01'))
    await updateLeitnerBox('u1', 'p1', true)

    const upsertCall = mockDb.query.mock.calls[1]
    expect(upsertCall?.[1]?.[2]).toBe(2) // newBox = 2
    expect(upsertCall?.[1]?.[3]).toBe('2024-03-03') // box 2 = 2-day interval
  })

  it('stays in box 1 and resets on incorrect answer', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ leitner_box: 3 }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    vi.setSystemTime(new Date('2024-03-01'))
    await updateLeitnerBox('u1', 'p1', false)

    const upsertCall = mockDb.query.mock.calls[1]
    expect(upsertCall?.[1]?.[2]).toBe(1) // reset to box 1
    expect(upsertCall?.[1]?.[3]).toBe('2024-03-02') // box 1 = 1-day interval
  })

  it('caps at box 5 on correct answer', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ leitner_box: 5 }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    vi.setSystemTime(new Date('2024-03-01'))
    await updateLeitnerBox('u1', 'p1', true)

    const upsertCall = mockDb.query.mock.calls[1]
    expect(upsertCall?.[1]?.[2]).toBe(5) // capped at 5
  })

  it('advances from box 3 to box 4 with 8-day interval', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ leitner_box: 3 }] } as never)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    vi.setSystemTime(new Date('2024-03-01'))
    await updateLeitnerBox('u1', 'p1', true)

    const upsertCall = mockDb.query.mock.calls[1]
    expect(upsertCall?.[1]?.[2]).toBe(4)
    expect(upsertCall?.[1]?.[3]).toBe('2024-03-09') // 8-day interval
  })
})

describe('getDueReviewPuzzleId', () => {
  it('returns puzzle_id when a review is due', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ puzzle_id: 'puzzle-abc' }] } as never)

    const result = await getDueReviewPuzzleId('u1')
    expect(result).toBe('puzzle-abc')
  })

  it('returns null when no reviews are due', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    const result = await getDueReviewPuzzleId('u1')
    expect(result).toBeNull()
  })

  it('queries with correct user_id and box < 5 constraint', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as never)

    await getDueReviewPuzzleId('user-xyz')

    const sql = mockDb.query.mock.calls[0]?.[0] as string
    expect(sql).toContain('leitner_box < 5')
    expect(mockDb.query.mock.calls[0]?.[1]).toEqual(['user-xyz'])
  })
})
