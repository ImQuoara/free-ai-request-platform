import { NextResponse } from 'next/server';
import { AccessError, requireOwner } from '@/lib/auth/guards';
import { normalizeSiteSettings } from '@/lib/domain/settings';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { adminSettingsPatchSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function ownerError(error: unknown) {
  const status = error instanceof AccessError ? error.status : 401;
  return NextResponse.json({ code: status === 403 ? 'OWNER_REQUIRED' : 'AUTH_REQUIRED' }, { status });
}

export async function PATCH(request: Request) {
  try {
    await requireOwner();
  } catch (error) {
    return ownerError(error);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON' }, { status: 400 });
  }

  const parsed = adminSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID_SETTINGS', issues: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from('site_settings')
    .update({
      requests_open: input.requestsOpen,
      spots_available: input.spotsAvailable,
      reopens_at: input.reopensAt,
      cooldown_minutes: input.cooldownMinutes,
      per_person_daily_cap: input.perPersonDailyCap,
      auto_decrement_on_accept: input.autoDecrementOnAccept,
      public_activity_enabled: input.publicActivityEnabled,
    })
    .eq('id', 'global')
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ code: 'SETTINGS_UPDATE_FAILED' }, { status: 500 });
  }

  return NextResponse.json({ settings: normalizeSiteSettings(data) });
}
