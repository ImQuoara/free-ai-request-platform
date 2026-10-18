# Secure Deployment Runbook

This runbook prepares the approved architecture: **private GitHub repository → Netlify → Supabase**, with Cloudflare Turnstile protecting request intake. It does **not** authorize creating accounts/projects, changing DNS, enabling paid services, publishing, or opening request intake.

## Current execution status

The application source, migrations, owner dashboard, private requester portal, anti-spam controls, crawler controls, analytics, and deployment configuration are implemented on the local feature branch.

A full dependency-backed verification could not run in the current sandbox because the npm registry is unreachable and the Supabase CLI/Postgres runtime is unavailable. Before any preview or production deployment, complete the network-enabled quality gate below. Do not treat the current local static/runtime checks as a substitute.

## 1. Required runtime configuration

Store secrets in Netlify environment variables, never in Git, `netlify.toml`, client code, screenshots, or documentation containing real values.

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Supabase publishable browser key. RLS remains the security boundary. |
| `SUPABASE_SECRET_KEY` | **Secret / server only** | Privileged owner/server operations. Never expose to the browser. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Cloudflare Turnstile site key. |
| `TURNSTILE_SECRET_KEY` | **Secret / server only** | Siteverify secret key. |
| `TURNSTILE_ALLOWED_HOSTNAMES` | Server only | Comma-separated exact hostnames accepted from Siteverify, with no scheme, port, path, or wildcard. Example local value: `localhost`. |
| `OWNER_EMAIL` | **Private / server only** | Exact verified Supabase email allowed to use `/admin`. |
| `ANALYTICS_HASH_SECRET` | **Secret / server only** | High-entropy HMAC secret used for rotating private analytics/abuse hashes. |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical site origin. Production must be the final HTTPS origin. |

Generate `ANALYTICS_HASH_SECRET` with a cryptographically secure generator in a trusted environment. Do not reuse a password, API key, or Turnstile/Supabase secret.

### Environment separation

Use different values for local/test, deploy preview, and production where practical. In particular:

- Use Cloudflare's Turnstile **test keys** for automated/local testing.
- Use production Turnstile keys only in production.
- `TURNSTILE_ALLOWED_HOSTNAMES` must match the exact hostname returned by Siteverify for that environment.
- A preview whose hostname is not in `TURNSTILE_ALLOWED_HOSTNAMES` will intentionally fail closed at request submission.
- Keep production Supabase secrets out of disposable preview environments unless a preview explicitly needs production data, which this project should avoid.

## 2. Network-enabled preflight — mandatory before external deployment

The sandbox could not download npm dependencies, so there is intentionally no trusted lockfile yet. In a network-enabled development environment:

```bash
npm install
```

Review the generated `package-lock.json`, then run:

```bash
npm run typecheck
npm run test:unit
npm run build
```

For database/integration verification, install/use the Supabase CLI in a trusted environment and run the migrations against a local disposable Supabase stack, then:

```bash
supabase test db
```

Run Playwright against the disposable/local stack using Turnstile test keys and disposable requester/owner identities:

```bash
npm run test:e2e
```

**Launch gate:** all commands above must exit successfully. Commit the reviewed `package-lock.json` before connecting the repository to Netlify so dependency resolution is reproducible.

## 3. Supabase setup — owner approval required

Do not create or select a production Supabase project until the owner approves that external action.

After approval:

1. Create/select the production project.
2. Apply migrations in `supabase/migrations/` in numeric order.
3. Confirm RLS is enabled on all private tables and that public reads are limited to the safe projection/settings/showcase tables intended by the migrations.
4. Configure passwordless email auth.
5. In Supabase Auth → Bot and Abuse Protection, enable CAPTCHA with **Cloudflare Turnstile** and configure the same approved production Turnstile secret. The email magic-link gate passes a Turnstile `captchaToken`; this Supabase setting is required so direct Auth API calls are also protected.
6. Set **Site URL** to the exact production origin, for example `https://example.com`.
7. Add the exact production callback URL to the Auth redirect allow list: `https://example.com/auth/callback`.
8. For local development, allow `http://localhost:3000/**`.
9. If an owner-approved Netlify preview is needed, Supabase supports a preview pattern such as `https://**--YOUR-SITE.netlify.app/**`; use wildcard redirects only for preview/local workflows, not as the production canonical redirect.
10. Verify a non-owner authenticated user cannot read another request, messages, owner notes, notifications, analytics, or admin-only records.
11. Verify the exact `OWNER_EMAIL` account can access owner functions only after its email is verified.

### Production email delivery

