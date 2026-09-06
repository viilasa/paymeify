-- =============================================================================
-- Paymeify — per-freelancer payment gateways
--
-- Each freelancer connects their own Razorpay (INR) or Stripe (everywhere else).
-- Secrets live encrypted in the app, never in the browser. The public portal
-- only learns *whether* automatic pay is on, not any key material.
-- =============================================================================

create table public.payment_connections (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users (id) on delete cascade,
  provider                 text not null check (provider in ('razorpay', 'stripe')),
  key_id                   text not null,
  secret_encrypted         text not null,
  webhook_secret_encrypted text not null,
  status                   text not null default 'connected' check (status in ('connected', 'invalid')),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (user_id, provider)
);

create index payment_connections_user_id_idx on public.payment_connections (user_id);

create trigger payment_connections_set_updated_at
  before update on public.payment_connections
  for each row execute function public.set_updated_at();

alter table public.payment_connections enable row level security;

-- Freelancers may write their own row. The browser never selects secrets:
-- Settings goes through a server action that returns only status + last-4.
create policy "payment_connections_select_own" on public.payment_connections
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "payment_connections_insert_own" on public.payment_connections
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "payment_connections_update_own" on public.payment_connections
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "payment_connections_delete_own" on public.payment_connections
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Public payload: add auto_pay so the portal can offer hosted checkout
-- without a second round-trip. Values are 'razorpay', 'stripe', or null.
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
    'auto_pay',        (
      select c.provider
      from public.payment_connections c
      where c.user_id = p.user_id
        and c.status = 'connected'
        and (
          (p.currency = 'INR' and c.provider = 'razorpay')
          or (p.currency <> 'INR' and c.provider = 'stripe')
        )
      limit 1
    ),
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

-- A Stripe checkout is a gateway claim the same way a Razorpay link is.
create or replace function public.guard_milestone_payment_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if current_user = 'anon' then
    raise exception 'Payment fields cannot be set from a client link.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' then
    new.payment_status   := 'unpaid';
    new.payment_link_id  := null;
    new.payment_link_url := null;
    new.paid_at          := null;
    return new;
  end if;

  if new.payment_link_id is distinct from old.payment_link_id
     or new.payment_link_url is distinct from old.payment_link_url then
    raise exception 'Payment links are managed by the payment gateway.'
      using errcode = 'check_violation';
  end if;

  if new.payment_status is distinct from old.payment_status
     or new.paid_at is distinct from old.paid_at then

    select p.user_id into v_owner
    from public.projects p
    where p.id = new.project_id;

    if v_owner is null or v_owner is distinct from (select auth.uid()) then
      raise exception 'Only the project owner can record a payment.'
        using errcode = 'check_violation';
    end if;

    if old.payment_link_id is not null then
      raise exception 'This milestone has a payment checkout, so the gateway decides when it is paid.'
        using errcode = 'check_violation';
    end if;

    if exists (
      select 1 from public.payments pay
      where pay.milestone_id = new.id
        and pay.gateway in ('razorpay', 'stripe')
        and pay.status = 'captured'
    ) then
      raise exception 'This milestone was paid through a payment gateway, so its payment status cannot be changed by hand.'
        using errcode = 'check_violation';
    end if;

    if new.payment_status not in ('paid', 'unpaid') then
      raise exception 'A payment recorded by hand can only be paid or unpaid.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;
