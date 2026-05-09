import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { env } from '@/config/env';

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } },
) {
  const session = await auth();
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 });
  if (session.user.orgId !== params.orgId) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const upstream = await fetch(`${env.API_URL}/api/compliance/${params.orgId}/pdf`, {
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
