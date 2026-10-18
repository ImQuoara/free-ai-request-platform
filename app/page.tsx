import Link from 'next/link';
import { AnalyticsBeacon } from '@/components/public/analytics-beacon';
import { AvailabilityBadge } from '@/components/public/availability-badge';
import { PublicActivity } from '@/components/public/public-activity';
import { WorkGallery, type WorkItem } from '@/components/public/work-gallery';
import works from '@/data/works.json';
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings } from '@/lib/domain/settings';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const revalidate = 60;

async function loadPublicData() {
  try {
    const supabase = await createServerSupabaseClient();
    const [{ data: settingsRow }, { data: activity }, { data: showcase }] = await Promise.all([
      supabase.from('site_settings').select('*').eq('id', 'global').single(),
      supabase.from('public_request_activity').select('public_id, request_type, public_status, created_date, safe_title').order('created_date', { ascending: false }).limit(12),
      supabase.from('public_showcase_items').select('request_public_id, title, description, media_type, asset_url, page_url, published_at').order('published_at', { ascending: false }).limit(24),
    ]);
    return { settings: normalizeSiteSettings(settingsRow), activity: activity ?? [], showcase: showcase ?? [] };
  } catch {
    return { settings: DEFAULT_SITE_SETTINGS, activity: [], showcase: [] };
  }
}

export default async function Home() {
  const { settings, activity, showcase } = await loadPublicData();
  const publishedWorks: WorkItem[] = showcase.map((item: { request_public_id: string; title: string; description: string; media_type: WorkItem['kind']; asset_url: string | null; page_url: string | null; published_at: string }) => ({
    id: item.request_public_id,
    kind: item.media_type,
    title: item.title,
    description: item.description,
    date: item.published_at.slice(0, 10),
    previewUrl: item.asset_url ?? undefined,
    publicUrl: item.page_url ?? undefined,
  }));
  const galleryItems = publishedWorks.length ? publishedWorks : works as WorkItem[];

  return (
    <main>
      <AnalyticsBeacon path="/" />
      <nav className="nav" aria-label="Primary navigation">
        <div className="site-shell nav-inner">
          <Link className="brand" href="#top" aria-label="Free AI Work home">
            <span className="brand-mark" aria-hidden="true" />
            <span>Free AI Work</span>
          </Link>
          <div className="nav-links">
            <a href="#work">Recent work</a>
            <a href="#how">How it works</a>
            <Link className="button nav-cta" href="/request">Claim a Free Spot</Link>
          </div>
        </div>
      </nav>

      <div className="site-shell" id="top">
        <section className="hero">
          <div>
            <AvailabilityBadge settings={settings} />
            <h1>Free quality AI songs, landing pages &amp; assets.</h1>
            <p className="hero-copy">
              I use AI production tools to make focused, finished creative work for a limited number of people. You request privately. I choose the projects. Finished work is public only when approved for showcase.
            </p>
            <div className="actions">
              <a className="button button-primary" href="#work">See recent work</a>
              <Link className="button" href="/request">Claim a Free Spot</Link>
            </div>
            <div className="trust-row"><span>Private requests</span><span>No public DMs</span><span>Owner-selected projects</span></div>
          </div>

          <aside className="hero-card" aria-label="How requests stay safe">
            <div className="hero-card-inner">
              <div>
                <div className="mini-label">Private by design</div>
                <h2>Your prompt is not the public post.</h2>
                <p className="hero-copy">Only harmless activity metadata can be public. Your email, prompt, reference links, private messages, files, and owner notes never belong in the public feed.</p>
              </div>
              <div className="stat-row">
                <div className="stat"><strong>{settings.requestsOpen ? settings.spotsAvailable : 0}</strong><span>visible free spots</span></div>
                <div className="stat"><strong>1:1</strong><span>private project thread</span></div>
              </div>
            </div>
          </aside>
        </section>

        <section className="section" id="work">
          <div className="section-head">
            <div><span className="mini-label">Recent work</span><h2>Finished work, clearly labeled.</h2></div>
            <p>Only owner-approved public previews appear here. Demo layout cards are explicitly marked until real showcase assets are added.</p>
          </div>
          <WorkGallery items={galleryItems} />
        </section>

        <section className="section" id="how">
          <div className="section-head"><div><span className="mini-label">How it works</span><h2>Simple enough to use every day.</h2></div></div>
          <div className="grid">
            <article className="card"><span className="card-kicker">01</span><h3>Verify &amp; request</h3><p>Verify your email, double-check one clear request, and submit. Cooldowns and daily limits stop request spam.</p></article>
            <article className="card"><span className="card-kicker">02</span><h3>I choose the projects</h3><p>Submitting is not an acceptance. I pick what fits the available free spots and current production capacity.</p></article>
            <article className="card"><span className="card-kicker">03</span><h3>Work privately</h3><p>If selected, your project gets a private one-to-one thread. Nobody else can browse or contact requesters.</p></article>
          </div>
        </section>

        <section className="section" id="activity">
          <div className="section-head"><div><span className="mini-label">Owner-approved public activity</span><h2>Momentum without exposing people.</h2></div><p>Only an anonymous request ID, type, status, date, and optional owner-written title can appear here. Full requests remain private.</p></div>
          <PublicActivity items={settings.publicActivityEnabled ? activity : []} />
          <div className="actions activity-cta"><Link className="button button-primary" href="/request">Request free work</Link></div>
        </section>
      </div>

      <footer className="footer"><div className="site-shell footer-inner"><span>Free AI Work · Private-by-design requests</span><div><a href="#work">Work</a><Link href="/request">Request</Link></div></div></footer>
    </main>
  );
}