Supabase's default mail path may not be appropriate for sustained production sign-in volume/reliability. Do not add a paid SMTP/email provider silently. If production mail needs upgrading, present the provider/cost/limits to the owner for approval first.

## 4. Turnstile setup — owner approval required

Do not create production Turnstile credentials until approved.

After approval:

1. Create a Managed Turnstile widget.
2. Add only the production hostname(s) that should run the widget. Cloudflare hostname entries are hostnames only — no `https://`, ports, paths, or `*` wildcards.
3. Put the public site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
4. Put the secret in `TURNSTILE_SECRET_KEY`.
5. Put the exact expected Siteverify hostnames in `TURNSTILE_ALLOWED_HOSTNAMES`.
6. The custom request form binds challenges to `request-submit` and rejects a successful token whose returned action or hostname does not match. The passwordless email gate uses a separate `auth-email` action and sends its token to Supabase Auth CAPTCHA protection.
7. Verify used/expired tokens fail and that both request submission and passwordless email delivery obtain fresh tokens after attempts.

For local/automated testing, use Cloudflare test keys rather than authorizing `localhost` on the production widget.

## 5. Private GitHub repository — owner approval required

After approval:

1. Create/select a **private** repository.
2. Push the reviewed feature history only after the network-enabled quality gate passes.
3. Verify `.env*` remains ignored except `.env.example`.
4. Verify no Supabase secret key, Turnstile secret, analytics HMAC secret, real requester data, or production `.env` file is present in Git history.
5. Keep production branch protection/review settings appropriate to the owner's workflow.

## 6. Netlify site — owner approval required

After approval:

1. Import the approved private GitHub repository into Netlify.
2. Use Node 22 as declared in `netlify.toml`.
3. Keep the build command `npm run build`.
4. Add sensitive values through **Project configuration → Environment variables**, not `netlify.toml`.
5. Scope environment values intentionally by deploy context. Production and deploy-preview values should not be assumed identical.
6. Confirm the two code-based rate-limit rules load successfully in Netlify logs: strict request-intake limiting and the shared interactive endpoint limiter.
7. Verify SSR/private responses contain the security/no-cache/noindex headers emitted by Next.js; do not rely only on Netlify static header rules.
8. Keep request intake closed and spots at zero during verification.

### Preview rule

A Netlify deploy preview is still an externally reachable deployment. Do not create one without separate owner approval. If approved, use a test/disposable Supabase environment where possible and Turnstile test keys with the exact preview hostname configured server-side.

## 7. Domain / GoDaddy DNS — owner approval required

Do not change DNS until the owner approves the final production Netlify site and domain mapping.

After approval:

1. Add the custom domain in Netlify first.
2. Use the exact DNS records Netlify provides for that site/domain.
3. Change only the necessary GoDaddy DNS records.
4. Confirm HTTPS is active before treating the custom domain as canonical.
5. Set `NEXT_PUBLIC_SITE_URL`, Supabase Site URL/redirects, Turnstile hostname management, and `TURNSTILE_ALLOWED_HOSTNAMES` to the final hostname set.
6. Re-run authentication, request, owner, privacy, crawler, and header checks on the custom domain.

The current HSTS policy intentionally does **not** use `includeSubDomains` or preload. Do not broaden HSTS until every relevant subdomain is known to be HTTPS-safe.

## 8. Final production verification

Before opening intake, verify from a clean browser session:

- Public visitor can see only approved gallery/safe activity fields.
- Anonymous visitor cannot read private request/message/admin data.
- Requester can read only their own projects and one-to-one messages.
- Request form requires verified identity, required consents, and a valid Turnstile token.
- Ten-minute/default cooldown and configured daily cap are enforced server/database-side.
- Owner can change open/closed state, spot count, reopen time, cooldown, and daily cap.
- Owner notification badge updates for new requests/replies/important states.
- Accepting a request consumes a spot only through the atomic database transition and never drives spots below zero.
- Publication requires separate explicit owner action and exposes only safe fields.
- Perplexity/known AI crawler identities receive the deny behavior while ordinary browsers remain functional.
- Private routes/API responses are `no-store` and `noindex` where intended.
- No browser-delivered JavaScript contains server secrets or private requester records.
- Request intake is still closed until the owner explicitly chooses the initial spot count and opens it.

## Owner-gated production actions

Each item below requires explicit approval; none is implied by approval of the code or this runbook:

1. Create/select the private GitHub repository.
2. Create/select the Supabase production project.
3. Create/select the Netlify production site.
4. Configure production email delivery if needed.
5. Create/configure Turnstile production credentials.
6. Connect a domain or change DNS.
7. Enable any paid plan/add-on.
8. Publish a production deployment.
9. Open request intake and set initial available spots.
