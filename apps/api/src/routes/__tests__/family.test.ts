import { describe, it, expect } from 'vitest'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'

const inviteBodySchema = z.object({
  role: z.enum(['senior', 'child']).default('senior'),
  email: z.string().email().max(255).optional(),
})

const acceptBodySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
})

describe('family invite token shape', () => {
  it('mints 64 hex chars from randomBytes(32)', () => {
    const token = randomBytes(32).toString('hex')
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    expect(token).toHaveLength(64)
  })

  it('two consecutive tokens differ', () => {
    const a = randomBytes(32).toString('hex')
    const b = randomBytes(32).toString('hex')
    expect(a).not.toBe(b)
  })
})

describe('invite body schema', () => {
  it('defaults role to senior when omitted', () => {
    const parsed = inviteBodySchema.parse({})
    expect(parsed.role).toBe('senior')
  })

  it('accepts child role', () => {
    expect(inviteBodySchema.parse({ role: 'child' }).role).toBe('child')
  })

  it('rejects an unknown role', () => {
    const result = inviteBodySchema.safeParse({ role: 'parent' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid email', () => {
    const result = inviteBodySchema.safeParse({ email: 'not-an-email' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid email', () => {
    const result = inviteBodySchema.safeParse({ email: 'gran@example.com' })
    expect(result.success).toBe(true)
  })
})

describe('accept body schema', () => {
  it('accepts a 64-hex-char token', () => {
    const token = randomBytes(32).toString('hex')
    expect(acceptBodySchema.safeParse({ token }).success).toBe(true)
  })

  it('rejects a too-short token', () => {
    expect(acceptBodySchema.safeParse({ token: 'abc123' }).success).toBe(false)
  })

  it('rejects a non-hex token', () => {
    const bad = 'g'.repeat(64)
    expect(acceptBodySchema.safeParse({ token: bad }).success).toBe(false)
  })
})
