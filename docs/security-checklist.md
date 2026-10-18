# Security & Privacy Launch Checklist

Use this as a **no-go gate**, not a marketing checklist. A checked source-level control is not equivalent to a production verification.

## Current local evidence

### Source/static controls implemented

- [x] Private request/message/owner/analytics tables are separate from public projections.
- [x] RLS policies are defined for requester-owned data and deny public access to private records.
- [x] Privileged Supabase secret usage is server-only by design; client files are statically scanned for server-secret names.
- [x] Owner routes use exact verified owner identity checks before privileged operations.
- [x] Request submission uses database-side transactional cooldown/daily-cap enforcement.
- [x] Spot decrement occurs only during an atomic acceptance transition, not on submission.
- [x] Turnstile Siteverify for request submission is server-side, fail-closed, hostname-bound, action-bound, and single-use tokens are reset client-side after attempts.
- [x] Passwordless email delivery requires a Turnstile `captchaToken` in application code; production launch additionally requires Supabase Auth CAPTCHA protection to be enabled with Turnstile.
- [x] Honeypot, input/body limits, URL sanitization, rate-limit layers, and hashed abuse signals are present.
- [x] Raw IP addresses are not persisted by analytics/abuse logging.
- [x] Public request activity is opt-in, physically safe-field-only, and globally disableable.
- [x] Gallery publication is a separate owner action from request/activity visibility.
- [x] Private routes use no-store/noindex controls.
- [x] Runtime crawler controls include Perplexity and other named AI agents; `robots.txt` provides an additional advisory deny layer.
- [x] CSP, HSTS, nosniff, frame denial, referrer policy, permissions policy, and cross-origin opener policy are configured.
- [x] Production browser source maps are not opted in; Next.js production browser source maps are disabled by default.
- [x] Request intake defaults to closed with zero spots in the database migration.

### Still unverified in this sandbox — must be completed before launch

- [ ] `npm install` succeeds and produces a reviewed lockfile.
- [ ] `npm run typecheck` passes with installed dependencies.
- [ ] `npm run test:unit` passes.
- [ ] Supabase migrations apply cleanly to a disposable/local database.
- [ ] `supabase test db` passes, including RLS and concurrency tests.
- [ ] `npm run build` completes successfully.
- [ ] `npm run test:e2e` passes against disposable requester/owner identities.
- [ ] Public production bundle/source inspection confirms no secret/private data leakage.
- [ ] Production `.map` assets are not publicly served.
- [ ] Netlify recognizes both code-based rate-limit rules without deployment warnings.
- [ ] Real Turnstile production token returns the expected production hostname and `request-submit` action.
- [ ] Supabase Auth CAPTCHA protection is enabled with Turnstile and passwordless-email requests without a valid CAPTCHA token are rejected.
- [ ] Reused Turnstile token is rejected.
- [ ] Supabase redirect allow list sends passwordless login back only to approved origins.
- [ ] Anonymous user cannot query private tables through Supabase REST/API.
- [ ] Requester A cannot query Requester B's request/messages even with a known UUID.
- [ ] Non-owner authenticated user cannot reach `/admin` or owner API behavior.
- [ ] Owner can use dashboard settings/status/message/publication controls successfully.
- [ ] Two simultaneous accept attempts cannot over-consume the final available spot.
- [ ] Cooldown/daily cap remain effective across browser restarts/sessions for the same verified user.
- [ ] Public activity never contains name, email, Discord, prompt, references, private messages, delivery links, risk flags, or owner notes.
- [ ] AI crawler deny behavior is observed on the deployed runtime for Perplexity identities.
- [ ] Ordinary browser and intended search traffic still render the public site.

## Secret boundary audit

Before any external push/deploy, search the repository and Git history for:

- real `SUPABASE_SECRET_KEY`
- real `TURNSTILE_SECRET_KEY`
- real `ANALYTICS_HASH_SECRET`
- production `.env` files
- requester emails/Discord handles/prompts/reference links copied from real users

Only `NEXT_PUBLIC_*` values may be intentionally browser-visible. A key being browser-visible never replaces RLS/authorization.

## Known security tradeoffs / deliberate decisions

- **Public output is copyable in principle.** Crawler controls reduce automated access, but anything intentionally rendered publicly can eventually be copied. Sensitive data therefore never belongs in the public response.
- **CSP currently permits inline scripts/styles required by the present Next.js setup.** This is materially stronger than no CSP but not the maximum CSP posture. A nonce-based CSP can be considered after the first dependency-backed build is stable; do not weaken the current policy to fix unrelated UI issues.
- **HSTS is intentionally conservative.** `includeSubDomains` and preload are not enabled until the complete domain/subdomain inventory is known.
- **Network/session hashes are abuse signals, not identity proof.** Shared networks/VPNs must not automatically cause permanent bans; owner review remains the escalation path.
- **AI user-agent blocking is defense-in-depth, not an impossibility guarantee.** A sophisticated browser-like scraper can misrepresent itself; private information remains protected by authentication/RLS rather than crawler identity.

## Launch-stop conditions

Do **not** publish/open intake if any of these is true:

- full quality gate is red or not run;
- RLS/privacy tests have not run against a real disposable database;
- production secrets appear in browser bundles or Git;
- owner authorization is not verified;
- Turnstile production Siteverify hostname/action checks fail;
- request acceptance can decrement spots below zero;
- private data appears in public activity/gallery/analytics;
- request intake is accidentally open before the owner sets capacity;
- a paid service or DNS change is required but not explicitly approved.
