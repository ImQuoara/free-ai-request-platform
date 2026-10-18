# Free AI Request Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure, mobile-first Netlify + Supabase platform where visitors can see harmless public request activity, verified requesters can submit and privately discuss projects, and the owner can control availability, choose projects, track visits, manage notifications, and selectively publish completed work.

**Architecture:** A Next.js 16 App Router application is deployed to Netlify from a private GitHub repository. Supabase provides Postgres, Auth, RLS, private data, and storage boundaries; Cloudflare Turnstile protects sensitive public actions. Public activity is projected into a separate safe table so raw request records are never publicly readable. Authenticated routes are dynamic and cookie-backed; privileged admin actions require both a valid Supabase session and an exact owner-email allowlist check.

**Tech Stack:** Next.js 16.x Active LTS, TypeScript, Tailwind CSS, Netlify Next.js adapter/runtime, Supabase Postgres/Auth/RLS/Storage, `@supabase/ssr`, `@supabase/supabase-js`, Zod, Cloudflare Turnstile, Vitest + Testing Library, Playwright, Supabase CLI/pgTAP where available.

**Spec:** `docs/superpowers/specs/2026-10-17-free-ai-request-platform-design.md`

## Global Constraints

- Host application on Netlify; store source in a private GitHub repository; use Supabase for persistent/private data.
- Production repository creation, production deployment, domain/DNS connection, paid-plan activation, production email provider connection, and public publishing remain owner-gated.
- Initial production-safe settings: `requests_open=false`, `spots_available=0`, `cooldown_minutes=10`, `per_person_daily_cap=3`, `auto_decrement_on_accept=true`, `public_activity_enabled=true`.
- Visitor file uploads are out of scope for v1.
- No public forum, comments, public profiles, public DMs, follower graph, payments, or cross-requester communication.
- Verified email is required before a request can be created; Discord remains optional.
- A request submission never implies acceptance. A spot is consumed only on owner acceptance when auto-decrement is enabled.
- Sensitive request data must never appear in public HTML, public JSON, static assets, metadata, public Supabase tables, or client logs.
- Any authenticated route that can refresh a session must be dynamic and must not use ISR/shared caching.
- Supabase secret credentials, Turnstile secret, analytics hashing secret, and owner allowlist remain server-only environment variables.
- Known AI crawler user agents, including Perplexity identities, are blocked where detectable; public content must still be treated as potentially copyable.
- Public gallery assets use only owner-approved public previews/links. Private source deliverables remain private.

## Review Focus

- **Concurrent request submissions:** two near-simultaneous requests from one verified user must not bypass the 10-minute cooldown or daily cap; Task 4 adds a transactional database guard test.
- **Cross-user data access:** requester A must never read or write requester B's request/messages even with guessed UUIDs; Task 2 adds pgTAP/RLS tests and Task 6 adds E2E authorization tests.
- **Admin spoofing:** a valid authenticated non-owner session must still receive `403` on every admin page/API; Task 3 tests exact owner authorization.
- **Public redaction:** no public feed/API response may contain name, email, Discord, description, reference links, private notes, or risk data; Task 8 tests the safe projection contract.
- **Auth/session caching:** authenticated responses must not be shared between visitors; Task 3 verifies dynamic route configuration and Task 10 verifies response/cache headers in E2E tests.

---

## File Structure

### Application shell and public experience

- `app/layout.tsx` — global metadata, typography, navigation shell.
- `app/page.tsx` — hero, availability, recent work, how-it-works, public activity preview.
- `app/request/page.tsx` — email-verification gate and authenticated request form.
- `app/auth/callback/route.ts` — Supabase PKCE/magic-link callback.
- `app/portal/page.tsx` — requester's own request list.
- `app/portal/[requestId]/page.tsx` — private project detail and message thread.
- `app/admin/page.tsx` — owner dashboard overview.
- `app/admin/requests/[requestId]/page.tsx` — owner project detail and private thread.
- `app/admin/settings/page.tsx` — availability/cooldown/daily-cap controls.
- `app/admin/analytics/page.tsx` — private visits/conversion/source analytics.
- `app/robots.ts` — crawler directives.
- `proxy.ts` — Next.js 16 Supabase session refresh and route protection coordination.

