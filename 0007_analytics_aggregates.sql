create index if not exists analytics_event_path_created_idx
on public.analytics_events (event_name, path, created_at desc);

create or replace function public.owner_analytics_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today bigint;
  v_7d bigint;
  v_total bigint;
  v_unique bigint;
  v_submissions bigint;
  v_accepted bigint;
  v_sources jsonb;
  v_campaigns jsonb;
  v_work jsonb;
begin
  select count(*) filter (where event_name = 'page_view' and created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc')),
         count(*) filter (where event_name = 'page_view' and created_at >= now() - interval '7 days'),
         count(*) filter (where event_name = 'page_view'),
         count(distinct session_hash) filter (where event_name = 'page_view')
  into v_today, v_7d, v_total, v_unique
  from public.analytics_events;

  select count(*), count(*) filter (where accepted_at is not null)
  into v_submissions, v_accepted
  from public.requests;

  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', count) order by count desc), '[]'::jsonb)
  into v_sources
  from (
    select coalesce(nullif(source,''), 'direct') as label, count(*)::bigint as count
    from public.analytics_events
    where event_name = 'page_view'
    group by 1
    order by 2 desc
    limit 12
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', count) order by count desc), '[]'::jsonb)
  into v_campaigns
  from (
    select coalesce(nullif(campaign,''), 'none') as label, count(*)::bigint as count
    from public.analytics_events
    where event_name = 'page_view'
    group by 1
    order by 2 desc
    limit 12
  ) t;

  select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', count) order by count desc), '[]'::jsonb)
  into v_work
  from (
    select path as label, count(*)::bigint as count
    from public.analytics_events
    where event_name = 'work_view'
    group by path
    order by count(*) desc
    limit 12
  ) t;

  return jsonb_build_object(
    'visitsToday', coalesce(v_today,0),
    'visits7d', coalesce(v_7d,0),
    'totalPageViews', coalesce(v_total,0),
    'uniqueishSessions', coalesce(v_unique,0),
    'submissions', coalesce(v_submissions,0),
    'acceptedRequests', coalesce(v_accepted,0),
    'conversionRate', case when coalesce(v_unique,0) = 0 then 0 else round((v_submissions::numeric / v_unique::numeric) * 100, 2) end,
    'sourceBreakdown', v_sources,
    'campaignBreakdown', v_campaigns,
    'topWorkItems', v_work
  );
end;
$$;

revoke all on function public.owner_analytics_summary() from public, anon, authenticated;
grant execute on function public.owner_analytics_summary() to service_role;
