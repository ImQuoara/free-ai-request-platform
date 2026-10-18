import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { safeAuthNextPath } from '@/lib/security/redirects';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeAuthNextPath(url.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/request?auth=invalid', url.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/request?auth=failed', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