### API/route handlers

- `app/api/request/route.ts` — verified request creation.
- `app/api/messages/route.ts` — authorized private-thread message creation.
- `app/api/analytics/visit/route.ts` — privacy-conscious visit event intake.
- `app/api/admin/settings/route.ts` — owner-only settings update.
- `app/api/admin/requests/[requestId]/status/route.ts` — owner-only status transitions.
- `app/api/admin/requests/[requestId]/publication/route.ts` — owner-controlled public projection/gallery publication metadata.
- `app/api/admin/notifications/[notificationId]/route.ts` — read/unread update.

### Components

- `components/public/availability-badge.tsx`
- `components/public/work-gallery.tsx`
- `components/public/public-activity.tsx`
- `components/request/request-form.tsx`
- `components/request/request-rules.tsx`
- `components/portal/message-thread.tsx`
- `components/admin/dashboard-metrics.tsx`
- `components/admin/notification-bell.tsx`
- `components/admin/request-queue.tsx`
- `components/admin/settings-form.tsx`

### Domain/security libraries

- `lib/supabase/client.ts` — browser Supabase client.
- `lib/supabase/server.ts` — cookie-backed server client.
- `lib/supabase/service.ts` — server-only secret-key client.
- `lib/auth/guards.ts` — `requireUser()` and `requireOwner()`.
- `lib/security/turnstile.ts` — server-side Siteverify call.
- `lib/security/crawlers.ts` — known AI crawler detector/deny list.
- `lib/security/urls.ts` — reference URL validation/sanitization.
- `lib/security/analytics-id.ts` — privacy-conscious rotating visit/session identifiers.
- `lib/security/abuse.ts` — rotating hashed abuse signals and non-blocking risk flags.
- `lib/validation/request.ts` — request Zod schema.
- `lib/validation/message.ts` — message Zod schema.
- `lib/domain/settings.ts` — typed site-settings access.
- `lib/domain/requests.ts` — request DTOs/status rules.
- `lib/domain/notifications.ts` — owner notification queries/counts.
- `lib/domain/analytics.ts` — owner-only aggregate queries.
- `data/works.json` — simple owner-maintained public showcase content.

### Netlify/configuration

- `netlify.toml` — build/runtime/security headers and deploy configuration.
- `netlify/edge-functions/ai-crawler-block.ts` — deny known AI crawler user agents at the edge before page rendering.
- `.env.example` — names only, no secrets.
- `next.config.ts` — production configuration.

### Supabase

- `supabase/migrations/0001_core_schema.sql`
- `supabase/migrations/0002_rls_and_policies.sql`
- `supabase/migrations/0003_request_guard_rpc.sql`
- `supabase/migrations/0004_notifications_and_public_activity.sql`
- `supabase/migrations/0005_analytics.sql`
- `supabase/tests/rls_requests.test.sql`
- `supabase/tests/request_limits.test.sql`
- `supabase/seed.sql`

### Tests

- `tests/unit/auth-guards.test.ts`
- `tests/unit/request-validation.test.ts`
- `tests/unit/turnstile.test.ts`
- `tests/unit/public-redaction.test.ts`
- `tests/unit/settings.test.ts`
- `tests/unit/analytics-id.test.ts`
- `tests/integration/request-route.test.ts`
- `tests/integration/messages-route.test.ts`
- `tests/integration/admin-routes.test.ts`
- `tests/e2e/public-site.spec.ts`
- `tests/e2e/request-flow.spec.ts`
- `tests/e2e/privacy-boundaries.spec.ts`
- `tests/e2e/admin-dashboard.spec.ts`
- `tests/e2e/crawler-blocking.spec.ts`

