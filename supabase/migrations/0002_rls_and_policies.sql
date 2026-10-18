alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.requests enable row level security;
alter table public.request_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.public_request_activity enable row level security;
alter table public.analytics_events enable row level security;
alter table public.submission_attempts enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.requests from anon, authenticated;
revoke all on table public.request_messages from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.analytics_events from anon, authenticated;
revoke all on table public.submission_attempts from anon, authenticated;
revoke all on table public.site_settings from anon, authenticated;
revoke all on table public.public_request_activity from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.requests to authenticated;
grant select, insert on table public.request_messages to authenticated;
grant select on table public.site_settings to anon, authenticated;
grant select on table public.public_request_activity to anon, authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists requests_select_own on public.requests;
create policy requests_select_own
on public.requests for select
to authenticated
using (requester_id = auth.uid());

drop policy if exists request_messages_select_own_request on public.request_messages;
create policy request_messages_select_own_request
on public.request_messages for select
to authenticated
using (
  exists (
    select 1 from public.requests r
    where r.id = request_messages.request_id
      and r.requester_id = auth.uid()
  )
);

drop policy if exists request_messages_insert_requester_reply on public.request_messages;
create policy request_messages_insert_requester_reply
on public.request_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and sender_role = 'requester'::public.message_role
  and exists (
    select 1 from public.requests r
    where r.id = request_messages.request_id
      and r.requester_id = auth.uid()
  )
);

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read
on public.site_settings for select
to anon, authenticated
using (id = 'global');

drop policy if exists public_request_activity_read on public.public_request_activity;
create policy public_request_activity_read
on public.public_request_activity for select
to anon, authenticated
using (true);

-- No client policies are intentionally created for notifications, analytics_events,
-- or submission_attempts. Owner/server operations use the server-only Supabase secret key.
