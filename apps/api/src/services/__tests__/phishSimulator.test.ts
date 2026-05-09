import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSendMail = vi.hoisted(() => vi.fn().mockResolvedValue({ messageId: 'test-id' }))

vi.mock('../../config/env', () => ({
  env: {
    TRACKING_BASE_URL: 'http://localhost:3001',
    PHISH_FROM_DOMAIN: 'mail.defenddaily.com',
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_USER: undefined,
    SMTP_PASS: undefined,
  },
}))

vi.mock('../../db/client', () => ({
  db: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}))

vi.mock('../../config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}))

import { sendPhishSimulation } from '../phishSimulator'

const baseOpts = {
  senderId: 'sender-1',
  targetId: 'target-1',
  targetEmail: 'target@example.com',
  template: {
    id: 'tmpl-1',
    name: 'Fake Invoice',
    subject: 'Your invoice is ready',
    body_html: '<p>Click <a href="http://example.com/pay">here</a> to pay</p>',
    lure_type: 'fake_invoice',
    difficulty: 'easy',
  },
  orgId: 'org-1',
}

describe('sendPhishSimulation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a 64-character hex tracking token', async () => {
    const token = await sendPhishSimulation(baseOpts)
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[a-f0-9]+$/)
  })

  it('injects open-tracking pixel into email body', async () => {
    await sendPhishSimulation(baseOpts)
    const html = mockSendMail.mock.calls[0]?.[0]?.html as string
    expect(html).toContain('/track/open/')
    expect(html).toContain('<img')
  })

  it('replaces href links with click-tracking URL', async () => {
    await sendPhishSimulation(baseOpts)
    const html = mockSendMail.mock.calls[0]?.[0]?.html as string
    expect(html).toContain('/track/click/')
    expect(html).not.toContain('href="http://example.com/pay"')
  })

  it('inserts phish_campaigns row before sending', async () => {
    const { db } = await import('../../db/client')
    await sendPhishSimulation(baseOpts)
    const insertCalls = vi.mocked(db.query).mock.calls
    const campaignInsert = insertCalls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('phish_campaigns')
    )
    expect(campaignInsert).toBeDefined()
  })

  it('writes audit_log entry with peer_phish_sent action', async () => {
    const { db } = await import('../../db/client')
    await sendPhishSimulation(baseOpts)
    const auditCall = vi.mocked(db.query).mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('peer_phish_sent')
    )
    expect(auditCall).toBeDefined()
  })

  it('uses the org phish domain as sender', async () => {
    await sendPhishSimulation(baseOpts)
    const fromField = mockSendMail.mock.calls[0]?.[0]?.from as string
    expect(fromField).toContain('mail.defenddaily.com')
  })

  it('each call produces a unique tracking token', async () => {
    const token1 = await sendPhishSimulation(baseOpts)
    const token2 = await sendPhishSimulation(baseOpts)
    expect(token1).not.toBe(token2)
  })
})