---

### Task 1: Scaffold the private-ready Next.js application and test harness

**Files:**
- Create all base config files plus `app/layout.tsx`, `app/page.tsx`, `.env.example`, `netlify.toml`, `vitest.config.ts`, `playwright.config.ts`
- Test: `tests/e2e/public-site.spec.ts`

**Interfaces:**
- Produces a Next.js 16 App Router project with scripts `dev`, `build`, `test`, `test:unit`, `test:e2e`, `typecheck`.
- Produces environment contract: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `OWNER_EMAIL`, `ANALYTICS_HASH_SECRET`, `NEXT_PUBLIC_SITE_URL`.

- [ ] **Step 1: Write the failing smoke E2E test**

Assert `/` returns `200`, renders the offer headline, and exposes no private/admin links to anonymous visitors.

- [ ] **Step 2: Run the smoke test and confirm failure**

Run: `npm run test:e2e -- tests/e2e/public-site.spec.ts`
Expected: FAIL because the application is not scaffolded.

- [ ] **Step 3: Scaffold with the current stable Next.js 16.x template and install dependencies**

Use TypeScript, App Router, Tailwind, ESLint, `src` disabled, and npm lockfile. Add Supabase, Zod, Vitest/Testing Library, Playwright.

- [ ] **Step 4: Add Netlify build configuration and environment-name contract**

Do not add real credentials. `netlify.toml` must define the Next.js build and baseline security headers; no production deploy is performed.

- [ ] **Step 5: Implement the minimal public shell**

Create a mobile-first page with placeholder sections only: hero, availability, recent work, how it works, activity.

- [ ] **Step 6: Run quality gates**

Run: `npm run typecheck && npm run test:unit && npm run build && npm run test:e2e -- tests/e2e/public-site.spec.ts`
Expected: all PASS.

- [ ] **Step 7: Commit**

`git commit -m "chore: scaffold secure request platform"`

---

### Task 2: Build the Supabase schema, owner-safe defaults, and RLS boundary

