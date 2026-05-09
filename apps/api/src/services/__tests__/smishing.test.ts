import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

vi.mock('../../config/env', () => ({
  env: {
    TRACKING_BASE_URL: 'http://localhost:3001',
    TEXTBELT_API_URL: 'https://textbelt.com',
    TEXTBELT_API_KEY: 'textbelt',
  },
}))

vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

const mockDbQuery = vi.hoisted(() => vi.fn())
vi.mock('../../db/client', () => ({
  db: { query: mockDbQuery },
}))

import { sendSmishingSimulation } from '../smishing'

const server = setupServer(
  http.post('https://textbelt.com/text', () =>
    HttpResponse.json({ success: true, quotaRemaining: 9, textId: 'txt-123' })
  )
)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})
afterAll(() => server.close())

const consentedUser = {
  smishing_consent_at: new Date('2024-01-01'),
  phone_number: '+15551234567',
}

const baseOpts = {
  targetUserId: 'user-1',
  message: 'Your HR benefits require urgent action.',
  trackingToken: 'abc123token',
  orgId: 'org-1',
}

describe('sendSmishingSimulation', () => {
  it('throws when user has no smishing consent', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ smishing_consent_at: null, phone_number: '+15551234567' }],
    })
    await expect(sendSmishingSimulation(baseOpts)).rejects.toThrow('has not consented')
  })

  it('throws when user has no phone number on file', async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [{ smishing_consent_at: new Date(), phone_number: null }],
    })
    await expect(sendSmishingSimulation(baseOpts)).rejects.toThrow('no phone number')
  })

  it('throws when user record is not found', async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] })
    await expect(sendSmishingSimulation(baseOpts)).rejects.toThrow('has not consented')
  })

  it('sends POST to TextBelt with phone, message, and key', async () => {
    let capturedBody: Record<string, unknown> = {}
    server.use(
      http.post('https://textbelt.com/text', async ({ request }) => {
        capturedBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ success: true, quotaRemaining: 8, textId: 'txt-456' })
      })
    )
    mockDbQuery
      .mockResolvedValueOnce({ rows: [consentedUser] })
      .mockResolvedValue({ rows: [] })

    await sendSmishingSimulation(baseOpts)

    expect(capturedBody.phone).toBe('+15551234567')
    expect(capturedBody.key).toBe('textbelt')
    expect((capturedBody.message as string)).toContain('abc123token')
    expect((capturedBody.message as string)).toContain('/track/click/')
  })

  it('writes smishing_pre_send audit log before TextBelt call', async () => {
    mockDbQuery
      .mockResolvedValueOnce({ rows: [consentedUser] })
      .mockResolvedValue({ rows: [] })

    await sendSmishingSimulation(baseOpts)

    const preSendCall = mockDbQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('smishing_pre_send')
    )
    expect(preSendCall).toBeDefined()
  })

  it('writes smishing_sent audit log after successful send', async () => {
    mockDbQuery
      .mockResolvedValueOnce({ rows: [consentedUser] })
      .mockResolvedValue({ rows: [] })

    await sendSmishingSimulation(baseOpts)

    const sentCall = mockDbQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('smishing_sent')
    )
    expect(sentCall).toBeDefined()
  })

  it('throws and logs when TextBelt returns success:false', async () => {
    server.use(
      http.post('https://textbelt.com/text', () =>
        HttpResponse.json({ success: false, error: 'quota exceeded' })
      )
    )
    mockDbQuery
      .mockResolvedValueOnce({ rows: [consentedUser] })
      .mockResolvedValue({ rows: [] })

    await expect(sendSmishingSimulation(baseOpts)).rejects.toThrow('quota exceeded')
  })
})
