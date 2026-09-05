# Paymeify

A minimal milestone tracker and payment collector for freelancers.

Create a project, break it into milestones, share one private link with your
client, and get paid milestone by milestone. Clients never create an account.

**Project → Milestones → Progress → Payments.** Nothing else.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui primitives ·
Supabase (Postgres, Auth, RLS) · UPI QR codes · Razorpay Payment Links ·
deployable to Vercel.

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

Copy the project URL and keys from **Project Settings → API** into
`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is only needed if you set up Razorpay, whose webhook
has no user session to act on behalf of. Collecting by UPI does not use it, so
you can leave it blank.

Under **Authentication → URL Configuration**, add
`http://localhost:3000/auth/callback` to the redirect allow list.

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

UPI settles in rupees only, so a project in any other currency needs Razorpay.

### 4. Set up Razorpay (optional)

Razorpay needs a registered business and KYC, which is why UPI exists above. The
payoff is that it confirms payments automatically instead of you checking your
bank.

From the Razorpay dashboard, copy your API keys into `.env.local`:

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Then add a webhook pointing at `https://your-domain/api/webhooks/razorpay`,
subscribed to these four events:

- `payment_link.paid`
- `payment_link.partially_paid`
- `payment_link.expired`
- `payment_link.cancelled`

Put the webhook's signing secret in `RAZORPAY_WEBHOOK_SECRET`.

For local testing, expose your dev server with a tunnel (`ngrok http 3000` or
`cloudflared tunnel --url http://localhost:3000`), use that hostname for both
the Razorpay webhook and `NEXT_PUBLIC_APP_URL`.

The app runs without Razorpay keys — payment link creation is simply hidden and
Settings shows Razorpay as "Not set up".

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
| `/settings`               | Auth    | Profile, UPI ID, and payment method status      |
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

### Razorpay

1. The freelancer (or the client, from the portal) asks the server for a
   payment link. The server prices the milestone from the database and calls
   Razorpay, storing the returned `plink_…` id on the milestone.
2. The client pays on Razorpay's hosted page.
3. Razorpay POSTs to `/api/webhooks/razorpay`. The handler verifies the
   HMAC-SHA256 signature against `RAZORPAY_WEBHOOK_SECRET` before reading the
   body, then claims the delivery's event id in `webhook_events` so retries are
   a no-op.
4. On `payment_link.paid` it writes the payment row, sets the milestone to
   `payment_status = paid` / `status = completed` with a `paid_at`, and marks
   the project completed once every milestone is paid.
5. Razorpay's redirect back to `/p/[token]?paid=<position>` only decides which
   message to show. If the webhook has not landed yet, the portal says the
   payment is being confirmed and refreshes itself until it is.

`payment_link.expired` and `payment_link.cancelled` clear the stale link from
the milestone and leave it unpaid, so a fresh link can be issued.

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
  a browser cannot forge a Razorpay row to make a milestone look
  gateway-settled.
- **Gateway columns stay gateway-owned.** A trigger on `milestones` rejects any
  change to `payment_link_id` or `payment_link_url` from the `authenticated` or
  `anon` role, and refuses to let anyone hand-edit `payment_status` on a
  milestone that has a Razorpay link or a captured Razorpay payment. Razorpay's
  webhook stays the only thing that can settle a Razorpay payment. The owner may
  move a milestone between `paid` and `unpaid` only when no gateway is involved
  — `pending` and `failed` describe a gateway in flight and are refused.
- **Clients read through one function.** `get_project_by_token(text)` is
  `SECURITY DEFINER` and returns a whitelisted JSON view of a single project.
  Internal UUIDs never leave the server; the portal addresses milestones by
  position.
- **Tokens are unguessable.** 40 hex characters generated from two v4 UUIDs,
  regenerable from project settings if a link leaks.
- **Secrets stay server-side.** The service-role key and both Razorpay secrets
  are only read inside server actions, route handlers, and the webhook. There
  is no browser Supabase client at all — every mutation is a server action.
  Collecting by UPI needs no service-role key.
- **Payments are taken in order.** The lowest-positioned unpaid milestone is the
  only payable one. This is enforced in `report_payment_by_token` itself, not
  just in the route that calls it, so reaching the function directly gains
  nothing.
- **Client input is scrubbed in the database too.** The UPI reference is
  stripped to `[A-Za-z0-9-]` and cut to 64 characters inside the function, on the
  assumption that a caller may skip the app entirely.

## Deploying to Vercel

Import the repository, then add every variable from `.env.example` in
**Settings → Environment Variables**. Set `NEXT_PUBLIC_APP_URL` to your
production origin, and point the Razorpay webhook and the Supabase redirect
allow list at that same origin.

## Notes and trade-offs

- Amounts are stored as `numeric(14,2)` and converted to minor units only when
  calling Razorpay, which works in paise.
- The dashboard greeting uses server time, so it reflects the deployment
  region rather than the freelancer's timezone.
- Summary figures on the dashboard are added up across projects using the
  currency most of them share. Per-project figures always use that project's
  own currency.
- Milestones are reordered with move up / move down rather than drag and drop:
  it is one server action, works on touch, and needs no extra dependency.