**Files:**
- Create: `supabase/migrations/0001_core_schema.sql`
- Create: `supabase/migrations/0002_rls_and_policies.sql`
- Create: `supabase/seed.sql`
- Create: `supabase/tests/rls_requests.test.sql`
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/service.ts`

**Interfaces:**
- Produces tables: `profiles`, `requests`, `request_messages`, `site_settings`, `notifications`, `public_request_activity`, `analytics_events`, `submission_attempts`.
- `site_settings` is a singleton row keyed by `id='global'` with defaults from Global Constraints.
- `requests.status` enum: `NEW | ACCEPTED | REJECTED | IN_PROGRESS | COMPLETED | PUBLISHED`.
- Requesters access records through authenticated `auth.uid()` ownership only.
- Anonymous role can read only `site_settings` safe public fields and `public_request_activity`; it cannot read raw `requests` or `request_messages`.

- [ ] **Step 1: Write pgTAP tests for private boundaries**

Tests must assert anonymous cannot select raw requests/messages, requester A cannot select/update requester B, requester can select own request/messages, and public activity contains only safe columns.

- [ ] **Step 2: Run database tests and confirm failure**

Run with Supabase CLI: `supabase test db`
Expected: FAIL because schema/policies do not exist.

- [ ] **Step 3: Create core tables, enums, constraints, and indexes**

Use UUID primary keys, randomized `public_id`, timestamptz timestamps, JSONB only where structure is genuinely variable (`reference_links`, risk flags). Store no plaintext IP address.

- [ ] **Step 4: Add RLS policies**

Enable RLS on every private table. Public activity is a separate safe projection table with no sensitive columns.

- [ ] **Step 5: Seed the singleton settings row with safe launch defaults**

`requests_open=false`, `spots_available=0`, `cooldown_minutes=10`, `per_person_daily_cap=3`, `auto_decrement_on_accept=true`, `public_activity_enabled=true`.

- [ ] **Step 6: Implement Supabase clients**

Browser client uses publishable key; server client uses cookie-backed `@supabase/ssr`; secret-key client is isolated to server-only modules.

- [ ] **Step 7: Run database tests**

Run: `supabase test db`
Expected: PASS.

- [ ] **Step 8: Commit**

`git commit -m "feat: add private data model and rls"`

---

### Task 3: Implement verified sessions, exact owner authorization, and crawler/Turnstile primitives

**Files:**
- Create: `proxy.ts`
- Create: `app/auth/callback/route.ts`
- Create: `lib/auth/guards.ts`
- Create: `lib/security/turnstile.ts`
- Create: `lib/security/crawlers.ts`
- Create: `netlify/edge-functions/ai-crawler-block.ts`
- Create: `app/robots.ts`
- Test: `tests/unit/auth-guards.test.ts`, `tests/unit/turnstile.test.ts`, `tests/e2e/crawler-blocking.spec.ts`

**Interfaces:**
- `requireUser(): Promise<{ id: string; email: string }>` throws/redirects on unauthenticated access.
- `requireOwner(): Promise<{ id: string; email: string }>` requires authenticated email exactly matching normalized `OWNER_EMAIL`.
- `verifyTurnstile(token: string, remoteIp?: string): Promise<{ success: boolean; errorCodes: string[] }>` always calls Siteverify server-side.
- `isBlockedAiCrawler(userAgent: string | null): boolean` returns true for configured known AI crawler identities including Perplexity bot identities.

- [ ] **Step 1: Write failing owner-guard tests**

Assert unauthenticated is rejected, authenticated non-owner is `403`, case-normalized exact owner email is accepted, and no client-supplied role flag can grant owner access.

- [ ] **Step 2: Write failing Turnstile tests**

Assert missing token fails, failed Siteverify fails, success passes, and duplicate/expired error codes remain failures.

- [ ] **Step 3: Implement cookie session refresh using Next.js 16 `proxy.ts`**

Follow current Supabase SSR guidance; authenticated portal/admin routes must be dynamic and never cached as shared ISR output.

- [ ] **Step 4: Implement owner/user guards**

Owner authorization is server-side only and based on the verified Supabase email plus `OWNER_EMAIL` environment value.

- [ ] **Step 5: Implement Turnstile server verification**

Do not trust the browser widget result without Siteverify.

- [ ] **Step 6: Add AI crawler deny logic and robots directives**

Block known AI crawler identities at Netlify edge where detectable and disallow them in `robots.txt`; document this as deterrence, not a guarantee.

- [ ] **Step 7: Run unit/E2E tests**

Expected: PASS, including explicit Perplexity user-agent `403` at edge simulation/test layer.

- [ ] **Step 8: Commit**

`git commit -m "feat: add auth and anti-bot security primitives"`

---

### Task 4: Enforce transactional request cooldown, daily cap, and spot rules

**Files:**
- Create: `supabase/migrations/0003_request_guard_rpc.sql`
- Create: `lib/security/abuse.ts`
- Create: `supabase/tests/request_limits.test.sql`
- Create: `lib/domain/settings.ts`
- Create: `lib/domain/requests.ts`
- Test: `tests/unit/settings.test.ts`

**Interfaces:**
- SQL RPC `submit_request_guarded(p_requester_id uuid, p_name text, p_email text, p_discord text, p_type request_type, p_description text, p_reference_links jsonb, p_consents jsonb, p_source jsonb, p_risk_flags jsonb) returns requests`.
- RPC serializes submissions per requester, checks `requests_open`, 10-minute configurable cooldown, configurable per-person daily cap, and inserts exactly one request atomically.
- `submission_attempts` records only rotating/HMAC-derived abuse signals, requester id when known, outcome code, and timestamp; raw IP/user-agent fingerprints are not stored.
- `buildAbuseContext(input): AbuseContext` derives privacy-conscious hashes and risk flags for high-velocity multi-account behavior, repeated reference hashes, or repeated normalized content; these flags inform the owner and do not permanently ban based on one signal.
- Status transition helper `canTransitionRequest(from, to): boolean` enforces legal owner-controlled transitions.
- Acceptance decrement is transactional and never reduces `spots_available` below zero.

- [ ] **Step 1: Write failing DB tests for cooldown/daily cap/concurrency**

Include: first submission succeeds; second inside 10 minutes fails with remaining-seconds metadata; cap blocks after configured count; unlimited cap works; closed intake fails; simultaneous submissions cannot both pass.

- [ ] **Step 2: Run DB tests and confirm failure**

Run: `supabase test db`
Expected: FAIL.

- [ ] **Step 3: Implement guarded RPC with per-requester transaction lock**

Use a transaction-scoped advisory lock keyed to requester identity before checking recent submissions and daily count.

- [ ] **Step 4: Implement atomic acceptance/decrement function**

Create SQL function used by admin status API so accepting a request and decrementing a spot occur in one transaction when enabled.

- [ ] **Step 5: Add privacy-conscious abuse-attempt recording and flagging**

Hash network/session signals with a server secret and rotation bucket; never persist raw IP. Flag suspicious multi-account/high-similarity patterns for owner review rather than permanently banning on one signal.

- [ ] **Step 6: Add typed settings/status domain helpers**

No UI directly constructs status transitions or settings defaults.

- [ ] **Step 7: Run DB + unit tests**

Expected: PASS.

- [ ] **Step 8: Commit**

`git commit -m "feat: enforce request limits transactionally"`

---

### Task 5: Build the public site, gallery, availability, and verified request submission flow

**Files:**
- Modify: `app/page.tsx`
- Create: `app/request/page.tsx`
- Create: `app/api/request/route.ts`
- Create: `components/public/availability-badge.tsx`
- Create: `components/public/work-gallery.tsx`
- Create: `components/request/request-form.tsx`
- Create: `components/request/request-rules.tsx`
- Create: `data/works.json`
- Create: `lib/validation/request.ts`
- Create: `lib/security/urls.ts`
- Test: `tests/unit/request-validation.test.ts`, `tests/integration/request-route.test.ts`, `tests/e2e/request-flow.spec.ts`

**Interfaces:**
- Request page unauthenticated state sends Supabase passwordless email login/magic link; authenticated state renders the form.
- `POST /api/request` requires verified session + valid Turnstile token + valid request schema, then calls `submit_request_guarded`.
- Success response: `{ requestId: string; publicId: string; nextEligibleAt: string | null }`.
- Cooldown response: `429` with `{ code: 'COOLDOWN', retryAfterSeconds: number }`.
- Daily cap response: `429` with `{ code: 'DAILY_CAP', nextEligibleAt: string }`.

- [ ] **Step 1: Write failing request validation/route tests**

Assert valid types, bounded description length, sanitized HTTPS reference URLs, all required consent flags, verified session, Turnstile, cooldown mapping, and no direct spot decrement on submission.

- [ ] **Step 2: Implement request schema and URL sanitization**

Reject javascript/data/file schemes, excessive link counts, oversized payloads, and control-character abuse.

- [ ] **Step 3: Build passwordless verification gate**

The visitor must verify email before form submission. Preserve only non-sensitive draft fields locally until auth completes.

- [ ] **Step 4: Build the request form and exact warning copy**

Show the double-check warning, configurable cooldown/daily-cap copy, consent checkboxes, clear closed/reopen state, and remaining-cooldown state.

- [ ] **Step 5: Implement `POST /api/request`**

Order: session check → payload size/schema → honeypot → Turnstile verification → abuse-context derivation/attempt logging → guarded RPC with risk flags → safe response.

- [ ] **Step 6: Replace public placeholders with the polished public experience**

Use `works.json`; support safe image/video/audio/link previews without shipping private source files.

- [ ] **Step 7: Run unit/integration/E2E tests**

Expected: PASS on mobile and desktop viewport coverage.

- [ ] **Step 8: Commit**

`git commit -m "feat: add verified public request flow"`

---

### Task 6: Build the requester portal and private one-to-one message thread

**Files:**
- Create: `app/portal/page.tsx`
- Create: `app/portal/[requestId]/page.tsx`
- Create: `app/api/messages/route.ts`
- Create: `components/portal/message-thread.tsx`
- Create: `lib/validation/message.ts`
- Test: `tests/integration/messages-route.test.ts`, `tests/e2e/privacy-boundaries.spec.ts`

**Interfaces:**
- `POST /api/messages` input `{ requestId: string; message: string }`.
- Server derives sender from session; clients cannot choose `sender_role`.
- Requester may write only to a request they own; owner may write to any request after owner guard.
- No endpoint exists to enumerate other requesters or cross-user threads.

- [ ] **Step 1: Write failing authorization tests**

Assert requester A can read/write A, cannot read/write B, guessed UUID returns `404/403` without existence leak, anonymous cannot access portal, and non-owner cannot impersonate owner.

- [ ] **Step 2: Implement portal request list/detail queries under RLS**

Render status, submitted summary, owner replies, and approved delivery links only.

- [ ] **Step 3: Implement message creation route**

Validate message size/content, derive sender role server-side, insert under authenticated identity, and update read markers.

- [ ] **Step 4: Implement thread UI**

Clearly distinguish owner/requester messages; show unread owner-reply badge in requester's own portal without any cross-user data.

- [ ] **Step 5: Run integration/E2E privacy tests**

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat: add private requester portal and messaging"`

