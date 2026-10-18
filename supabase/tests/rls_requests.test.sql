begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

-- Fixtures are inserted before switching into client roles.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'a@example.test', '', now(), now(), now(), 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.test', '', now(), now(), now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.requests (id, public_id, requester_id, requester_email, name, request_type, description,
  review_confirmed, rights_confirmed, scope_confirmed, showcase_consent, credit_consent)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'REQA1B2C', '11111111-1111-4111-8111-111111111111', 'a@example.test', 'Requester A', 'Song', 'Private A', true, true, true, true, true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'REQB1B2C', '22222222-2222-4222-8222-222222222222', 'b@example.test', 'Requester B', 'Other', 'Private B', true, true, true, true, true);

insert into public.request_messages (request_id, sender_id, sender_role, body)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'requester', 'A private message');

insert into public.public_request_activity (public_id, request_type, public_status, created_date)
values ('REQA1B2C', 'Song', 'NEW', current_date)
on conflict (public_id) do update set public_status = excluded.public_status;

set local role anon;
select is((select count(*)::int from public.requests), 0, 'anonymous cannot read raw requests');
select is((select count(*)::int from public.request_messages), 0, 'anonymous cannot read messages');
select ok((select count(*) from public.public_request_activity) >= 1, 'anonymous can read safe public activity');
select columns_are('public', 'public_request_activity', array['public_id','request_type','public_status','created_date','safe_title','updated_at'], 'public activity contains safe columns only');

reset role;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
set local role authenticated;
select is((select count(*)::int from public.requests), 1, 'requester A sees only own request');
select is((select count(*)::int from public.request_messages), 1, 'requester A sees own request messages');
select is((select count(*)::int from public.requests where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 0, 'requester A cannot read requester B request');
update public.requests set description = 'tampered' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select is((select count(*)::int from public.requests where description = 'tampered'), 0, 'requester A cannot update requester B request');

select * from finish();
rollback;
