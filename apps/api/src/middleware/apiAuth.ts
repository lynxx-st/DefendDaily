import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { jwtVerify } from 'jose'
import type { Role } from '@defenddaily/shared-types'
import { env } from '../config/env'
import { logger } from '../config/logger'

export type ApiPrincipal = {
  userId: string
  orgId: string
  role: Role
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      principal?: ApiPrincipal
      requestId?: string
    }
  }
}

const ROLES: Role[] = ['employee', 'ciso', 'admin', 'senior', 'child']

function bearer(req: Request): string | null {
  const header = req.header('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  return scheme?.toLowerCase() === 'bearer' && token ? token : null
}

function deny(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({
    error: message,
    code,
    requestId: res.locals.requestId ?? 'unknown',
  })
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  if (!env.NEXTAUTH_SECRET) {
    return deny(res, 503, 'auth_unconfigured', 'API auth secret is not configured')
  }
  const token = bearer(req)
  if (!token) return deny(res, 401, 'missing_bearer', 'Missing Authorization: Bearer token')

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(env.NEXTAUTH_SECRET))
    const userId = typeof payload['userId'] === 'string' ? payload['userId'] : null
    const orgId = typeof payload['orgId'] === 'string' ? payload['orgId'] : null
    const role = typeof payload['role'] === 'string' && (ROLES as string[]).includes(payload['role'])
      ? (payload['role'] as Role)
      : null
    if (!userId || !orgId || !role) {
      return deny(res, 401, 'invalid_claims', 'Token missing userId, orgId, or role')
    }
    res.locals.principal = { userId, orgId, role }
    next()
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'JWT verification failed')
    deny(res, 401, 'invalid_token', 'Invalid or expired token')
  }
}

export function requireRole(allowed: Role[]): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    const principal = res.locals.principal
    if (!principal) return deny(res, 401, 'no_principal', 'Authentication required')
    if (!allowed.includes(principal.role)) {
      return deny(res, 403, 'forbidden_role', `Requires one of: ${allowed.join(', ')}`)
    }
    next()
  }
}

export function requireOrgMatch(paramName = 'orgId'): RequestHandler {
  return (req, res, next) => {
    const principal = res.locals.principal
    const target = req.params[paramName]
    if (!principal) return deny(res, 401, 'no_principal', 'Authentication required')
    if (!target || principal.orgId !== target) {
      return deny(res, 403, 'org_mismatch', 'Token org does not match resource org')
    }
    next()
  }
}
