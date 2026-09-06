# Paymeify

A minimal milestone tracker and payment collector for freelancers.

Create a project, break it into milestones, share one private link with your
client, and get paid milestone by milestone. Clients never create an account.

**Project → Milestones → Progress → Payments.** Nothing else.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui primitives ·
Supabase (Postgres, Auth, RLS) · UPI QR codes · Razorpay / Stripe (per freelancer)
· deployable to Vercel.

## Getting started

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run the
migrations in order using the SQL editor (or `supabase db push` with the CLI):

1. `supabase/migrations/0001_init.sql` — tables, enums, indexes, triggers
2. `supabase/migrations/0002_rls.sql` — row level security and the public
   client-portal function
3. `supabase/migrations/0003_upi.sql` — the freelancer's UPI ID, and the two
   extra fields the client portal needs to offer it
4. `supabase/migrations/0004_upi_no_service_role.sql` — moves the UPI flow onto
   least-privilege paths so collecting by UPI needs no service-role key
5. `supabase/migrations/0005_payment_connections.sql` — each freelancer’s
   Razorpay / Stripe keys (encrypted at rest)
6. `supabase/migrations/0006_google_profile_name.sql` — Google OAuth names
   land on the profile row

Copy the project URL and keys from **Project Settings → API** into
`.env.local` (or Vercel **Environment Variables**):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
PAYMENT_SECRETS_KEY=
```

`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are accepted as aliases if a
hosting project was set up with those names. Without one of these pairs, sign-up
and log-in throw a server error instead of creating a session.

`PAYMENT_SECRETS_KEY` is any long random string (`openssl rand -hex 32`). It
encrypts freelancer gateway secrets. `SUPABASE_SERVICE_ROLE_KEY` is needed for
automatic payments (webhooks have no user session). UPI-only collection can
leave the service-role key blank.

