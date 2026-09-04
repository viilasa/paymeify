# Paymeify

A minimal milestone tracker and payment collector for freelancers.

Create a project, break it into milestones, share one private link with your
client, and get paid milestone by milestone. Clients never create an account.

**Project → Milestones → Progress → Payments.** Nothing else.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui primitives ·
Supabase (Postgres, Auth, RLS) · Razorpay Payment Links · deployable to Vercel.

## Getting started

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run the two
migrations in order using the SQL editor (or `supabase db push` with the CLI):

1. `supabase/migrations/0001_init.sql` — tables, enums, indexes, triggers
2. `supabase/migrations/0002_rls.sql` — row level security and the public
   client-portal function

Copy the project URL and keys from **Project Settings → API** into
`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Under **Authentication → URL Configuration**, add
`http://localhost:3000/auth/callback` to the redirect allow list.

For local development, turn on **Authentication → Sign In / Up → Confirm email
→ auto-confirm** so signup logs you straight in. The built-in mailer only
delivers to your own team address and is rate-limited to a couple of messages
an hour, so confirmation emails to any other address will not arrive. Turn it
back off, and connect real SMTP, before letting anyone else sign up.

### 3. Set up Razorpay

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

The app runs without Razorpay keys — payment link creation is simply disabled
and Settings shows Razorpay as "Not connected".

### 4. Run

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
| `/settings`               | Auth    | Profile and Razorpay connection status         |
| `/p/[token]`              | Client  | The client portal — no account needed          |

## How payment status is decided

The browser can never mark anything paid.

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
- **Payments are read-only to the freelancer.** Inserts and updates on
  `payments` have no policy at all, so only the service role can write them.
- **Milestone payment columns are gateway-owned.** A database trigger rejects
  any attempt by the `authenticated` or `anon` role to change
  `payment_status`, `paid_at`, `payment_link_id`, or `payment_link_url`. Not
  even the project's owner can mark a milestone paid by hand.
- **Clients read through one function.** `get_project_by_token(text)` is
  `SECURITY DEFINER` and returns a whitelisted JSON view of a single project.
  Internal UUIDs never leave the server; the portal addresses milestones by
  position.
- **Tokens are unguessable.** 40 hex characters generated from two v4 UUIDs,
  regenerable from project settings if a link leaks.
- **Secrets stay server-side.** The service-role key and both Razorpay secrets
  are only read inside server actions, route handlers, and the webhook. There
  is no browser Supabase client at all — every mutation is a server action.
- **Payments are taken in order.** The public pay route refuses any milestone
  that is not the lowest-positioned unpaid one.

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
