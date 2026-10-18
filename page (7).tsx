import { AnalyticsBeacon } from '@/components/public/analytics-beacon';
import Link from 'next/link';
import { AvailabilityBadge } from '@/components/public/availability-badge';
import { RequestAccessGate } from '@/components/request/request-access-gate';
import { RequestForm } from '@/components/request/request-form';
import { RequestRules } from '@/components/request/request-rules';
import { verifiedIdentityFromUser } from '@/lib/auth/guards';
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings } from '@/lib/domain/settings';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadState() {
  try {
    const supabase = await createServerSupabaseClient();
    const [{ data: settingsRow }, { data: userData }] = await Promise.all([
      supabase.from('site_settings').select('*').eq('id', 'global').single(),
      supabase.auth.getUser(),
    ]);
    let identity = null;
    try {
      identity = verifiedIdentityFromUser(userData.user);
    } catch {
      identity = null;
    }
    return { settings: normalizeSiteSettings(settingsRow), identity };
  } catch {
    return { settings: DEFAULT_SITE_SETTINGS, identity: null };
  }
}

export default async function RequestPage() {
  const { settings, identity } = await loadState();

  return (
    <main>
      <AnalyticsBeacon path="/request" />
      <nav className="nav">
        <div className="site-shell nav-inner">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true" />
            <span>Free AI Work</span>
          </Link>
          <div className="nav-links">
            <Link href="/">← Home</Link>
            {identity && <Link className="button nav-cta" href="/portal">My projects</Link>}
          </div>
        </div>
      </nav>
      <div className="site-shell request-layout">
        <section>
          <AvailabilityBadge settings={settings} />
          <div className="request-heading">
            <span className="mini-label">Secure request</span>
            <h1>Ask for one thing worth making.</h1>
            <p className="hero-copy">
              Full request details stay between you and the owner. Public activity, if enabled, uses only an anonymous ID, request type, safe status, and date.
            </p>
          </div>
          {!identity ? (
            <RequestAccessGate turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''} />
          ) : !settings.requestsOpen ? (
            <div className="access-card">
              <h2>New requests are closed right now.</h2>
              <p className="hero-copy">Your existing private projects are still available.</p>
              <Link className="button" href="/portal">Open my projects</Link>
            </div>
          ) : (
            <RequestForm
              settings={settings}
              email={identity.email}
              turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
            />
          )}
        </section>
        <RequestRules settings={settings} />
      </div>
    </main>
  );
}
