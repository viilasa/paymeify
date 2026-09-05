-- =============================================================================
-- Paymeify — UPI without the service role
--
-- 0003 routed UPI through the service-role key, inherited from the Razorpay
-- design where the gateway is the authority on whether money moved. For a
-- direct UPI transfer that reasoning does not hold: there is no gateway, and the
-- freelancer reading their own bank statement *is* the authority.
--
-- Making the headline feature depend on the most dangerous secret in the project
-- is also backwards, so this migration moves both halves of the UPI flow onto
-- ordinary, least-privilege paths:
--
--   * The client reports a transfer through a SECURITY DEFINER function keyed on
--     the project token — the same shape as the existing read path.
--   * The freelancer records a payment through normal RLS, with the guard
--     trigger relaxed for exactly the case it should never have covered.
--
-- What stays locked down:
--   * anon still cannot touch milestones or payments directly.
--   * Nobody can hand-edit payment_link_id / payment_link_url. Those are the
--     gateway's.
--   * A milestone that has a Razorpay link, or a captured Razorpay payment,
--     still refuses hand-editing of its payment status. Razorpay's webhook
--     remains the only thing that can settle a Razorpay payment.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- payments — the freelancer may record off-gateway money, and only that.
-- The `gateway in ('upi','manual')` check is what stops a browser forging a
-- Razorpay row to make a milestone look gateway-settled.
-- -----------------------------------------------------------------------------
drop policy if exists "payments_insert_manual_own" on public.payments;
create policy "payments_insert_manual_own" on public.payments
  for insert to authenticated
  with check (
    gateway in ('upi', 'manual')
    and exists (
      select 1 from public.projects p
      where p.id = payments.project_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "payments_update_manual_own" on public.payments;
create policy "payments_update_manual_own" on public.payments
  for update to authenticated
  using (
    gateway in ('upi', 'manual')
    and exists (
      select 1 from public.projects p
      where p.id = payments.project_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    gateway in ('upi', 'manual')
    and exists (
      select 1 from public.projects p
      where p.id = payments.project_id and p.user_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- The payment-field guard, narrowed.
--
-- Before: no browser could ever write a milestone payment field.
-- Now:    the owning freelancer can move payment_status between paid and unpaid,
--         but only on a milestone with no gateway involvement.
-- -----------------------------------------------------------------------------
-- Deliberately SECURITY INVOKER: the whole guard turns on which role is doing
-- the writing, and a SECURITY DEFINER function sees itself as its owner rather
-- than as the caller. The reads below are all covered by the caller's own RLS
-- policies — a freelancer can already select their own projects and payments.
create or replace function public.guard_milestone_payment_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_owner uuid;
begin
  -- The service role is the webhook, and it is trusted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- Clients have no policy on this table at all; belt and braces.
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

  -- Gateway-owned columns, in every case.
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
      raise exception 'This milestone has a Razorpay payment link, so Razorpay decides when it is paid.'
        using errcode = 'check_violation';
    end if;

    if exists (
      select 1 from public.payments pay
      where pay.milestone_id = new.id
        and pay.gateway = 'razorpay'
        and pay.status = 'captured'
    ) then
      raise exception 'This milestone was paid through Razorpay, so its payment status cannot be changed by hand.'
        using errcode = 'check_violation';
    end if;

    -- 'pending' and 'failed' describe a gateway in flight. A payment recorded by
    -- hand is only ever one of two things.
    if new.payment_status not in ('paid', 'unpaid') then
      raise exception 'A payment recorded by hand can only be paid or unpaid.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- A client telling us they sent a UPI transfer.
--
-- Records a claim and nothing else: the milestone's own payment_status is never
-- touched here, so holding the link does not let anyone mark themselves paid.
-- The freelancer confirms against their bank afterwards.
--
-- Authorisation is the project token. The amount is read from the database, and
-- the reference is scrubbed, because an anonymous caller can reach this
-- directly rather than through the app.
-- -----------------------------------------------------------------------------
create or replace function public.report_payment_by_token(
  p_token    text,
  p_position integer,
  p_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project    public.projects;
  v_milestone  public.milestones;
  v_next_pos   integer;
  v_reference  text;
begin
  if p_token is null or p_token !~ '^[0-9a-fA-F]{20,64}$' then
    return jsonb_build_object('ok', false, 'error', 'This project link is not valid.');
  end if;

  if p_position is null or p_position < 1 or p_position > 1000 then
    return jsonb_build_object('ok', false, 'error', 'That milestone could not be found.');
  end if;

  select * into v_project
  from public.projects
  where public_token = p_token and status <> 'archived';

  if v_project.id is null then
    return jsonb_build_object('ok', false, 'error', 'This project link is no longer active.');
  end if;

  -- Milestones are paid in order, so only the lowest unpaid one can be reported.
  select min(position) into v_next_pos
  from public.milestones
  where project_id = v_project.id and payment_status <> 'paid';

  if v_next_pos is null then
    return jsonb_build_object('ok', false, 'error', 'Every milestone on this project is already paid.');
  end if;

  if v_next_pos is distinct from p_position then
    return jsonb_build_object('ok', false, 'error', 'Milestones are paid in order. This one is not due yet.');
  end if;

  select * into v_milestone
  from public.milestones
  where project_id = v_project.id and position = p_position
  order by created_at
  limit 1;

  if v_milestone.id is null then
    return jsonb_build_object('ok', false, 'error', 'That milestone could not be found.');
  end if;

  -- Already reported. Repeating is harmless, so say yes rather than raising an
  -- error the client can do nothing about.
  if exists (
    select 1 from public.payments
    where milestone_id = v_milestone.id
      and gateway = 'upi'
      and status = 'pending'
  ) then
    return jsonb_build_object('ok', true);
  end if;

  v_reference := nullif(
    left(regexp_replace(btrim(coalesce(p_reference, '')), '[^a-zA-Z0-9-]', '', 'g'), 64),
    ''
  );

  begin
    insert into public.payments
      (project_id, milestone_id, amount, currency, gateway, gateway_payment_id, status)
    values
      (v_project.id, v_milestone.id, v_milestone.amount, v_project.currency,
       'upi', v_reference, 'pending');
  exception when unique_violation then
    -- Someone already reported a transfer with this reference.
    return jsonb_build_object('ok', true);
  end;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.report_payment_by_token(text, integer, text) from public;
grant execute on function public.report_payment_by_token(text, integer, text) to anon, authenticated;
