# Free AI Request Platform — Design Specification

Date: 2026-10-17
Owner: Quoara
Status: DESIGN APPROVED — HOSTING LOCKED TO NETLIFY + SUPABASE + PRIVATE GITHUB

## 1. Product Goal

Build a secure, mobile-first public website that turns free AI work into audience growth, qualified requests, and owned contacts while protecting requesters from spam, poaching, scraping, bots, and other users.

The platform should feel active and social enough to create trust and momentum, but it is not a forum or public community. Public content is intentionally low-sensitivity. Valuable request data, conversations, contact information, references, and operational analytics remain private.

## 2. Core Product Model

The product has three surfaces:

1. Public site
2. Private requester portal
3. Private owner/admin dashboard

Visitors may submit requests and see limited public request activity. Only the owner and the specific requester can access the full request and private conversation.

## 3. Public Site

### 3.1 Hero

Primary message communicates:

- Free high-quality AI songs, landing pages, short-form assets, and related work
- Limited owner-controlled availability
- Clear CTA to browse recent work
- Clear CTA to claim a free spot

Primary CTAs:

- See Recent Work
- Claim a Free Spot

### 3.2 Availability State

Availability is controlled live by the owner.

The site can display:

- `3 spots available`
- `1 spot available`
- `Requests closed`
- `Reopens Oct 18 at 10:00 AM`

Owner may set:

- requests open / closed
- visible number of free spots
- optional reopen date/time
- no reopen date if unknown
- per-person daily submission maximum
- cooldown duration, default 10 minutes

Submitting a request does not automatically consume a spot. A spot is consumed only when the owner accepts the request.

### 3.3 Recent Work Gallery

Gallery is maintained through a simple static content source such as `works.json` or Markdown.

Supported card types:

- song/audio
- short video
- image/design asset
- landing page / website preview
- other approved public work

Each card may include:

- title
- safe public description
- date
- thumbnail / preview
- audio player when relevant
- public view/download link when owner chooses
- owner credit/link

Only owner-approved finished work is published.

### 3.4 Public Request Activity

Public request activity may be visible to create trust and momentum, but only with harmless metadata.

Example:

- `Song Request • Oct 17 • Pending`
- `Landing Page Request • Oct 17 • Accepted`

Public request entries must not expose:

- requester name unless explicitly approved for publication
- email
- Discord handle
- detailed prompt
- private references
- attachments
- private conversation
- internal moderation flags
- owner notes
- sensitive metadata

Anonymous public request IDs may be used, such as `Request R8K4`.

The owner can choose whether a request appears in the public activity feed at all.

## 4. Request Flow

### 4.1 Request Form

Fields:

- name or preferred display name
- verified email required
- optional Discord
- request type: Song / Landing Page / Other
- short request description
- optional reference links
- consent and rights confirmations

No visitor file uploads in v1.

### 4.2 Required Confirmations

The requester must confirm:

- they reviewed the request before submitting
- supplied references are theirs to use or they have permission to use them
- submission does not guarantee acceptance
- scope is fixed
- unlimited revisions are not included
- result may be publicly showcased if accepted under the agreed public-showcase terms
- owner credit/link may appear on public showcase material

### 4.3 Submission Warning

Before submit:

> Please double-check your request before sending. For spam protection, you can submit one request every 10 minutes. Make sure your description, references, and contact details are correct before submitting.

### 4.4 Cooldown

Default:

- one request every 10 minutes per verified email

Owner can change the cooldown from the admin dashboard.

Cooldown is enforced server-side.

If a user submits too soon, the site shows the remaining cooldown time.

Example:

> You’ve already submitted a request recently. You can submit another request in 7 minutes 24 seconds.

### 4.5 Daily Cap

Owner can set a per-person daily submission maximum.

Examples:

- 1/day
- 3/day
- 5/day
- unlimited

This value is configurable without redeployment.

### 4.6 Abuse Detection

Primary enforcement identity:

- verified email

Secondary signals may include:

- IP reputation / coarse IP checks
- session identifier
- browser/device abuse signals where privacy-safe and legally appropriate
- repeated contact information
- repeated reference URLs
- high similarity between submissions
- excessive failed verification attempts

Secondary signals should flag suspicious behavior rather than automatically issue permanent bans based on a single signal.

## 5. Requester Portal

A requester receives secure access to their own request through verified email/passwordless access.