Set **Authentication → URL Configuration → Site URL** to
`https://www.paymeify.com`, then add these to the redirect allow list:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/**`
- `https://www.paymeify.com/auth/callback`
- `https://www.paymeify.com/**`
- `https://paymeify.com/auth/callback`
- `https://paymeify.com/**`

**Google sign-in.** In Supabase **Authentication → Providers → Google**,
paste the Client ID and Client Secret from Google Cloud. In the Google Cloud
OAuth client:

- Authorized JavaScript origins: `https://www.paymeify.com`,
  `https://paymeify.com`, `http://localhost:3000`
- Authorized redirect URI (only this):
  `https://<your-project-ref>.supabase.co/auth/v1/callback`

Do not put `www.paymeify.com` in Google’s redirect URIs. Google returns to
Supabase; Supabase then sends the user to
`https://www.paymeify.com/auth/callback`.

For local development, turn on **Authentication → Sign In / Up → Confirm email
→ auto-confirm** so signup logs you straight in. The built-in mailer only
delivers to your own team address and is rate-limited to a couple of messages
an hour, so confirmation emails to any other address will not arrive. Turn it
back off, and connect real SMTP, before letting anyone else sign up.

### 3. Get paid by UPI (no setup, INR only)

Sign in, go to **Settings**, and put your UPI ID (e.g. `you@okhdfcbank`) in the
**UPI ID** field. That is the whole setup — there is nothing to register for and
no keys to copy.

Your client then sees a QR on their project link, scans it with GPay, PhonePe,
Paytm, or any UPI app, and the money arrives in your bank account directly.

Because the money never passes through a gateway, nothing can confirm it
automatically. So:

1. The client pays, then presses **I have paid** and optionally gives the UPI
   reference number.
2. You see **Your client says they sent this payment** on the milestone.
3. You check your own bank, then press **Confirm payment received**.

Only step 3 marks the milestone paid. You can also mark any milestone paid from
its `…` menu without the client reporting anything, which is what you want for a
bank transfer or cash.

UPI settles in rupees only. Other currencies use Stripe, connected in Settings.

### 4. Automatic payments (optional, per freelancer)

Each freelancer connects **their own** gateway in **Settings**. Money goes to
their account. The app never uses a shared platform Razorpay/Stripe key.

**India (INR)** — Razorpay. Settings shows the webhook URL to paste. Subscribe
to `payment_link.paid`, `payment_link.expired`, `payment_link.cancelled`.

**Everywhere else** — Stripe. Subscribe to `checkout.session.completed` and
`checkout.session.expired`.

For local webhook testing, tunnel the dev server (`ngrok http 3000`) and set
`NEXT_PUBLIC_APP_URL` to that hostname so Settings shows a reachable URL.

The client portal then offers **Pay** (marks itself paid) next to the GPay QR
(still confirmed by you).

### 5. Run

```bash
npm run dev
```

Sign up at `/signup`, then optionally load the demo project by running
`supabase/seed.sql` in the SQL editor. It attaches "ABC Studio Website"
(₹45,000 across four milestones, two already paid) to your account.

`/demo` shows a static preview of the client portal and needs no database.

## Scripts

| Command             | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Development server               |
| `npm run build`     | Production build                 |
| `npm run start`     | Serve the production build       |
| `npm run typecheck` | `tsc --noEmit`                   |
| `npm run lint`      | ESLint with `eslint-config-next` |

## Routes

| Route                     | Who     | Purpose                                        |
| ------------------------- | ------- | ---------------------------------------------- |
| `/`                       | Public  | Landing page                                   |
| `/demo`                   | Public  | Static preview of the client portal            |
| `/login`, `/signup`       | Public  | Freelancer auth                                |
| `/forgot-password`        | Public  | Request a reset link                           |
| `/reset-password`         | Token   | Set a new password                             |
| `/dashboard`              | Auth    | Greeting, summary figures, recent projects     |
| `/projects`               | Auth    | All projects, archived separated               |
| `/projects/new`           | Auth    | Create a project with its milestones           |
| `/projects/[id]`          | Auth    | Progress, milestone timeline, payment controls |
| `/projects/[id]/settings` | Auth    | Edit, regenerate client link, delete           |
| `/settings`               | Auth    | Profile, UPI ID, Razorpay / Stripe connect      |
| `/p/[token]`              | Client  | The client portal — no account needed          |

## How payment status is decided

A client can never mark their own milestone paid. There are two settlement
paths, and which one applies depends on whether a gateway was involved.

### UPI and other off-gateway transfers

Nobody but the freelancer can see that a UPI transfer landed, so the freelancer
is the authority.

1. The portal builds a `upi://pay` URI from the milestone amount and the
   freelancer's UPI ID, and renders it as a QR on the server.
2. The client pays in their own UPI app, then optionally reports it. That call
   goes through `report_payment_by_token(text, integer, text)`, which writes a
   `pending` row to `payments` with `gateway = 'upi'` and **does not touch the
   milestone**. So a report is a claim, not a settlement.
3. The freelancer confirms. That promotes the client's `payments` row to
   `captured` and sets the milestone to `payment_status = paid` /
   `status = completed` with a `paid_at`.

Marking a milestone paid with no client report writes a `gateway = 'manual'` row
instead, so the ledger still explains where every figure came from.

Reversing a confirmation cancels the off-gateway `payments` rows and returns the
milestone to `unpaid`. Delivery `status` is deliberately left alone: the work
being finished is independent of the money arriving.

### Razorpay and Stripe

INR projects use the owner's Razorpay connection; every other currency uses
their Stripe connection. There is no platform merchant account.

1. The client presses **Pay**. The server prices the milestone from the
   database, loads that project's owner keys, and creates a Razorpay Payment
   Link or a Stripe Checkout Session. The checkout id is stored on the
   milestone.
2. The client pays on the hosted page.
3. The gateway POSTs to `/api/webhooks/razorpay` or `/api/webhooks/stripe`.
   The handler reads `project_id` from notes/metadata, loads **that owner's**
   webhook secret, and verifies the signature before settling anything.
4. A claimed row in `webhook_events` makes retries a no-op. On paid it writes
   the payment, sets the milestone to `payment_status = paid` /
   `status = completed` with a `paid_at`, and marks the project completed once
   every milestone is paid.
5. The redirect back to `/p/[token]?paid=<position>` only decides which
   message to show. If the webhook has not landed yet, the portal says the
   payment is being confirmed and refreshes itself until it is.

Expired or cancelled checkouts clear the stale link and leave the milestone
unpaid, so a fresh one can be issued.

Duplicate payment records are prevented by a unique index on
`(gateway, gateway_payment_id)` and by claiming each webhook delivery id.

## Security model

- **RLS everywhere.** Freelancers reach only their own profile, projects,
  milestones, and payments.
- **Clients are anonymous and stay that way.** The `anon` role has no policy on
  `milestones` or `payments` at all. Everything a client can do goes through one
  of two `SECURITY DEFINER` functions keyed on the project token.
- **A freelancer can record their own money, and nothing else.** The `payments`
  insert and update policies are restricted to `gateway in ('upi','manual')`, so
  a browser cannot forge a Razorpay or Stripe row to make a milestone look
  gateway-settled.
- **Gateway columns stay gateway-owned.** A trigger on `milestones` rejects any
  change to `payment_link_id` or `payment_link_url` from the `authenticated` or
  `anon` role, and refuses to let anyone hand-edit `payment_status` on a
  milestone that has a checkout link or a captured gateway payment. The signed
  webhook is the only thing that can settle those. The owner may move a
  milestone between `paid` and `unpaid` only when no gateway is involved —
  `pending` and `failed` describe a gateway in flight and are refused.
- **Clients read through one function.** `get_project_by_token(text)` is
  `SECURITY DEFINER` and returns a whitelisted JSON view of a single project.
  Internal UUIDs never leave the server; the portal addresses milestones by
  position.
- **Tokens are unguessable.** 40 hex characters generated from two v4 UUIDs,
  regenerable from project settings if a link leaks.
- **Secrets stay server-side.** Freelancer Razorpay/Stripe keys are encrypted
  with `PAYMENT_SECRETS_KEY` and never sent to the browser. The service-role
  key is only used by webhooks (no user session). There is no browser Supabase
  client — every mutation is a server action. Collecting by UPI needs no
  service-role key.
- **Payments are taken in order.** The lowest-positioned unpaid milestone is the
  only payable one. This is enforced in `report_payment_by_token` itself, not
  just in the route that calls it, so reaching the function directly gains
  nothing.
- **Client input is scrubbed in the database too.** The UPI reference is
  stripped to `[A-Za-z0-9-]` and cut to 64 characters inside the function, on the
  assumption that a caller may skip the app entirely.

## Deploying to Vercel

Import the repository, then add every variable from `.env.example` in
**Settings → Environment Variables**. Set `NEXT_PUBLIC_APP_URL` to `https://www.paymeify.com`, and point each
freelancer’s gateway webhook plus the Supabase redirect allow list at that
same origin. Apex `paymeify.com` 308s to `www`.

## Notes and trade-offs

- Amounts are stored as `numeric(14,2)` and converted to minor units only when
  calling a gateway (paise, cents, etc.).
- The dashboard greeting uses server time, so it reflects the deployment
  region rather than the freelancer's timezone.
- Summary figures on the dashboard are added up across projects using the
  currency most of them share. Per-project figures always use that project's
  own currency.
- Milestones are reordered with move up / move down rather than drag and drop:
  it is one server action, works on touch, and needs no extra dependency.