---

### Task 7: Build owner dashboard, project selection, notifications, and availability controls

**Files:**
- Create: `supabase/migrations/0004_notifications_and_public_activity.sql`
- Create: `app/admin/page.tsx`
- Create: `app/admin/requests/[requestId]/page.tsx`
- Create: `app/admin/settings/page.tsx`
- Create: `app/api/admin/settings/route.ts`
- Create: `app/api/admin/requests/[requestId]/status/route.ts`
- Create: `app/api/admin/notifications/[notificationId]/route.ts`
- Create: `components/admin/dashboard-metrics.tsx`
- Create: `components/admin/notification-bell.tsx`
- Create: `components/admin/request-queue.tsx`
- Create: `components/admin/settings-form.tsx`
- Create: `lib/domain/notifications.ts`
- Test: `tests/integration/admin-routes.test.ts`, `tests/e2e/admin-dashboard.spec.ts`

**Interfaces:**
- Every `/admin` server page/API starts with `requireOwner()`.
- Settings PATCH accepts only: `requestsOpen`, `spotsAvailable`, `reopensAt`, `cooldownMinutes`, `perPersonDailyCap`, `autoDecrementOnAccept`, `publicActivityEnabled`.
- Status POST accepts only legal target statuses and uses atomic acceptance/decrement RPC.
- Owner notification count returns unread total plus category counts.

