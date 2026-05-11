import { describe, it, expect } from 'vitest'

// Pure threshold logic extracted from the SQL WHERE clause in guardianAlert.ts
function shouldAlert(score: number, recentIncorrect: number): boolean {
  return score < 50 || recentIncorrect >= 3
}

describe('Guardian Alert threshold logic', () => {
  it('triggers when score drops below 50', () => {
    expect(shouldAlert(49, 0)).toBe(true)
    expect(shouldAlert(0, 0)).toBe(true)
  })

  it('does not trigger at exactly 50', () => {
    expect(shouldAlert(50, 0)).toBe(false)
  })

  it('triggers when recent incorrect puzzles reaches 3', () => {
    expect(shouldAlert(75, 3)).toBe(true)
    expect(shouldAlert(100, 5)).toBe(true)
  })

  it('does not trigger for healthy score with fewer than 3 misses', () => {
    expect(shouldAlert(80, 2)).toBe(false)
    expect(shouldAlert(50, 2)).toBe(false)
  })

  it('triggers for both conditions simultaneously', () => {
    expect(shouldAlert(30, 5)).toBe(true)
  })

  it('boundary: score 51 with 2 misses is safe', () => {
    expect(shouldAlert(51, 2)).toBe(false)
  })
})
