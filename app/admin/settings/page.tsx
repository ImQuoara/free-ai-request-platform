import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SettingsForm } from '@/components/admin/settings-form';
import { AccessError, requireOwner } from '@/lib/auth/guards';
import { normalizeSiteSettings } from '@/lib/domain/settings';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  try {
    await requireOwner();
  } catch (error) {
    if (error instanceof AccessError && error.status === 401) redirect('/request?auth=required');
    notFound();
  }

  const service = createServiceSupabaseClient();
  const { data } = await service.from('site_settings').select('*').eq('id', 'global').single();
  const settings = normalizeSiteSettings(data);

  return (
    <main className="site-shell admin-shell admin-settings-shell">
      <div className="breadcrumb"><Link href="/admin">← Command center</Link><span>Owner settings</span></div>
      <header className="admin-page-title"><span className="mini-label">Live owner controls</span><h1>Availability &amp; request limits</h1><p className="hero-copy">These settings are stored in Supabase and take effect without a redeploy.</p></header>
      <SettingsForm settings={settings} />
    </main>
  );
}