- [ ] **Step 1: Write failing owner-route tests**

Assert anonymous `401`, authenticated non-owner `403`, owner succeeds; invalid spot/cooldown/cap values reject; status transition rules hold; spot decrement occurs only on acceptance when enabled.

- [ ] **Step 2: Add notification triggers**

Create owner notifications for new request, requester reply, suspicious/failed submission flag, accepted work needing action, and completed-unpublished state.

- [ ] **Step 3: Implement admin overview and notification bell**

Show unread badge and counts for new requests, replies, accepted, active, completed-unpublished, and abuse flags.

- [ ] **Step 4: Implement request queue and project detail**

Owner can inspect full private request, private notes, references, risk flags, thread, and status controls.

- [ ] **Step 5: Implement settings controls**

Changes must take effect immediately without redeploying. Include `reopens_at = null` support.

- [ ] **Step 6: Run tests**

Expected: PASS.

- [ ] **Step 7: Commit**

`git commit -m "feat: add owner project command center"`

---

### Task 8: Implement safe public activity and owner-controlled publication

**Files:**
- Modify: `supabase/migrations/0004_notifications_and_public_activity.sql`
- Create: `components/public/public-activity.tsx`
- Create: `app/api/admin/requests/[requestId]/publication/route.ts`
- Create: `tests/unit/public-redaction.test.ts`

