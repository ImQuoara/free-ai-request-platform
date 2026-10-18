do $$ begin
  create type public.request_type as enum ('Song', 'Landing Page', 'Other');
exception when duplicate_object then null;
end $$;

alter table public.requests
  add column if not exists source_context jsonb not null default '{}'::jsonb;

alter table public.requests
  drop constraint if exists requests_source_context_object;
alter table public.requests
  add constraint requests_source_context_object check (jsonb_typeof(source_context) = 'object');

create or replace function public.submit_request_guarded(
  p_requester_id uuid,
  p_name text,
  p_email text,
  p_discord text,
  p_type public.request_type,
  p_description text,
  p_reference_links jsonb,
  p_consents jsonb,
  p_source jsonb,
  p_risk_flags jsonb
)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.site_settings%rowtype;
  v_last_created timestamptz;
  v_daily_count integer;
  v_remaining_seconds integer;
  v_result public.requests%rowtype;
begin
  if p_requester_id is null then
    raise exception using errcode = 'P0001', message = 'requester_required';
  end if;

  -- Serialize limit checks and insertion for a single verified requester.
  perform pg_advisory_xact_lock(hashtextextended(p_requester_id::text, 0));

  select * into v_settings
  from public.site_settings
  where id = 'global';

  if not found or not v_settings.requests_open then
    raise exception using errcode = 'P0001', message = 'requests_closed';
  end if;

  select max(created_at) into v_last_created
  from public.requests
  where requester_id = p_requester_id;

  if v_settings.cooldown_minutes > 0
     and v_last_created is not null
     and v_last_created + make_interval(mins => v_settings.cooldown_minutes) > now() then
    v_remaining_seconds := greatest(
      1,
      ceil(extract(epoch from ((v_last_created + make_interval(mins => v_settings.cooldown_minutes)) - now())))::integer
    );
    raise exception using
      errcode = 'P0001',
      message = 'cooldown_active',
      detail = json_build_object('remaining_seconds', v_remaining_seconds)::text;
  end if;

  if v_settings.per_person_daily_cap is not null then
    select count(*)::integer into v_daily_count
    from public.requests
    where requester_id = p_requester_id
      and created_at >= date_trunc('day', now());

    if v_daily_count >= v_settings.per_person_daily_cap then
      raise exception using
        errcode = 'P0001',
        message = 'daily_cap_reached',
        detail = json_build_object('daily_cap', v_settings.per_person_daily_cap)::text;
    end if;
  end if;

  insert into public.requests (
    requester_id,
    requester_email,
    name,
    discord,
    request_type,
    description,
    reference_links,
    review_confirmed,
    rights_confirmed,
    scope_confirmed,
    showcase_consent,
    credit_consent,
    source_context,
    risk_flags
  ) values (
    p_requester_id,
    lower(trim(p_email)),
    trim(p_name),
    nullif(trim(coalesce(p_discord, '')), ''),
    p_type::text,
    trim(p_description),
    coalesce(p_reference_links, '[]'::jsonb),
    coalesce((p_consents->>'review')::boolean, false),
    coalesce((p_consents->>'rights')::boolean, false),
    coalesce((p_consents->>'scope')::boolean, false),
    coalesce((p_consents->>'showcase')::boolean, false),
    coalesce((p_consents->>'credit')::boolean, false),
    coalesce(p_source, '{}'::jsonb),
    coalesce(p_risk_flags, '[]'::jsonb)
  )
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.transition_request_status_atomic(
  p_request_id uuid,
  p_target_status public.request_status
)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_settings public.site_settings%rowtype;
  v_allowed boolean := false;
begin
  select * into v_request
  from public.requests
  where id = p_request_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'request_not_found';
  end if;

  if v_request.status = p_target_status then
    return v_request;
  end if;

  v_allowed := case v_request.status
    when 'NEW' then p_target_status in ('ACCEPTED', 'REJECTED')
    when 'ACCEPTED' then p_target_status in ('IN_PROGRESS', 'REJECTED')
    when 'IN_PROGRESS' then p_target_status in ('COMPLETED', 'REJECTED')
    when 'COMPLETED' then p_target_status in ('PUBLISHED', 'IN_PROGRESS')
    when 'PUBLISHED' then p_target_status = 'COMPLETED'
    when 'REJECTED' then p_target_status = 'NEW'
    else false
  end;

  if not v_allowed then
    raise exception using errcode = 'P0001', message = 'invalid_status_transition';
  end if;

  if p_target_status = 'ACCEPTED' and v_request.accepted_at is null then
    select * into v_settings
    from public.site_settings
    where id = 'global'
    for update;

    if v_settings.auto_decrement_on_accept then
      if v_settings.spots_available <= 0 then
        raise exception using errcode = 'P0001', message = 'no_spots_available';
      end if;

      update public.site_settings
      set spots_available = spots_available - 1
      where id = 'global'
        and spots_available > 0;

      if not found then
        raise exception using errcode = 'P0001', message = 'no_spots_available';
      end if;
    end if;
  end if;

  update public.requests
  set
    status = p_target_status,
    accepted_at = case when p_target_status = 'ACCEPTED' then coalesce(accepted_at, now()) else accepted_at end,
    completed_at = case when p_target_status = 'COMPLETED' then now() else completed_at end,
    published_at = case when p_target_status = 'PUBLISHED' then now() else published_at end
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.submit_request_guarded(uuid,text,text,text,public.request_type,text,jsonb,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.transition_request_status_atomic(uuid,public.request_status) from public, anon, authenticated;
grant execute on function public.submit_request_guarded(uuid,text,text,text,public.request_type,text,jsonb,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.transition_request_status_atomic(uuid,public.request_status) to service_role;

alter table public.submission_attempts
  add column if not exists content_hash text,
  add column if not exists reference_hash text;

alter table public.submission_attempts
  drop constraint if exists submission_attempts_content_hash_length;
alter table public.submission_attempts
  add constraint submission_attempts_content_hash_length check (content_hash is null or char_length(content_hash) between 32 and 128);
alter table public.submission_attempts
  drop constraint if exists submission_attempts_reference_hash_length;
alter table public.submission_attempts
  add constraint submission_attempts_reference_hash_length check (reference_hash is null or char_length(reference_hash) between 32 and 128);

create index if not exists submission_attempts_content_created_idx on public.submission_attempts (content_hash, created_at desc) where content_hash is not null;
create index if not exists submission_attempts_reference_created_idx on public.submission_attempts (reference_hash, created_at desc) where reference_hash is not null;
