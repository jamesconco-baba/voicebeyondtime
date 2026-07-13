# Amber — Web MVP

A digital legacy preservation platform. Preserve your voice, letters, photos, and
documents, and release them to the people you love on a date or a life milestone.

MVP scope (per the concept doc, Section 28): real accounts, Legacy Circle, the Vault
(voice recording / uploads / written letters), guided prompts, milestone- and date-based
scheduled release, and a Timeline. AI Assistant, Guardian, voice cloning, and Executor
tools are later phases.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — Auth (email/password), Postgres (row-level security), and Storage
  (private `vault` bucket) for media.
- Voice recording via the browser's `MediaRecorder` API.

## Setup — do this once (about 5 minutes)

### 1. Create a Supabase project
Go to supabase.com → New project. Wait for it to finish provisioning.

### 2. Run the schema
In Supabase → **SQL Editor** → New query → paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql) → **Run**. This creates the tables,
row-level-security policies, the private `vault` storage bucket, and a trigger that
creates a profile row on sign-up.

### 3. Add your keys
Copy `.env.example` to `.env.local` and fill in the two values from Supabase →
**Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is meant to be public; row-level security is what protects the data.

### 3b. Enable the AI layer (Legacy Assistant, Guardian, Books)
Run [`supabase/migration_ai.sql`](./supabase/migration_ai.sql) in the SQL Editor (adds
per-item AI consent + an interaction log). Then add your Anthropic key to `.env.local`
and to Vercel's environment variables:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get one at console.anthropic.com. The key is used only server-side (in `/api/assistant`
and `/api/books`) and is never exposed to the browser. Without it, the AI screens show a
friendly "connect the AI" notice and the rest of the app works normally. The assistant
uses `claude-sonnet-5` and answers strictly from content you've marked for AI use.

### 3c. Enable the Family Tree
Run [`supabase/migration_family.sql`](./supabase/migration_family.sql) in the SQL Editor
(adds the `family_members` table with row-level security). The Family Tree and the
"By theme" grouping in Memories then work end to end. Memories&apos; "By person" and "By
time" views need no migration and work immediately.

### 3d. Enable photos, member details & consent
Run [`supabase/migration_profiles_v2.sql`](./supabase/migration_profiles_v2.sql) in the SQL
Editor. It adds profile/beneficiary photo paths, member notes, and a consent timestamp.
Avatars are stored in the same private `vault` bucket and served via signed URLs, so no new
bucket is needed.

### 3e. Enable multiple files per memory
Run [`supabase/migration_media_multi.sql`](./supabase/migration_media_multi.sql) in the SQL
Editor. It adds a `media` jsonb array to each memory and backfills existing single-file
memories into it, so nothing you've already saved is lost. A memory can now hold a voice
note plus any number of photos, videos, and documents, and you can add or remove files when
editing a memory.

### 4. Email verification (recommended for production)

The app has the routes to handle confirmation links (`/auth/confirm` for the token-hash
flow, `/auth/callback` for the code flow). You need to configure Supabase so the emails
actually send and the links point at those routes.

**a. Use a real email provider (fixes the "email rate limit exceeded" error).**
Supabase's built-in email is dev-only and caps at a few messages per hour. Set up custom
SMTP — Resend works well:
- Supabase → **Project Settings → Authentication → SMTP Settings** → enable custom SMTP.
- Host `smtp.resend.com`, port `465`, username `resend`, password = your Resend API key,
  sender = a verified address on your domain (e.g. `hello@theamberapp.com`).
- In Resend, verify `theamberapp.com` and add the **SPF** and **DKIM** DNS records it gives
  you, or confirmation emails will land in spam.
- Then raise the cap: Supabase → **Authentication → Rate Limits** → increase the
  email-sending limit (it defaults to a low number).

**b. Point the confirmation link at the app.**
Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://theamberapp.com`
- **Redirect URLs**: add `https://theamberapp.com/auth/callback`,
  `https://theamberapp.com/auth/confirm`, and (for local dev) the same two on
  `http://localhost:3000`.

**c. Update the confirmation email template.**
Supabase → **Authentication → Email Templates → Confirm signup** → change the link so it
uses the token hash and lands on the confirm route:

```
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding">Confirm your email</a>
```

Keep email confirmation **on** (Authentication → Providers → Email → Confirm email). New
users then get a link, click it, and land in onboarding with an active session. The
sign-up screen also offers a "Resend confirmation email" button.

*For quick local testing only,* you can toggle Confirm email off to skip the email step —
just remember to turn it back on for production.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Build check:

```bash
npm run build && npm start
```

