import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@sendgrid/mail', () => ({
  default: { setApiKey: vi.fn(), send: vi.fn() },
}))
vi.mock('../../config/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))

// env must be mocked before importing the module under test
vi.mock('../../config/env', () => ({
  env: {
    SENDGRID_API_KEY: 'SG.test-key',
    SENDGRID_FROM_EMAIL: 'alerts@defenddaily.com',
  },
}))

import sgMail from '@sendgrid/mail'
import { sendBreachMonitorEmail } from '../email'

const mockSend = vi.mocked(sgMail.send)

describe('sendBreachMonitorEmail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends email with breach list when breaches exist', async () => {
    mockSend.mockResolvedValueOnce([{ statusCode: 202 }] as never)

    await sendBreachMonitorEmail('user@example.com', [
      { name: 'AcmeCorp', date: '2024-01-15', dataClasses: ['Email addresses', 'Passwords'] },
    ])

    expect(mockSend).toHaveBeenCalledOnce()
    const [msg] = mockSend.mock.calls[0] as [{ to: string; html: string; subject: string }]
    expect(msg.to).toBe('user@example.com')
    expect(msg.html).toContain('AcmeCorp')
    expect(msg.html).toContain('Email addresses')
    expect(msg.subject).toContain('Weekly Security Report')
  })

  it('sends "no new breaches" message when list is empty', async () => {
    mockSend.mockResolvedValueOnce([{ statusCode: 202 }] as never)

    await sendBreachMonitorEmail('user@example.com', [])

    const [msg] = mockSend.mock.calls[0] as [{ html: string }]
    expect(msg.html).toContain('No new breaches detected')
  })

  it('skips send when SENDGRID_API_KEY is absent', async () => {
    // Isolate a fresh module load with no API key configured
    const sendNoKey = await vi.importActual<typeof import('../email')>('../email')
      .catch(() => null)

    vi.resetModules()
    vi.doMock('../../config/env', () => ({
      env: { SENDGRID_API_KEY: undefined, SENDGRID_FROM_EMAIL: 'alerts@defenddaily.com' },
    }))
    vi.doMock('@sendgrid/mail', () => ({ default: { setApiKey: vi.fn(), send: vi.fn() } }))
    vi.doMock('../../config/logger', () => ({
      logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    }))

    const { sendBreachMonitorEmail: sendWithNoKey } = await import('../email')
    const sgMock = (await import('@sendgrid/mail')).default

    await sendWithNoKey('user@example.com', [])

    // Guard returned early — sgMail.send never reached
    expect(vi.mocked(sgMock.send)).not.toHaveBeenCalled()
    void sendNoKey
  })
})
