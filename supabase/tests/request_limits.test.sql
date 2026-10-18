begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
values ('33333333-3333-4333-8333-333333333333', 'limits@example.test', '', now(), now(), now(), 'authenticated', 'authenticated')
on conflict (id) do nothing;

update public.site_settings
set requests_open = true, spots_available = 2, cooldown_minutes = 10, per_person_daily_cap = 3,
    auto_decrement_on_accept = true
where id = 'global';

select lives_ok($$
  select public.submit_request_guarded(
    '33333333-3333-4333-8333-333333333333'::uuid,
    'Limit Tester', 'limits@example.test', null, 'Song'::public.request_type,
    'A sufficiently detailed first request for testing.', '[]'::jsonb,
    '{"review":true,"rights":true,"scope":true,"showcase":true,"credit":true}'::jsonb,
    '{}'::jsonb, '[]'::jsonb
  )
$$, 'first submission succeeds');

select throws_ok($$
  select public.submit_request_guarded(
    '33333333-3333-4333-8333-333333333333'::uuid,
    'Limit Tester', 'limits@example.test', null, 'Other'::public.request_type,
    'Second request inside the configured cooldown window.', '[]'::jsonb,
    '{"review":true,"rights":true,"scope":true,"showcase":true,"credit":true}'::jsonb,
    '{}'::jsonb, '[]'::jsonb
  )
$$, 'P0001', 'cooldown_active', 'second submission inside cooldown is rejected');

select like(
  pg_get_functiondef('public.submit_request_guarded(uuid,text,text,text,public.request_type,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure),
  '%pg_advisory_xact_lock%',
  'guarded RPC takes a transaction-scoped advisory lock'
);

update public.requests set created_at = now() - interval '11 minutes'
where requester_id = '33333333-3333-4333-8333-333333333333';
update public.site_settings set cooldown_minutes = 0, per_person_daily_cap = 1 where id = 'global';

select throws_ok($$
  select public.submit_request_guarded(
    '33333333-3333-4333-8333-333333333333'::uuid,
    'Limit Tester', 'limits@example.test', null, 'Other'::public.request_type,
    'Daily cap should block this additional request.', '[]'::jsonb,
    '{"review":true,"rights":true,"scope":true,"showcase":true,"credit":true}'::jsonb,
    '{}'::jsonb, '[]'::jsonb
  )
$$, 'P0001', 'daily_cap_reached', 'configured daily cap blocks additional request');

update public.site_settings set per_person_daily_cap = null where id = 'global';
select lives_ok($$
  select public.submit_request_guarded(
    '33333333-3333-4333-8333-333333333333'::uuid,
    'Limit Tester', 'limits@example.test', null, 'Other'::public.request_type,
    'Unlimited cap permits another request when cooldown is zero.', '[]'::jsonb,
    '{"review":true,"rights":true,"scope":true,"showcase":true,"credit":true}'::jsonb,
    '{}'::jsonb, '[]'::jsonb
  )
$$, 'null daily cap means unlimited');

update public.site_settings set requests_open = false where id = 'global';
select throws_ok($$
  select public.submit_request_guarded(
    '33333333-3333-4333-8333-333333333333'::uuid,
    'Limit Tester', 'limits@example.test', null, 'Song'::public.request_type,
    'Closed intake should reject even a valid request.', '[]'::jsonb,
    '{"review":true,"rights":true,"scope":true,"showcase":true,"credit":true}'::jsonb,
    '{}'::jsonb, '[]'::jsonb
  )
$$, 'P0001', 'requests_closed', 'closed intake rejects submissions');

update public.site_settings set requests_open = true, spots_available = 1, auto_decrement_on_accept = true where id = 'global';
select lives_ok($$
  select public.transition_request_status_atomic(
    (select id from public.requests where requester_id='33333333-3333-4333-8333-333333333333' order by created_at limit 1),
    'ACCEPTED'::public.request_status
  )
$$, 'acceptance transition succeeds with one spot');
select is((select spots_available from public.site_settings where id='global'), 0, 'acceptance decrements spot to zero');
select ok((select spots_available from public.site_settings where id='global') >= 0, 'spots never become negative');

select lives_ok($$
  select public.transition_request_status_atomic(
    (select id from public.requests where requester_id='33333333-3333-4333-8333-333333333333' order by created_at limit 1),
    'REJECTED'::public.request_status
  )
$$, 'accepted request can be rejected');
select lives_ok($$
  select public.transition_request_status_atomic(
    (select id from public.requests where requester_id='33333333-3333-4333-8333-333333333333' order by created_at limit 1),
    'NEW'::public.request_status
  )
$$, 'rejected request can be reopened');
update public.site_settings set spots_available = 1 where id = 'global';
select lives_ok($$
  select public.transition_request_status_atomic(
    (select id from public.requests where requester_id='33333333-3333-4333-8333-333333333333' order by created_at limit 1),
    'ACCEPTED'::public.request_status
  )
$$, 'previously accepted request can be accepted again');
select is((select spots_available from public.site_settings where id='global'), 1, 're-accepting the same request does not consume a second spot');

select * from finish();
rollback;
