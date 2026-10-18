-- Public request activity is opt-in per request. Existing rows are disabled during this
-- pre-launch migration so nothing becomes public without a deliberate owner action.
alter table public.requests alter column public_activity_enabled set default false;
update public.requests set public_activity_enabled = false where public_activity_enabled = true;
delete from public.public_request_activity;

drop policy if exists public_request_activity_read on public.public_request_activity;
create policy public_request_activity_read
on public.public_request_activity for select
to anon, authenticated
using (
  exists (
    select 1 from public.site_settings s
    where s.id = 'global' and s.public_activity_enabled = true
  )
);

create table if not exists public.public_showcase_items (
  request_public_id text primary key,
  title text not null,
  description text not null default '',
  media_type text not null,
  asset_url text,
  page_url text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint showcase_public_id_shape check (request_public_id ~ '^R[A-F0-9]{8}$'),
  constraint showcase_title_length check (char_length(title) between 1 and 120),
  constraint showcase_description_length check (char_length(description) <= 320),
  constraint showcase_media_type check (media_type in ('audio','video','image','website','other')),
  constraint showcase_asset_https check (asset_url is null or asset_url ~ '^https://'),
  constraint showcase_page_https check (page_url is null or page_url ~ '^https://')
);

alter table public.public_showcase_items enable row level security;
revoke all on table public.public_showcase_items from anon, authenticated;
grant select on table public.public_showcase_items to anon, authenticated;

drop policy if exists public_showcase_items_read on public.public_showcase_items;
create policy public_showcase_items_read
on public.public_showcase_items for select
to anon, authenticated
using (true);

create trigger public_showcase_items_set_updated_at
before update on public.public_showcase_items
for each row execute function public.set_updated_at();

create or replace function public.sync_public_activity_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.public_activity_enabled = false then
    delete from public.public_request_activity where public_id = new.public_id;
  elsif exists (select 1 from public.public_request_activity where public_id = new.public_id) then
    update public.public_request_activity
    set request_type = new.request_type,
        public_status = new.status,
        created_date = new.created_at::date,
        updated_at = now()
    where public_id = new.public_id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_public_activity_status_trigger on public.requests;
create trigger sync_public_activity_status_trigger
after update of status, public_activity_enabled on public.requests
for each row execute function public.sync_public_activity_status();

create or replace function public.set_request_publication(
  p_request_id uuid,
  p_activity_enabled boolean,
  p_safe_title text,
  p_showcase_published boolean,
  p_showcase_title text,
  p_showcase_description text,
  p_showcase_media_type text,
  p_asset_url text,
  p_page_url text
)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests;
begin
  select * into v_request from public.requests where id = p_request_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'request_not_found'; end if;

  if p_safe_title is not null and char_length(p_safe_title) > 120 then
    raise exception using errcode = 'P0001', message = 'safe_title_too_long';
  end if;

  update public.requests set public_activity_enabled = p_activity_enabled where id = p_request_id returning * into v_request;

  if p_activity_enabled then
    insert into public.public_request_activity (public_id, request_type, public_status, created_date, safe_title, updated_at)
    values (v_request.public_id, v_request.request_type, v_request.status, v_request.created_at::date, p_safe_title, now())
    on conflict (public_id) do update set
      request_type = excluded.request_type,
      public_status = excluded.public_status,
      created_date = excluded.created_date,
      safe_title = excluded.safe_title,
      updated_at = now();
  else
    delete from public.public_request_activity where public_id = v_request.public_id;
  end if;

  if p_showcase_published then
    if p_showcase_title is null or char_length(trim(p_showcase_title)) = 0 then
      raise exception using errcode = 'P0001', message = 'showcase_title_required';
    end if;
    if p_showcase_media_type not in ('audio','video','image','website','other') then
      raise exception using errcode = 'P0001', message = 'invalid_showcase_media_type';
    end if;
    if p_asset_url is not null and p_asset_url !~ '^https://' then raise exception using errcode = 'P0001', message = 'asset_url_must_be_https'; end if;
    if p_page_url is not null and p_page_url !~ '^https://' then raise exception using errcode = 'P0001', message = 'page_url_must_be_https'; end if;

    insert into public.public_showcase_items (request_public_id, title, description, media_type, asset_url, page_url, published_at, updated_at)
    values (v_request.public_id, trim(p_showcase_title), coalesce(p_showcase_description,''), p_showcase_media_type, p_asset_url, p_page_url, now(), now())
    on conflict (request_public_id) do update set
      title = excluded.title,
      description = excluded.description,
      media_type = excluded.media_type,
      asset_url = excluded.asset_url,
      page_url = excluded.page_url,
      updated_at = now();
  else
    delete from public.public_showcase_items where request_public_id = v_request.public_id;
  end if;

  return v_request;
end;
$$;

revoke all on function public.set_request_publication(uuid, boolean, text, boolean, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.set_request_publication(uuid, boolean, text, boolean, text, text, text, text, text) to service_role;
