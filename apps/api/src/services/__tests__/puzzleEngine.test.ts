import { describe, it, expect } from 'vitest'
import { calcPoints } from '../puzzleEngine'

describe('calcPoints', () => {
  it('returns 0 for incorrect answer regardless of other factors', () => {
    expect(calcPoints(false, 'hard', 10_000, 30)).toBe(0)
  })

  it('applies easy difficulty multiplier (1.0)', () => {
    // base 100 × 1.0 × 1.0 (slow) × 1.0 (no streak) = 100
    expect(calcPoints(true, 'easy', 90_000, 0)).toBe(100)
  })

  it('applies medium difficulty multiplier (1.5)', () => {
    // base 100 × 1.5 × 1.0 × 1.0 = 150
    expect(calcPoints(true, 'medium', 90_000, 0)).toBe(150)
  })

  it('applies hard difficulty multiplier (2.0)', () => {
    // base 100 × 2.0 × 1.0 × 1.0 = 200
    expect(calcPoints(true, 'hard', 90_000, 0)).toBe(200)
  })

  it('applies 1.5x speed bonus for answer under 30 seconds', () => {
    // base 100 × 1.0 (easy) × 1.5 × 1.0 = 150
    expect(calcPoints(true, 'easy', 29_999, 0)).toBe(150)
  })

  it('applies 1.2x speed bonus for answer under 60 seconds', () => {
    // base 100 × 1.0 (easy) × 1.2 × 1.0 = 120
    expect(calcPoints(true, 'easy', 59_999, 0)).toBe(120)
  })

  it('applies streak multiplier correctly', () => {
    // base 100 × 1.0 × 1.0 × (1 + 10*0.02) = 100 × 1.2 = 120
    expect(calcPoints(true, 'easy', 90_000, 10)).toBe(120)
  })

  it('caps streak multiplier at 1.5', () => {
    // streak 50: 1 + 50*0.02 = 2.0 → capped at 1.5
    // base 100 × 1.0 × 1.0 × 1.5 = 150
    expect(calcPoints(true, 'easy', 90_000, 50)).toBe(150)
  })

  it('combines all bonuses correctly for max score', () => {
    // base 100 × 2.0 (hard) × 1.5 (fast) × 1.5 (streak cap) = 450
    expect(calcPoints(true, 'hard', 10_000, 100)).toBe(450)
  })
})
