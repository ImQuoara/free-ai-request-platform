import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { isBlockedAiCrawler } from '@/lib/security/crawlers';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  if (isBlockedAiCrawler(request.headers.get('user-agent'))) {
    return new NextResponse('Automated AI crawling is not permitted.', {
      status: 403,
      headers: {
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    });
  }

  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
