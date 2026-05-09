# Steps 4.10 + 4.11 + 4.13 + 4.14: Compliance PDF Route

## Install

```bash
cd apps/api && pnpm add @react-pdf/renderer
cd apps/dashboard && pnpm add @react-pdf/renderer
```

## apps/api/src/routes/compliance.ts

```typescript
import { Router, Request, Response } from 'express';
import { renderToBuffer } from '@react-pdf/renderer';
import { db } from '../db/client';
import { requireRole } from '../middleware/auth';
import { buildCompliancePdf } from '../services/compliancePdf';

export const complianceRouter = Router();

// GET /api/compliance/:orgId/pdf — streams PDF (Step 4.10 + 4.13 session guard)
complianceRouter.get('/:orgId/pdf', requireRole(['ciso', 'admin']), async (req: Request, res: Response) => {
  const { orgId } = req.params;

  // Gather all data for the report
  const [orgResult, statsResult, phishResult] = await Promise.all([
    db.query('SELECT name, plan, created_at FROM organizations WHERE id = $1', [orgId]),
    db.query(`
      SELECT
        COUNT(DISTINCT u.id) AS total_users,
        ROUND(AVG(u.risk_score)) AS avg_score,
        COUNT(pd.id) AS total_interactions,
        COUNT(pd.id) FILTER (WHERE pd.is_correct = true) AS correct_answers
      FROM users u
      LEFT JOIN puzzle_deliveries pd ON u.id = pd.user_id
      WHERE u.org_id = $1
    `, [orgId]),
    db.query(`
      SELECT
        COUNT(*) AS total_sent,
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) AS total_clicked,
        COUNT(*) FILTER (WHERE reported_at IS NOT NULL) AS total_reported
      FROM phish_campaigns pc
      JOIN users u ON pc.target_id = u.id
      WHERE u.org_id = $1
    `, [orgId]),
  ]);

  const org = orgResult.rows[0];
  const stats = statsResult.rows[0];
  const phish = phishResult.rows[0];

  const pdfBuffer = await renderToBuffer(buildCompliancePdf({
    orgName: org.name,
    plan: org.plan,
    reportingPeriod: `${new Date(org.created_at).toLocaleDateString()} – ${new Date().toLocaleDateString()}`,
    totalUsers: parseInt(stats.total_users, 10),
    avgScore: parseInt(stats.avg_score, 10),
    totalInteractions: parseInt(stats.total_interactions, 10),
    correctAnswers: parseInt(stats.correct_answers, 10),
    phishSent: parseInt(phish.total_sent, 10),
    phishClicked: parseInt(phish.total_clicked, 10),
    phishReported: parseInt(phish.total_reported, 10),
    generatedAt: new Date().toISOString(),
  }));

  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="${org.name.replace(/\s+/g, '_')}_compliance.pdf"`);
  res.send(pdfBuffer);
});
```

## apps/api/src/services/compliancePdf.tsx

```typescript
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  section: { marginBottom: 16 },
  heading: { fontSize: 14, fontWeight: 'bold', marginBottom: 4, color: '#1D4ED8' },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontSize: 10, width: 160, color: '#6B7280' },
  value: { fontSize: 10, fontWeight: 'bold' },
  attestation: { marginTop: 24, padding: 12, backgroundColor: '#F3F4F6' },
  attestationText: { fontSize: 9, color: '#374151', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#9CA3AF' },
});

type Props = {
  orgName: string;
  plan: string;
  reportingPeriod: string;
  totalUsers: number;
  avgScore: number;
  totalInteractions: number;
  correctAnswers: number;
  phishSent: number;
  phishClicked: number;
  phishReported: number;
  generatedAt: string;
};

export function buildCompliancePdf(props: Props) {
  const accuracy = props.totalInteractions > 0
    ? Math.round((props.correctAnswers / props.totalInteractions) * 100)
    : 0;
  const clickRate = props.phishSent > 0
    ? Math.round((props.phishClicked / props.phishSent) * 100)
    : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Security Awareness Training Report</Text>
        <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 24 }}>
          {props.orgName} — {props.plan.toUpperCase()} Plan
        </Text>

        <View style={styles.section}>
          <Text style={styles.heading}>Reporting Period</Text>
          <Text style={{ fontSize: 10 }}>{props.reportingPeriod}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Training Summary</Text>
          <View style={styles.row}><Text style={styles.label}>Total Employees Trained:</Text><Text style={styles.value}>{props.totalUsers}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Total Training Interactions:</Text><Text style={styles.value}>{props.totalInteractions}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Average Accuracy:</Text><Text style={styles.value}>{accuracy}%</Text></View>
          <View style={styles.row}><Text style={styles.label}>Average Risk Score:</Text><Text style={styles.value}>{props.avgScore}/100</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Phishing Simulation Results</Text>
          <View style={styles.row}><Text style={styles.label}>Simulations Sent:</Text><Text style={styles.value}>{props.phishSent}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Click Rate:</Text><Text style={styles.value}>{clickRate}%</Text></View>
          <View style={styles.row}><Text style={styles.label}>Report Rate:</Text><Text style={styles.value}>{props.phishSent > 0 ? Math.round((props.phishReported / props.phishSent) * 100) : 0}%</Text></View>
        </View>

        <View style={styles.attestation}>
          <Text style={[styles.attestationText, { fontWeight: 'bold', marginBottom: 4 }]}>
            Attestation
          </Text>
          <Text style={styles.attestationText}>
            This report certifies that {props.orgName} has conducted ongoing security awareness
            training during the period specified above. Training includes daily interactive
            security challenges delivered via Slack/Microsoft Teams, phishing simulation exercises,
            and continuous risk score monitoring. All training activities are logged and auditable.
            {'\n\n'}
            Generated by DefendDaily on {new Date(props.generatedAt).toLocaleDateString()}.
          </Text>
        </View>

        <Text style={styles.footer}>
          DefendDaily Human Risk Management Platform — Confidential — {props.generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
```

**Commit:**
```bash
git add apps/api/src/routes/compliance.ts apps/api/src/services/compliancePdf.tsx
git commit -m "feat(api): add compliance PDF generation endpoint with react-pdf/renderer"
```

**Update PROGRESS.md:** Check off 4.10, 4.11, 4.13, 4.14. Set Last Completed to "4.14 — compliance PDF route".
