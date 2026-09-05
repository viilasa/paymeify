-- =============================================================================
-- Paymeify — UPI collection
--
-- Razorpay onboarding needs a registered business and KYC, which puts it out of
-- reach for a freelancer who wants to invoice this week. So a freelancer can
-- instead publish a UPI ID: the client portal renders a QR that any UPI app
-- (GPay, PhonePe, Paytm, BHIM) can scan, and the money lands straight in their
-- bank account with no gateway in between.
--
-- The trade-off is that a direct UPI transfer has no webhook, so nothing can
-- confirm it by machine. The flow is therefore:
--
--   1. Client scans the QR and pays.
--   2. Client optionally *reports* the transfer, which lands as a `pending`
--      row in payments with gateway = 'upi'.
--   3. The freelancer checks their own bank and marks it received.
--
-- Only step 3 sets the milestone to paid, and it runs through a server action
-- holding the service role. The guard trigger from 0002 is untouched: a browser
-- still cannot write a payment field, whether it belongs to a client or to the
-- freelancer.
-- =============================================================================

alter table public.profiles
  add column if not exists upi_id text;

-- Virtual Payment Address: `handle@bank`, e.g. `priya@okhdfcbank`.
-- Permissive on handle length on purpose — providers disagree about the
-- minimum, and rejecting a valid VPA stops someone getting paid at all, while a
-- typo just fails in the payer's app with a clear message.
alter table public.profiles
  drop constraint if exists profiles_upi_id_format;

alter table public.profiles
  add constraint profiles_upi_id_format check (
    upi_id is null
    or upi_id ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}@[a-zA-Z][a-zA-Z0-9.]{1,63}$'
  );

-- Finding a milestone's reported-but-unconfirmed transfer.
create index if not exists payments_milestone_pending_idx
  on public.payments (milestone_id, gateway, status);

-- -----------------------------------------------------------------------------
-- Public client portal read path.
--
-- Adds two fields to the payload from 0002:
--   * upi_id           — where to send the money. A receive-only address, and
--                        the freelancer opts in by entering it.
--   * payment_reported — whether this milestone already has a transfer the
--                        client told us about but the freelancer has not yet
--                        confirmed. Stops them paying or reporting twice.
--
-- Internal UUIDs are still never included; clients address milestones by
-- position number.
-- -----------------------------------------------------------------------------
create or replace function public.get_project_by_token(p_token text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'name',            p.name,
    'description',     p.description,
    'status',          p.status,
    'currency',        p.currency,
    'client_name',     p.client_name,
    'start_date',      p.start_date,
    'due_date',        p.due_date,
    'business_name',   coalesce(nullif(btrim(pr.business_name), ''), nullif(btrim(pr.name), ''), 'Freelancer'),
    'upi_id',          nullif(btrim(coalesce(pr.upi_id, '')), ''),
    'milestones',      coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'position',         m.position,
            'title',            m.title,
            'description',      m.description,
            'amount',           m.amount,
            'status',           m.status,
            'payment_status',   m.payment_status,
            'due_date',         m.due_date,
            'paid_at',          m.paid_at,
            'payment_reported', exists (
              select 1
              from public.payments pay
              where pay.milestone_id = m.id
                and pay.gateway = 'upi'
                and pay.status = 'pending'
            )
          )
          order by m.position, m.created_at
        )
        from public.milestones m
        where m.project_id = p.id
      ),
      '[]'::jsonb
    )
  )
  from public.projects p
  left join public.profiles pr on pr.user_id = p.user_id
  where p.public_token = p_token
    and p.status <> 'archived';
$$;

revoke all on function public.get_project_by_token(text) from public;
grant execute on function public.get_project_by_token(text) to anon, authenticated;