They can:

- view their request
- see current status
- read owner replies
- send replies to the owner
- view approved delivered files/links for that request
- see whether the request has been accepted, rejected, in progress, completed, or published

They cannot:

- browse other requesters
- search other requests
- contact another requester
- comment on public requests
- DM other users
- view private analytics
- view owner notes

No general user directory exists.

## 6. Private Conversation Model

Each request has one private conversation thread.

Participants:

- owner
- that request's verified requester

Only the owner can send official project-owner responses.

The requester can reply only inside their own request thread.

No cross-user messaging is supported.

## 7. Owner/Admin Dashboard

Private `/admin` surface.

### 7.1 Dashboard Overview

Owner sees:

- total visits
- visits today
- visits last 7 days
- total requests
- request conversion rate
- traffic sources
- campaign / UTM attribution
- new request count
- unread requester reply count
- accepted project count
- active/in-progress project count
- completed project count
- unpublished completed project count

These analytics are private and never exposed publicly unless owner explicitly chooses otherwise.

### 7.2 Notification Center

Visible notification indicator, e.g. `7` unread.

Notification categories:

- new request
- requester reply
- accepted project requiring work
- completed project awaiting publication
- suspicious submission / abuse flag
- failed delivery or access issue

Notifications can be marked read/unread.

### 7.3 Request Management

Statuses:

- NEW
- ACCEPTED
- REJECTED
- IN_PROGRESS
- COMPLETED
- PUBLISHED

Owner can:

- open request details
- reply privately
- accept
- reject
- mark in progress
- mark completed
- publish approved result to gallery
- keep completed work private
- add private notes
- see abuse/risk flags

Accepting a request can decrement the available spot count if owner enables that behavior.

### 7.4 Availability Controls

Owner can change without redeploying:

- requests open/closed
- number of spots available
- optional reopen date/time
- cooldown duration
- per-person daily request cap
- whether accepted requests decrement spots automatically
- whether public activity feed is enabled

## 8. Data Model

Recommended backend: Supabase.

### 8.1 `requests`

Fields include:

- id: UUID
- public_id: randomized non-sequential public identifier
- requester_id / verified email identity
- name
- email
- discord_optional
- type
- description
- reference_links
- consent flags
- status
- public_feed_enabled
- accepted_at
- completed_at
- published_at
- created_at
- updated_at
- source / UTM / referrer fields
- moderation/risk score or flags

### 8.2 `request_messages`

- id
- request_id
- sender_role: owner/requester
- message
- created_at
- read_at

RLS must ensure only owner and the correct requester can read/write the relevant thread.

### 8.3 `site_settings`

- requests_open
- spots_available
- reopens_at
- cooldown_minutes
- per_person_daily_cap
- auto_decrement_on_accept
- public_activity_enabled

### 8.4 `notifications`

- id
- type
- request_id nullable
- title
- body/summary
- read_at
- created_at

### 8.5 `analytics_events`

Private event data such as:

- page view
- request form opened
- request submitted
- request accepted
- source / campaign
- coarse referrer
- timestamp

Analytics should avoid collecting unnecessary personal data.

## 9. Security Architecture

### 9.1 Public vs Private Principle

Anything rendered publicly must be assumed scrapeable.

Therefore sensitive information is never embedded in public HTML, JavaScript bundles, metadata, client-side JSON, hidden DOM nodes, or source maps.

Sensitive data is served only after authorization from server-side endpoints.

### 9.2 Bot and Form Abuse Controls

Recommended protections:

- Cloudflare in front of the site
- Cloudflare Turnstile on request submission and sensitive auth flows
- server-side Turnstile verification
- WAF rules
- rate limiting
- honeypot field
- server-side schema validation
- request payload size limits
- URL validation and sanitization
- duplicate-submission detection
- abuse logging

### 9.3 AI Crawler Controls

Known AI crawler identities should be blocked where practical, including Perplexity crawler identities when supported by Cloudflare controls.

Robots directives should also deny non-approved AI crawlers.

This is a deterrence/control layer, not a guarantee. Any content intentionally made public must be considered copyable by a sufficiently capable human-driven or browser-emulating actor.

The security objective is therefore:

- keep valuable/private data server-side
- block known crawler classes
- minimize useful public scrape surface
- watermark or credit public creative assets where appropriate

### 9.4 Database Security

