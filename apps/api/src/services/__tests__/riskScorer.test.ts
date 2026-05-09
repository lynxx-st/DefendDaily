import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeRiskScore, scoreToShield, scoreToLabel } from '../riskScorer'

vi.mock('../../db/client', () => ({
  db: { query: vi.fn() },
}))

import { db } from '../../db/client'
const mockDb = vi.mocked(db)

describe('computeRiskScore', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 75 awareness for user with no delivery history', async () => {
    mockDb.query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [{ total: '0', correct: '0' }] } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [{ streak: 0, breach_count: 0 }] } as any)

    const { awareness, score } = await computeRiskScore('user-1')
    expect(awareness).toBe(75)
    // 75*0.4 + 0*0.3 - 0*0.3 = 30
    expect(score).toBe(30)
  })

  it('computes maximum score for 100% accuracy, 30-day streak, no breaches', async () => {
    mockDb.query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [{ total: '30', correct: '30' }] } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [{ streak: 30, breach_count: 0 }] } as any)

    const { awareness, consistency, realWorldRisk, score } = await computeRiskScore('user-1')
    expect(awareness).toBe(100)
    expect(consistency).toBe(100)
    expect(realWorldRisk).toBe(0)
    // 100*0.4 + 100*0.3 - 0*0.3 = 70 (formula max; not 100)
    expect(score).toBe(70)
  })

  it('caps realWorldRisk at 100 for 7+ breaches', async () => {
    mockDb.query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [{ total: '10', correct: '8' }] } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [{ streak: 5, breach_count: 10 }] } as any)

    const { realWorldRisk } = await computeRiskScore('user-1')
    expect(realWorldRisk).toBe(100) // min(10*15, 100)
  })

  it('clamps score to 0 when breach exposure overwhelms everything', async () => {
    mockDb.query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [{ total: '5', correct: '0' }] } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [{ streak: 0, breach_count: 10 }] } as any)

    const { score } = await computeRiskScore('user-1')
    expect(score).toBe(0) // 0*0.4 + 0*0.3 - 100*0.3 = -30 → clamped to 0
  })

  it('throws when user is not found', async () => {
    mockDb.query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [{ total: '0', correct: '0' }] } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce({ rows: [] } as any)

    await expect(computeRiskScore('nonexistent')).rejects.toThrow('User nonexistent not found')
  })
})

describe('scoreToShield', () => {
  it('returns green for score >= 80', () => expect(scoreToShield(80)).toBe('🟢'))
  it('returns yellow for score 60–79', () => expect(scoreToShield(79)).toBe('🟡'))
  it('returns orange for score 40–59', () => expect(scoreToShield(59)).toBe('🟠'))
  it('returns red for score < 40', () => expect(scoreToShield(39)).toBe('🔴'))
})

describe('scoreToLabel', () => {
  it('returns correct label for each band', () => {
    expect(scoreToLabel(85)).toBe('Strong Defender')
    expect(scoreToLabel(65)).toBe('Improving')
    expect(scoreToLabel(50)).toBe('At Risk')
    expect(scoreToLabel(20)).toBe('High Risk')
  })
})
