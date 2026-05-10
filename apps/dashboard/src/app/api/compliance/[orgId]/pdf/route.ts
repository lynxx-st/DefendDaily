import { NextResponse } from 'next/server';
import { authorizeCisoOrAdmin } from '@/lib/auth-guard';
import { signApiJwt } from '@/lib/api-jwt';
import { env } from '@/config/env';

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

  const token = await signApiJwt(result.session);
  const upstream = await fetch(`${env.API_URL}/api/compliance/${params.orgId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return new NextResponse(`Upstream error ${upstream.status}`, { status: upstream.status });
  }

  const headers = new Headers();
  const ct = upstream.headers.get('content-type');
  const cd = upstream.headers.get('content-disposition');
  if (ct) headers.set('content-type', ct);
  if (cd) headers.set('content-disposition', cd);
  headers.set('cache-control', 'no-store');

  return new NextResponse(upstream.body, { status: 200, headers });
}
