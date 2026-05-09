import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

vi.mock('../../db/redis', () => ({
  redis: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue('OK') },
}))

vi.mock('../../config/env', () => ({
  env: { HIBP_API_KEY: 'test-key' },
}))

import { checkEmailBreaches } from '../hibp'

const server = setupServer(
  http.get('https://haveibeenpwned.com/api/v3/breachedaccount/:email', ({ params }) => {
    if (params['email'] === 'breached%40example.com' || params['email'] === 'breached@example.com') {
      return HttpResponse.json([
        { Name: 'Adobe', BreachDate: '2013-10-04', DataClasses: ['Email addresses', 'Passwords'] },
      ])
    }
    return new HttpResponse(null, { status: 404 })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('checkEmailBreaches', () => {
  it('returns breaches for a known breached email', async () => {
    const result = await checkEmailBreaches('breached@example.com')
    expect(result).toHaveLength(1)
    expect(result[0]?.Name).toBe('Adobe')
  })

  it('returns empty array for clean email (404)', async () => {
    const result = await checkEmailBreaches('clean@example.com')
    expect(result).toHaveLength(0)
  })
})
