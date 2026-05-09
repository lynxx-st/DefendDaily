import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

vi.mock('../../db/redis', () => ({
  redis: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue('OK') },
}))

import { checkEmailBreaches } from '../hibp'

const server = setupServer(
  http.post('https://databreach.com/_telefunc', async ({ request }) => {
    const body = await request.json() as { args: [{ piis: [{ value: string }] }] }
    const email = body.args[0]?.piis[0]?.value

    if (email === 'breached@example.com') {
      return HttpResponse.json({
        result: {
          count: 1,
          breaches: [
            { name: 'Adobe', date: '2013-10-04', data_classes: ['Email addresses', 'Passwords'], description: 'Adobe breach' },
          ],
        },
      })
    }

    return HttpResponse.json({ result: { count: 0, breaches: [] } })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('checkEmailBreaches', () => {
  it('returns normalised breaches for a known breached email', async () => {
    const result = await checkEmailBreaches('breached@example.com')
    expect(result).toHaveLength(1)
    expect(result[0]?.Name).toBe('Adobe')
    expect(result[0]?.DataClasses).toContain('Email addresses')
  })

  it('returns empty array for a clean email', async () => {
    const result = await checkEmailBreaches('clean@example.com')
    expect(result).toHaveLength(0)
  })
})