If the env vars are missing, the app shows a setup notice instead of crashing.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. vercel.com → Add New → Project → import the repo.
3. In the project's **Settings → Environment Variables**, add the same two
   `NEXT_PUBLIC_SUPABASE_*` values (and `ANTHROPIC_API_KEY`). Deploy.
4. Add your custom domain **theamberapp.com** in Vercel → Settings → Domains.
5. In Supabase → **Authentication → URL Configuration**, set the **Site URL** to
   `https://theamberapp.com` and add it to **Redirect URLs**, so confirmation and
   auth links resolve to the live site.

Voice recording needs HTTPS; Vercel provides it (and `localhost` counts as secure in dev).

## How auth + data flow works

- `middleware.ts` refreshes the Supabase session cookie on navigation.
- `lib/supabase/client.ts` exposes a singleton browser client (returns `null` if env is
  unset, which drives the setup notice).
- `lib/store.tsx` is the single data layer every screen uses. It loads the signed-in
  user's rows, generates 1-hour signed URLs for media, and performs all create/update/
  delete against Supabase. Media is uploaded to `vault/<user_id>/<uuid>.<ext>`.
- Auth pages: `/signup`, `/signin`. New users land in `/onboarding`, then `/dashboard`.
- Email confirmation links are handled by two Route Handlers: `/auth/confirm` verifies the
  token hash (`verifyOtp`) and `/auth/callback` exchanges a code (`exchangeCodeForSession`).
  Both set the session cookie and redirect to `/onboarding`.

## Project structure

```
app/
  page.tsx                Landing
  (auth)/signin, signup   Email/password auth
  onboarding/             Name → Legacy Circle → first message
  (app)/                  Authenticated shell + dashboard/vault/messenger/timeline/circle/settings
components/               brand, ui, recorder, add-content-modal, auth-shell, setup-notice
lib/
  types.ts                Data model
  store.tsx               Supabase-backed store (auth + CRUD + storage)
  supabase/client.ts      Browser client
  prompts.ts, media.ts    Prompt library + media/format helpers
middleware.ts             Session refresh
supabase/schema.sql       Tables, RLS, storage bucket + policies
```

## Testing checklist

1. Sign up → land in onboarding → add your name, a couple of people, record/write a first message.
2. Dashboard shows counts; Vault shows the memory (audio should play back).
3. Add a photo/document in Vault (uploads to Storage).
4. Messenger: schedule a message to a milestone or date; mark one delivered.
5. Timeline shows past items and a future scheduled release.
6. Sign out (Settings), sign back in — everything persists.
7. In Supabase → Table editor, confirm rows appear only for your user; Storage → `vault`
   shows files under your user-id folder.

## Build stages beyond MVP

The full functional breakdown of every module/feature/function in the concept doc is in
[`docs/FUNCTIONAL_BUILD_SPEC.md`](./docs/FUNCTIONAL_BUILD_SPEC.md), with a build sequence.

**Stage 1 — Inheritance & Reconciliation (now included).** Adds the Executor & Inheritance
module: recipients with redundant contacts + stewards, age floors, executors, life-event
verification with a 14-day grace period, dispute/cancel, an audit log, and claim-invitation
links (with a `/claim/[token]` landing). To enable it, run
[`supabase/schema-inheritance.sql`](./supabase/schema-inheritance.sql) in your Supabase SQL
Editor (after the original `schema.sql`). The complete target schema for the whole platform
is in [`supabase/schema-full.sql`](./supabase/schema-full.sql) for reference.

## Admin dashboard (`/admin`)

A separate, role-gated dashboard for monitoring growth: total/new users, onboarding rate,
memories preserved, scheduled messages, feature adoption (Vault, Messenger, Legacy Assistant,
Family Tree), and — once PostHog is connected — landing page traffic (pageviews, top pages,
time on page, unique visitors).

It's deliberately **not** at the path you'd first guess — `/dashboard` was already taken by
the signed-in user's own home screen (see `app/(app)/dashboard`), so the admin view lives at
`/admin` instead, as a sibling route outside the regular app shell.

### Setup

