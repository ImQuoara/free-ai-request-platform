import { NextResponse } from 'next/server';
import { AccessError, requireOwner } from '@/lib/auth/guards';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { publicationSchema } from '@/lib/validation/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    await requireOwner();
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 401;
    return NextResponse.json({ code: status === 403 ? 'OWNER_REQUIRED' : 'AUTH_REQUIRED' }, { status });
  }

  const parsed = publicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ code: 'INVALID_PUBLICATION' }, { status: 400 });

  const { requestId } = await params;
  const input = parsed.data;
  const showcase = input.showcase.published ? input.showcase : null;
  const service = createServiceSupabaseClient();
  const { data, error } = await service.rpc('set_request_publication', {
    p_request_id: requestId,
    p_activity_enabled: input.activityEnabled,
    p_safe_title: input.activityEnabled ? input.safeTitle : null,
    p_showcase_published: input.showcase.published,
    p_showcase_title: showcase?.title ?? null,
    p_showcase_description: showcase?.description ?? null,
    p_showcase_media_type: showcase?.mediaType ?? null,
    p_asset_url: showcase?.assetUrl ?? null,
    p_page_url: showcase?.pageUrl ?? null,
  });

  if (error) {
    const status = (error.message ?? '').includes('request_not_found') ? 404 : 400;
    return NextResponse.json({ code: status === 404 ? 'PROJECT_NOT_FOUND' : 'PUBLICATION_FAILED' }, { status });
  }
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ request: { publicId: row?.public_id, publicActivityEnabled: row?.public_activity_enabled } });
}
