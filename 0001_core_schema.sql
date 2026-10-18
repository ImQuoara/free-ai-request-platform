create extension if not exists pgcrypto;

do $$ begin
  create type public.request_status as enum ('NEW', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'PUBLISHED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.message_role as enum ('requester', 'owner');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum (
    'NEW_REQUEST',
    'REQUESTER_REPLY',
    'ACCEPTED_ACTION',
    'COMPLETED_UNPUBLISHED',
    'ABUSE_FLAG',
    'ACCESS_ISSUE'
  );
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.make_public_request_id()
returns text
language sql
volatile
set search_path = public
as $$
  select 'R' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_length check (char_length(email) between 3 and 320),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 120)
);

create table if not exists public.site_settings (
  id text primary key default 'global',
  requests_open boolean not null default false,
  spots_available integer not null default 0,
  reopens_at timestamptz,
  cooldown_minutes integer not null default 10,
  per_person_daily_cap integer,
  auto_decrement_on_accept boolean not null default true,
  public_activity_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint site_settings_singleton check (id = 'global'),
  constraint site_settings_spots_nonnegative check (spots_available >= 0),
  constraint site_settings_cooldown_range check (cooldown_minutes between 0 and 1440),
  constraint site_settings_daily_cap_range check (per_person_daily_cap is null or per_person_daily_cap between 1 and 100)
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  public_id text not null default public.make_public_request_id(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  name text not null,
  discord text,
  request_type text not null,
  description text not null,
  reference_links jsonb not null default '[]'::jsonb,
  review_confirmed boolean not null,
  rights_confirmed boolean not null,
  scope_confirmed boolean not null,
  showcase_consent boolean not null,
  credit_consent boolean not null,
  status public.request_status not null default 'NEW',
  public_activity_enabled boolean not null default true,
  owner_notes text,
  risk_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz,
  published_at timestamptz,
  constraint requests_public_id_unique unique (public_id),
  constraint requests_public_id_shape check (public_id ~ '^R[A-F0-9]{8}$'),
  constraint requests_email_length check (char_length(requester_email) between 3 and 320),
  constraint requests_name_length check (char_length(name) between 1 and 120),
  constraint requests_discord_length check (discord is null or char_length(discord) <= 120),
  constraint requests_type_allowed check (request_type in ('Song', 'Landing Page', 'Other')),
  constraint requests_description_length check (char_length(description) between 10 and 5000),
  constraint requests_reference_links_array check (jsonb_typeof(reference_links) = 'array'),
  constraint requests_risk_flags_array check (jsonb_typeof(risk_flags) = 'array'),
  constraint requests_confirmations_required check (
    review_confirmed and rights_confirmed and scope_confirmed and showcase_consent and credit_consent
  )
);

create index if not exists requests_requester_created_idx on public.requests (requester_id, created_at desc);
create index if not exists requests_status_created_idx on public.requests (status, created_at desc);
create index if not exists requests_public_activity_idx on public.requests (public_activity_enabled, created_at desc);

create table if not exists public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role public.message_role not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint request_messages_body_length check (char_length(body) between 1 and 4000)
);

create index if not exists request_messages_request_created_idx on public.request_messages (request_id, created_at asc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type public.notification_type not null,
  request_public_id text,
  title text not null,
  detail text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_length check (char_length(title) between 1 and 180),
  constraint notifications_detail_length check (detail is null or char_length(detail) <= 1000)
);

create index if not exists notifications_unread_idx on public.notifications (created_at desc) where read_at is null;

-- This table deliberately has no raw request UUID, requester identity, prompt, reference,
-- message, moderation, or analytics fields. It is the only request-derived public surface.
create table if not exists public.public_request_activity (
  public_id text primary key,
  request_type text not null,
  public_status public.request_status not null,
  created_date date not null,
  safe_title text,
  updated_at timestamptz not null default now(),
  constraint public_activity_id_shape check (public_id ~ '^R[A-F0-9]{8}$'),
  constraint public_activity_type_allowed check (request_type in ('Song', 'Landing Page', 'Other')),
  constraint public_activity_safe_title_length check (safe_title is null or char_length(safe_title) <= 120)
);

create index if not exists public_activity_created_idx on public.public_request_activity (created_date desc, updated_at desc);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  path text not null,
  source text,
  campaign text,
  referrer_host text,
  session_hash text not null,
  created_at timestamptz not null default now(),
  constraint analytics_event_name_length check (char_length(event_name) between 1 and 80),
  constraint analytics_path_length check (char_length(path) between 1 and 300),
  constraint analytics_source_length check (source is null or char_length(source) <= 80),
  constraint analytics_campaign_length check (campaign is null or char_length(campaign) <= 120),
  constraint analytics_referrer_length check (referrer_host is null or char_length(referrer_host) <= 253),
  constraint analytics_session_hash_length check (char_length(session_hash) between 32 and 128)
);

create index if not exists analytics_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_source_created_idx on public.analytics_events (source, created_at desc);

create table if not exists public.submission_attempts (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users(id) on delete set null,
  email_hash text not null,
  network_hash text,
  session_hash text,
  outcome text not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint submission_attempts_email_hash_length check (char_length(email_hash) between 32 and 128),
  constraint submission_attempts_network_hash_length check (network_hash is null or char_length(network_hash) between 32 and 128),
  constraint submission_attempts_session_hash_length check (session_hash is null or char_length(session_hash) between 16 and 128),
  constraint submission_attempts_outcome_allowed check (outcome in ('accepted', 'rejected', 'flagged', 'verification_failed')),
  constraint submission_attempts_reason_length check (reason is null or char_length(reason) <= 300)
);

create index if not exists submission_attempts_requester_created_idx on public.submission_attempts (requester_id, created_at desc);
create index if not exists submission_attempts_email_created_idx on public.submission_attempts (email_hash, created_at desc);
create index if not exists submission_attempts_network_created_idx on public.submission_attempts (network_hash, created_at desc) where network_hash is not null;

insert into public.site_settings (
  id,
  requests_open,
  spots_available,
  cooldown_minutes,
  per_person_daily_cap,
  auto_decrement_on_accept,
  public_activity_enabled
)
values ('global', false, 0, 10, 3, true, true)
on conflict (id) do update set
  requests_open = excluded.requests_open,
  spots_available = excluded.spots_available,
  cooldown_minutes = excluded.cooldown_minutes,
  per_person_daily_cap = excluded.per_person_daily_cap,
  auto_decrement_on_accept = excluded.auto_decrement_on_accept,
  public_activity_enabled = excluded.public_activity_enabled;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

create trigger requests_set_updated_at
before update on public.requests
for each row execute function public.set_updated_at();

create trigger public_request_activity_set_updated_at
before update on public.public_request_activity
for each row execute function public.set_updated_at();