Use Supabase Row Level Security.

Rules must enforce:

- anonymous/public users cannot read private request records
- requester can access only their own request and messages
- owner can access all records
- Supabase secret credentials never ship to the browser
- public feed is generated from a safe projection/view, not raw request rows

### 9.5 Request URLs

Never use predictable numeric IDs like `/request/123`.

Use random UUIDs or similarly unguessable tokens.

Access still requires authorization; unguessable URLs are not the sole security control.

### 9.6 Security Headers

Use restrictive headers including:

- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- frame restrictions

### 9.7 Secrets

All privileged secrets must be server-side environment variables.

Never expose:

- Supabase secret key
- admin secrets
- Cloudflare secret keys
- email provider secrets

## 10. Hosting Recommendation

Approved initial architecture:

- Private GitHub repository for source control and deployment integration
- Netlify for frontend hosting, serverless functions, SSL/CDN, environment variables, deploy previews, and production deployment
- Supabase for persistent data, Row Level Security, passwordless requester identity, and private request/message data
- Cloudflare Turnstile for bot-resistant human verification without requiring Cloudflare to host the site
- Optional Cloudflare DNS/WAF proxy later if the owner wants stronger crawler filtering or domain-edge controls

Reason:

- simplest operational path for this project
- commercial use is supported on Netlify's current free tier subject to its usage/credit limits
- GitHub preserves version history and enables controlled deployment
- Supabase cleanly separates private data/security from the public frontend
- Turnstile can protect forms even when Netlify is the host
- the architecture can add Cloudflare edge controls later without rebuilding the application

Production repository creation, domain connection, DNS changes, paid plan activation, and production deployment remain owner-gated actions.

## 11. Analytics and Visit Counter

The owner gets a private visit counter and acquisition dashboard.

Suggested metrics:

- unique-ish visits using privacy-conscious session logic
- total page views
- visits today
- visits last 7 days
- request submissions
- accepted requests
- conversion rate
- source: TikTok / YouTube / X / direct / other
- campaign IDs
- top public work items by request conversion

No public-facing analytics are required.

## 12. Public Publishing Workflow

A completed project remains private until owner chooses to publish it.

Publication flow:

1. request completed
2. owner reviews result
3. owner chooses whether it can be showcased
4. owner adds safe title/description/preview
5. public gallery entry is created
6. optional public activity status becomes `Published`

The system must never automatically publish private requester content.

## 13. Error Handling

User-facing errors should be clear but not leak internals.

Examples:

- validation error: highlight exact field
- cooldown: show remaining time
- daily cap reached: show next eligible time/day
- verification failed: offer retry
- closed requests: show reopen time if set
- server failure: preserve form state locally where safe and ask user to retry

Security logs may contain more detail but remain private.

## 14. Testing Requirements

Minimum test coverage should include:

- form validation
- cooldown enforcement
- daily cap enforcement
- duplicate protection
- public feed redaction
- RLS: requester A cannot access requester B
- anonymous user cannot access private request data
- owner can access all requests
- message thread authorization
- availability controls
- spots decrement only on accepted request when enabled
- reopen date display
- Turnstile verification path
- rate-limit path
- notification counts
- publish/unpublish permissions
- analytics events do not expose private request data publicly

Security-sensitive tests are mandatory before production deployment.

## 15. Explicit Non-Goals for v1

Do not build:

- public forum
- public comments
- public profiles
- public DMs
- follower system
- payments
- public file uploads
- unlimited custom work
- automated acceptance
- public request details
- complex moderation community tools

## 16. Success Criteria

The first version succeeds if:

1. visitors can understand the offer and see finished examples quickly
2. visitors can safely submit a request from mobile
3. spam and rapid-repeat submissions are constrained
4. owner can control spots, reopen time, cooldown, and daily cap without redeploying
5. owner can privately review and select projects
6. requester and owner can communicate privately on-site
7. no requester can view or contact another requester
8. owner receives private notifications and analytics
9. sensitive information never appears in the public data path
10. completed work can be selectively converted into new public showcase content

## 17. Owner-Gated Actions

The following require explicit owner approval before execution:

- creating or choosing the production repository
- purchasing or connecting a domain
- enabling paid services
- creating paid hosting plans
- production deployment
- changing DNS
- connecting production email delivery
- publishing public work
- deleting production data
- weakening security controls

