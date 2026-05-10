import { describe, it, expect, vi } from 'vitest'

// Stub @react-pdf/renderer to avoid the native font/glyph layout pipeline.
// We assert the React tree shape, not pixel output.
vi.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: { children: unknown }) => ({ type: 'Document', children }),
  Page: ({ children }: { children: unknown }) => ({ type: 'Page', children }),
  Text: ({ children }: { children: unknown }) => ({ type: 'Text', children }),
  View: ({ children }: { children: unknown }) => ({ type: 'View', children }),
  StyleSheet: { create: <T,>(s: T) => s },
}))

import { buildCompliancePdf, type CompliancePdfProps } from '../compliancePdf'

const baseProps: CompliancePdfProps = {
  orgName: 'Acme Inc',
  plan: 'growth',
  reportingPeriod: '2025-01-01 – 2026-05-09',
  totalUsers: 50,
  avgScore: 78,
  totalInteractions: 1200,
  correctAnswers: 960,
  phishSent: 100,
  phishClicked: 12,
  phishReported: 38,
  generatedAt: '2026-05-09T16:00:00.000Z',
}

function flatten(node: unknown): string[] {
  if (node == null) return []
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(flatten)
  if (typeof node === 'object' && 'props' in (node as { props?: unknown })) {
    const props = (node as { props: { children?: unknown } }).props
    return flatten(props.children)
  }
  return []
}

describe('buildCompliancePdf', () => {
  it('renders the org name, plan, and reporting period in the header', () => {
    const tree = buildCompliancePdf(baseProps)
    const text = flatten(tree).join(' ').replace(/\s+/g, ' ')
    expect(text).toContain('Acme Inc')
    expect(text).toContain('GROWTH')
    expect(text).toContain('2025-01-01 – 2026-05-09')
  })

  it('computes accuracy from correctAnswers / totalInteractions', () => {
    const tree = buildCompliancePdf(baseProps)
    const text = flatten(tree).join(' ').replace(/\s+/g, ' ')
    expect(text).toMatch(/Average Accuracy 80\s*%/) // 960 / 1200 = 80%
  })

  it('computes click rate and report rate from phish counts', () => {
    const tree = buildCompliancePdf(baseProps)
    const text = flatten(tree).join(' ').replace(/\s+/g, ' ')
    expect(text).toMatch(/Click Rate 12\s*%/) // 12 / 100 = 12%
    expect(text).toMatch(/Report Rate 38\s*%/) // 38 / 100 = 38%
  })

  it('avoids divide-by-zero when no interactions or phish sent', () => {
    const tree = buildCompliancePdf({
      ...baseProps,
      totalInteractions: 0,
      correctAnswers: 0,
      phishSent: 0,
      phishClicked: 0,
      phishReported: 0,
    })
    const text = flatten(tree).join(' ').replace(/\s+/g, ' ')
    expect(text).toMatch(/Average Accuracy 0\s*%/)
    expect(text).toMatch(/Click Rate 0\s*%/)
  })

  it('renders the attestation block referencing the org name', () => {
    const tree = buildCompliancePdf(baseProps)
    const text = flatten(tree).join(' ').replace(/\s+/g, ' ')
    expect(text).toContain('Attestation')
    expect(text).toMatch(/certifies that Acme Inc/)
  })
})
