import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SignJWT } from 'jose'

vi.mock('../../config/env', () => ({
  env: { NEXTAUTH_SECRET: 'test-secret-32-chars-minimum-len-pad' },
}))
vi.mock('../../config/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import { requireAuth, requireRole, requireOrgMatch } from '../apiAuth'

type FakeRes = {
  locals: Record<string, unknown>
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  _status: number
  _body: unknown
}

function makeRes(): FakeRes {
  const res: FakeRes = {
    locals: { requestId: 'req-1' },
    status: vi.fn(),
    json: vi.fn(),
    _status: 200,
    _body: null,
  }
  res.status.mockImplementation((code: number) => {
    res._status = code
    return res
  })
  res.json.mockImplementation((body: unknown) => {
    res._body = body
    return res
  })
  return res
}

async function mintToken(payload: Record<string, unknown>, opts?: { expired?: boolean }): Promise<string> {
  const builder = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
  if (opts?.expired) builder.setExpirationTime('-1s')
  else builder.setExpirationTime('5m')
  return builder.sign(new TextEncoder().encode('test-secret-32-chars-minimum-len-pad'))
}

describe('requireAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects requests without an Authorization header', async () => {
    const next = vi.fn()
    const res = makeRes()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (requireAuth as any)({ header: () => undefined } as any, res, next)
    expect(res._status).toBe(401)
    expect((res._body as { code: string }).code).toBe('missing_bearer')
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects malformed bearer tokens', async () => {
    const next = vi.fn()
    const res = makeRes()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (requireAuth as any)({ header: () => 'Bearer not-a-jwt' } as any, res, next)
    expect(res._status).toBe(401)
    expect((res._body as { code: string }).code).toBe('invalid_token')
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects expired tokens', async () => {
    const next = vi.fn()
    const res = makeRes()
    const token = await mintToken({ userId: 'u1', orgId: 'o1', role: 'ciso' }, { expired: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (requireAuth as any)({ header: () => `Bearer ${token}` } as any, res, next)
    expect(res._status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects tokens missing required claims', async () => {
    const next = vi.fn()
    const res = makeRes()
    const token = await mintToken({ userId: 'u1' /* no orgId/role */ })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (requireAuth as any)({ header: () => `Bearer ${token}` } as any, res, next)
    expect(res._status).toBe(401)
    expect((res._body as { code: string }).code).toBe('invalid_claims')
  })

  it('attaches a principal and calls next() for a valid token', async () => {
    const next = vi.fn()
    const res = makeRes()
    const token = await mintToken({ userId: 'u-42', orgId: 'org-7', role: 'ciso' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (requireAuth as any)({ header: () => `Bearer ${token}` } as any, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(res.locals['principal']).toEqual({ userId: 'u-42', orgId: 'org-7', role: 'ciso' })
  })
})

describe('requireRole', () => {
  it('passes when the principal role is allowed', () => {
    const next = vi.fn()
    const res = makeRes()
    res.locals['principal'] = { userId: 'u', orgId: 'o', role: 'ciso' }
    requireRole(['ciso', 'admin'])({} as never, res as never, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('rejects with 403 when the role is not allowed', () => {
    const next = vi.fn()
    const res = makeRes()
    res.locals['principal'] = { userId: 'u', orgId: 'o', role: 'employee' }
    requireRole(['ciso', 'admin'])({} as never, res as never, next)
    expect(res._status).toBe(403)
    expect((res._body as { code: string }).code).toBe('forbidden_role')
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects with 401 when no principal is attached', () => {
    const next = vi.fn()
    const res = makeRes()
    requireRole(['ciso'])({} as never, res as never, next)
    expect(res._status).toBe(401)
  })
})

describe('requireOrgMatch', () => {
  it('passes when token org matches the route param', () => {
    const next = vi.fn()
    const res = makeRes()
    res.locals['principal'] = { userId: 'u', orgId: 'org-7', role: 'ciso' }
    const req = { params: { orgId: 'org-7' } }
    requireOrgMatch('orgId')(req as never, res as never, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('rejects cross-tenant access with 403', () => {
    const next = vi.fn()
    const res = makeRes()
    res.locals['principal'] = { userId: 'u', orgId: 'org-7', role: 'ciso' }
    const req = { params: { orgId: 'org-8' } }
    requireOrgMatch('orgId')(req as never, res as never, next)
    expect(res._status).toBe(403)
    expect((res._body as { code: string }).code).toBe('org_mismatch')
    expect(next).not.toHaveBeenCalled()
  })
})