**Interfaces:**
- Public projection columns only: `public_id`, `request_type`, `public_status`, `created_date`, optional owner-authored safe title.
- Publication API never copies raw request description/reference/contact fields into public output.
- Owner must explicitly enable public activity for a request and separately approve gallery publication metadata.

- [ ] **Step 1: Write the public redaction contract test**

Assert serialized public activity cannot contain keys/values from name, email, Discord, description, references, notes, raw UUID, risk flags, or private message text.

- [ ] **Step 2: Implement projection/update trigger or owner-only projection function**

Keep the public table physically separate from raw request rows.

- [ ] **Step 3: Build public activity component**

Display anonymous ID/type/date/safe status only; respect global and per-request visibility toggles.

- [ ] **Step 4: Implement owner publication endpoint**

Only owner-authored safe public fields and already-public asset URLs may be published.

- [ ] **Step 5: Run redaction/E2E tests**

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat: add privacy-safe public activity"`

---

### Task 9: Add private visit analytics and attribution dashboard

**Files:**
- Create: `supabase/migrations/0005_analytics.sql`
- Create: `app/api/analytics/visit/route.ts`
- Create: `app/admin/analytics/page.tsx`
- Create: `lib/security/analytics-id.ts`
- Create: `lib/domain/analytics.ts`
- Test: `tests/unit/analytics-id.test.ts`, `tests/e2e/admin-dashboard.spec.ts`

**Interfaces:**
- Public visit endpoint records page path, normalized source/campaign/referrer, timestamp, and a rotating pseudonymous visit/session identifier.
- Raw IP is not stored; any abuse/unique-visit hash uses `HMAC(secret, normalized_ip + rotation_bucket)` server-side and rotates.
- Analytics read functions are owner-only.

- [ ] **Step 1: Write failing privacy tests**

Assert analytics payload rejects arbitrary PII, raw IP never persists, source values are normalized, and session/visit hashes rotate as designed.

- [ ] **Step 2: Implement visit intake**

Bound event volume and payload size; ignore known crawler traffic where detectable.

- [ ] **Step 3: Implement aggregates**

Visits today, 7 days, total page views, unique-ish sessions, submissions, accepted requests, conversion rate, source breakdown, campaign breakdown, top work items.

- [ ] **Step 4: Build owner-only analytics page**

No public analytics endpoint returns private aggregate or raw event data.

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat: add private acquisition analytics"`

---

### Task 10: Harden HTTP behavior, rate limits, caching, and secret boundaries

**Files:**
- Modify: `netlify.toml`
- Modify: `netlify/edge-functions/ai-crawler-block.ts`
- Modify: `next.config.ts`
- Modify: sensitive route handlers as required
- Test: `tests/e2e/crawler-blocking.spec.ts`, `tests/e2e/privacy-boundaries.spec.ts`

**Interfaces:**
- Security headers include CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and frame restrictions.
- Authenticated/admin responses are non-cacheable/shared-cache safe.
- Netlify coarse rate limits protect high-risk paths; database limits remain authoritative for per-user request rules.

- [ ] **Step 1: Write failing header/cache tests**

Assert CSP exists, framing is denied, MIME sniffing is disabled, auth/admin responses are not publicly cacheable, and no secret env value appears in client bundles or HTML.

- [ ] **Step 2: Add Netlify coarse rate limiting for the highest-risk paths**