1. Run [`supabase/migration_admin.sql`](./supabase/migration_admin.sql) in the SQL Editor. It
   adds an `is_admin` flag to `profiles` and a few indexes the growth charts need.
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` and to Vercel (Supabase → Project Settings
   → API → `service_role`). This is what lets the dashboard read across every user's data —
   regular RLS policies stay untouched and still fully protect the app itself.
3. Make yourself an admin — run this once in the SQL Editor with your own email:
   ```sql
   update public.profiles set is_admin = true
     where id = (select id from auth.users where email = 'you@theamberapp.com');
   ```
4. Sign in and visit `/admin`. The Overview, Users, and Feature Usage pages work immediately
   from your existing Supabase data — no further setup needed.
5. **Optional — for the Traffic page:** create a free project at
   [posthog.com](https://posthog.com), then add to `.env.local` / Vercel:
   ```
   NEXT_PUBLIC_POSTHOG_KEY=phc_...
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   POSTHOG_PERSONAL_API_KEY=phx_...
   POSTHOG_PROJECT_ID=12345
   ```
   The first two enable event capture app-wide (pageviews, time on page, and feature events
   like `memory_created` and `message_scheduled` — see `lib/analytics/events.ts` for the full
   list). The last two are a read-only key the dashboard uses server-side to query aggregate
   traffic; they never reach the browser.

### How access control works

Two independent checks, both server-side (see `lib/admin-auth.ts`):
- `app/admin/layout.tsx` is a Server Component that redirects to `/signin` if you're not a
  signed-in admin — this keeps the dashboard shell itself from ever rendering for anyone else.
- Every `app/api/admin/*` route re-checks independently before touching data. This matters
  because these routes use the **service-role client** (`lib/supabase/admin.ts`), which
  bypasses row-level security by design — the route-level check is the actual access-control
  boundary for that data, not RLS.

### Security notes

- `SUPABASE_SERVICE_ROLE_KEY` and `POSTHOG_PERSONAL_API_KEY` must **never** be prefixed with
  `NEXT_PUBLIC_` or referenced from a Client Component — both are guarded with the
  `server-only` package, which throws a build error if that ever happens by mistake.
- Promoting/demoting admins (`/api/admin/promote`) refuses to let the last remaining admin
  demote themselves, so you can't accidentally lock everyone out.

## Recipient portal (`/received`, `/claim`)

Lets a scheduled message actually reach the person it's for. **MVP identity model:**
access is gated entirely by the email address the creator registered for that recipient
(`beneficiaries.email`) — there's no separate password or ID-verification step yet. A
recipient proves who they are simply by receiving a one-time sign-in link at that exact
email address and clicking it. This is deliberately simple to ship first; swapping in real
identity verification (e.g. Persona, Stripe Identity) later only touches
`app/claim/[token]/page.tsx` and `app/api/claim/[token]/complete/route.ts` — nothing else
in the data model needs to change.

**How it flows:**
1. A scheduled message's release date arrives (checked once a day by a Vercel Cron job) —
   or a creator hits "Send now" for an immediate message.
2. The recipient's registered email gets a message: a **claim invite** (first time) or a
   **new message** notice (they already have an account) — see `lib/email.ts`.
3. Clicking through sends a Supabase magic-link sign-in to that same email — never a
   password, never an email the recipient types in themselves.
4. First time only: `app/api/claim/[token]/complete` links their new account to that
   `beneficiaries` row (`claimed_by`) after re-confirming the signed-in email matches.
5. `/received` shows everything actually marked `delivered` for them — never drafts or
   still-scheduled items — grouped by who preserved it.

### Setup

1. Run `supabase/schema-inheritance.sql` if you haven't already (this feature needs
   `beneficiaries.claimed_by` and the `claim_tokens` table it adds), then
   `supabase/migration_recipients.sql` for the supporting indexes.
2. Create a free account at [resend.com](https://resend.com), verify your sending domain
   (or use their test domain while developing), and add to Vercel:
   ```
   RESEND_API_KEY=re_...
   AMBER_EMAIL_FROM="Amber <notify@theamberapp.com>"
   NEXT_PUBLIC_SITE_URL=https://theamberapp.com
   CRON_SECRET=<any long random string you make up>
   ```
3. `vercel.json` already schedules the release check daily — no extra setup once the env
   vars above are in place and the project is deployed.
4. Every beneficiary now requires an email on file (`app/(app)/circle`) — this was
   previously optional; it's now enforced there since this whole flow depends on it.

### What's intentionally out of scope for this MVP

- **No real identity/age verification.** Anyone with access to the registered inbox can
  claim — fine for a first version, not sufficient on its own for the minor/guardian
  scenario long-term (see the Inheritance module's `age_floor` and steward fields, which
  the data model already supports but this flow doesn't yet enforce).
- **Milestone-triggered messages aren't auto-released by the cron job** — those still go
  through the Inheritance module's verification-event flow (creator- or
  executor-confirmed), which is the appropriate place for a human check given the more
  sensitive trigger (e.g. "upon my passing").
- **A recipient claimed by multiple creators** sees all of them grouped separately on
  `/received` — untested at scale, fine for MVP volumes.
