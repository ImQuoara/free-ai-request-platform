alter table public.requests
  add column if not exists delivery_links jsonb not null default '[]'::jsonb;

alter table public.requests
  drop constraint if exists requests_delivery_links_array;

alter table public.requests
  add constraint requests_delivery_links_array
  check (jsonb_typeof(delivery_links) = 'array' and jsonb_array_length(delivery_links) <= 20);

comment on column public.requests.delivery_links is
  'Owner-managed approved delivery links. Private requesters can read only their own request through RLS.';
