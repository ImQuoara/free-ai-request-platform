import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DashboardMetrics } from '@/components/admin/dashboard-metrics';
import { AccessError, requireOwner } from '@/lib/auth/guards';
import { emptyAnalyticsSummary, type AnalyticsSummary } from '@/lib/domain/analytics';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = { robots: { index: false, follow: false } };

function Breakdown({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  return <section className="panel analytics-breakdown"><span className="mini-label">Private aggregate</span><h2>{title}</h2>{items.length ? <ol>{items.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.count}</strong></li>)}</ol> : <p className="hero-copy">No data yet.</p>}</section>;
}

export default async function AnalyticsPage() {
  try { await requireOwner(); }
  catch (error) { if (error instanceof AccessError && error.status === 401) redirect('/request?auth=required'); notFound(); }

  const service = createServiceSupabaseClient();
  const { data } = await service.rpc('owner_analytics_summary');
  const summary = { ...emptyAnalyticsSummary(), ...((data ?? {}) as Partial<AnalyticsSummary>) };

  return (
    <main className="site-shell admin-shell">
      <div className="breadcrumb"><Link href="/admin">← Command center</Link><span>Private analytics</span></div>
      <header className="admin-page-title"><span className="mini-label">Owner-only acquisition analytics</span><h1>Traffic that leads somewhere.</h1><p className="hero-copy">No raw IP is stored. Session hashes rotate, and private portal/admin paths are rejected at intake.</p></header>
      <DashboardMetrics metrics={[
        { label: 'Visits today', value: summary.visitsToday }, { label: 'Visits · 7d', value: summary.visits7d }, { label: 'Page views', value: summary.totalPageViews }, { label: 'Unique-ish sessions', value: summary.uniqueishSessions }, { label: 'Submissions', value: summary.submissions }, { label: 'Conversion', value: `${summary.conversionRate}%`, detail: `${summary.acceptedRequests} accepted` },
      ]} />
      <div className="analytics-grid"><Breakdown title="Traffic sources" items={summary.sourceBreakdown} /><Breakdown title="Campaigns" items={summary.campaignBreakdown} /><Breakdown title="Top work clicks" items={summary.topWorkItems} /></div>
    </main>
  );
}
