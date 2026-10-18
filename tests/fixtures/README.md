# E2E identity fixtures

Requester/owner authenticated-path tests require a running Supabase test project or local Supabase stack plus these server-only environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `OWNER_EMAIL`

The suite must create confirmed disposable auth users with the Supabase admin API, obtain passwordless links/sessions, and delete them after the run. Do not hard-code production emails, tokens, service keys, requester UUIDs, or real contact data in fixtures.

Until that runtime is available, authenticated flow verification remains blocked and must not be reported as passing.
