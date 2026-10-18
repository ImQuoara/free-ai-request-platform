insert into public.site_settings (
  id,
  requests_open,
  spots_available,
  reopens_at,
  cooldown_minutes,
  per_person_daily_cap,
  auto_decrement_on_accept,
  public_activity_enabled
)
values ('global', false, 0, null, 10, 3, true, true)
on conflict (id) do update set
  requests_open = excluded.requests_open,
  spots_available = excluded.spots_available,
  reopens_at = excluded.reopens_at,
  cooldown_minutes = excluded.cooldown_minutes,
  per_person_daily_cap = excluded.per_person_daily_cap,
  auto_decrement_on_accept = excluded.auto_decrement_on_accept,
  public_activity_enabled = excluded.public_activity_enabled;
