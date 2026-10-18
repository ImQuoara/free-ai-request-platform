import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const protectedPath =
    request.nextUrl.pathname.startsWith('/portal') || request.nextUrl.pathname.startsWith('/admin');

  // Public routes remain usable before configuration, but private routes fail closed.
  if (!url || !publishableKey) {
    if (protectedPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/request';
      redirectUrl.search = '?auth=required';
      const redirect = NextResponse.redirect(redirectUrl);
      redirect.headers.set('Cache-Control', 'private, no-store, max-age=0');
      redirect.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
      return redirect;
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const hasVerifiedClaims = Boolean(data?.claims?.sub);

  if (protectedPath && !hasVerifiedClaims) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/request';
    redirectUrl.search = '?auth=required';
    const redirect = NextResponse.redirect(redirectUrl);
    redirect.headers.set('Cache-Control', 'private, no-store, max-age=0');
    redirect.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return redirect;
  }

  if (protectedPath) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Vary', 'Cookie');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return response;
}
