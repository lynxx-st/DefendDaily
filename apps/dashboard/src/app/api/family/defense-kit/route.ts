import { type NextRequest, NextResponse } from 'next/server';
import { authorizeCisoOrAdmin } from '@/lib/auth-guard';
import { signApiJwt } from '@/lib/api-jwt';
import { env } from '@/config/env';

export async function GET(_req: NextRequest) {
  const authResult = await authorizeCisoOrAdmin();
  if (!authResult.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: authResult.status });
  }

  const token = await signApiJwt(authResult.session);

  const upstream = await fetch(`${env.API_URL}/api/family/home-defense-kit`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'Kit generation failed' },
      { status: upstream.status },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="DefendDaily_HomeDefenseKit.zip"',
    },
  });
}