Use the free-plan-compatible code-based limits available at implementation time. Do not rely on Netlify rate limiting as the 10-minute identity cooldown; DB enforcement remains authoritative.

- [ ] **Step 3: Add final crawler blocking rules**

Block known Perplexity and other configured AI crawler user agents without blocking ordinary browsers/search crawlers the owner chooses to allow.

- [ ] **Step 4: Finalize restrictive headers/CSP**

Allow only the exact domains needed for Supabase, Turnstile, approved media embeds, and Netlify runtime.

- [ ] **Step 5: Run build/E2E/security checks**

Run: `npm run typecheck && npm run test:unit && npm run build && npm run test:e2e`
Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "security: harden production boundaries"`

---

### Task 11: Full-system verification and failure-path testing

**Files:**
- Extend all `tests/e2e/*.spec.ts`
- Add any missing fixtures/helpers under `tests/fixtures/`

**Interfaces:**
- Produces a verified pre-production build with documented pass/fail evidence.

- [ ] **Step 1: Test anonymous public path**

Verify gallery/activity/availability load; no private data/API is accessible.

- [ ] **Step 2: Test requester path**

Verify auth, first request, cooldown rejection with countdown, daily cap, own portal, private messaging, and inability to access another requester.

- [ ] **Step 3: Test owner path**

Verify notification counts, request selection, spot decrement, reopen time, cooldown/cap changes, replies, statuses, analytics, and publication controls.

- [ ] **Step 4: Test abuse/failure paths**

Invalid Turnstile, oversized payload, malformed URLs, bot user agents, repeated rapid posts, unauthenticated admin requests, service outage behavior, and closed-intake state.

- [ ] **Step 5: Test responsive/accessibility basics**

Keyboard navigation, labels, focus states, error announcements, mobile layouts, reduced motion, and color contrast.

- [ ] **Step 6: Run complete verification suite**

Run: `npm run typecheck && npm run test:unit && supabase test db && npm run build && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 7: Commit**

`git commit -m "test: verify secure request platform end to end"`

---

### Task 12: Prepare deployment artifacts and owner-gated launch checklist

**Files:**
- Create: `docs/deployment.md`
- Create: `docs/security-checklist.md`
- Create: `docs/content-update.md`
- Modify: `.env.example`

**Interfaces:**
- Produces exact instructions for private GitHub → Netlify → Supabase deployment without performing owner-gated production actions.
- Documents required secrets, redirect URLs, Supabase auth configuration, Netlify environment configuration, Turnstile domain configuration, and domain/DNS steps.

- [ ] **Step 1: Document required production configuration**

Include environment variables, Supabase allowed redirect URLs, Netlify site URL, Turnstile allowed hostnames, and owner email.

- [ ] **Step 2: Document gallery/content updates**

Adding a public work item remains a simple `data/works.json` edit + deploy; publishing requester work still requires owner approval in the dashboard.

- [ ] **Step 3: Document launch security checklist**

RLS enabled, Supabase secret key absent from client, Turnstile server verification live, owner-only admin verified, public redaction test passed, no source maps/private data leakage, crawler deny rules present, closed-by-default intake confirmed.

- [ ] **Step 4: Verify a local/preview build only**

Preview deployment may be created only if separately approved; production deployment/domain/DNS remain blocked pending owner approval.

- [ ] **Step 5: Commit**

`git commit -m "docs: add secure deployment runbook"`

---

## Final Pre-Production Gate

Before any production publish, obtain explicit owner approval for each external consequence that applies:

1. Create or select the private GitHub repository.
2. Create/select the Supabase production project.
3. Create/select the Netlify production site.
4. Configure production email delivery if Supabase's default mail path is insufficient for launch volume/reliability.
5. Configure Turnstile production site/secret keys.
6. Connect domain and change DNS.
7. Enable any paid plan or paid add-on.
8. Publish the production deployment.
9. Open request intake and set the initial number of available spots.

No item above is implied by approval of the implementation plan alone.
