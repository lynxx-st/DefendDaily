import { ImageResponse } from 'next/og';
import { NextResponse } from 'next/server';
import { api } from '@/lib/api';
import { authorizeCisoOrAdmin } from '@/lib/auth-guard';
import { RISK_COLORS, scoreBucket } from '@/lib/risk-colors';

export const runtime = 'nodejs';

const WIDTH = 1200;
const HEIGHT = 630;

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } },
) {
  const result = await authorizeCisoOrAdmin();
  if (!result.ok) {
    return new NextResponse(result.reason, { status: result.status });
  }
  if (result.session.user.orgId !== params.orgId) {
    return new NextResponse('org_mismatch', { status: 403 });
  }

  const users = await api.getOrgUsers(result.session, params.orgId);
  const cells = users.slice(0, 96).map(u => ({
    score: u.risk_score,
    color: RISK_COLORS[scoreBucket(u.risk_score)],
    label: (u.display_name ?? u.email).split(/[ @]/)[0] ?? '',
  }));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0f0f0f',
          color: '#ffffff',
          padding: 48,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 14,
                letterSpacing: 1.6,
                color: '#888888',
                textTransform: 'uppercase',
              }}
            >
              DefendDaily
            </span>
            <span style={{ fontSize: 40, fontWeight: 500, marginTop: 8 }}>
              Risk Heatmap · {users.length} {users.length === 1 ? 'user' : 'users'}
            </span>
          </div>
          <span style={{ fontSize: 14, color: '#a8a8a8' }}>
            {new Date().toLocaleDateString()}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            flex: 1,
            alignContent: 'flex-start',
          }}
        >
          {cells.map((cell, i) => (
            <div
              key={i}
              style={{
                width: 110,
                height: 76,
                backgroundColor: cell.color,
                color: '#0f0f0f',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 600 }}>{cell.score}</span>
              <span style={{ fontSize: 12, marginTop: 4 }}>{cell.label}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 32,
            color: '#a8a8a8',
            fontSize: 14,
          }}
        >
          {(
            [
              { label: '80–100', color: RISK_COLORS.green },
              { label: '60–79', color: RISK_COLORS.amber },
              { label: '40–59', color: RISK_COLORS.orange },
              { label: '0–39', color: RISK_COLORS.red },
            ] as const
          ).map(legend => (
            <div
              key={legend.label}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: legend.color,
                  borderRadius: 3,
                }}
              />
              {legend.label}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        'cache-control': 'no-store',
        'content-disposition': `attachment; filename="risk-heatmap-${params.orgId.slice(0, 8)}.png"`,
      },
    },
  );
}
