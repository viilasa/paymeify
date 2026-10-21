-- =============================================================================
-- Paymeify — payment hardening
--
--   * RLS inserts on invoices / payments / client_notifications must point at a
--     milestone inside the caller's own project, not just any milestone id.
--   * report_payment_by_token: UPI only on INR projects with a UPI id, skips
--     zero-amount milestones, and tells the app when a report is a repeat so it
--     doesn't email the freelancer again.
--   * get_invoice_by_number: invoice links keyed on the invoice number, so
--     reordering or deleting milestones never repoints an emailed link.
--   * projects.reminders_enabled: per-project switch for the reminder cron.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- RLS: the milestone must belong to the row's project, owned by the caller.
-- -----------------------------------------------------------------------------
drop policy if exists "invoices_insert_own" on public.invoices;
create policy "invoices_insert_own" on public.invoices
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = invoices.milestone_id
        and m.project_id = invoices.project_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "invoices_update_own" on public.invoices;
create policy "invoices_update_own" on public.invoices
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.milestones m
      join public.projects p on p.id = m.project_id
      where m.id = invoices.milestone_id
        and m.project_id = invoices.project_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "payments_insert_manual_own" on public.payments;
create policy "payments_insert_manual_own" on public.payments
  for insert to authenticated
  with check (
    gateway in ('upi', 'manual')
    and exists (
      select 1 from public.projects p
      where p.id = payments.project_id and p.user_id = (select auth.uid())
    )
    and (
      payments.milestone_id is null
      or exists (
        select 1 from public.milestones m
        where m.id = payments.milestone_id and m.project_id = payments.project_id
      )
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
    and (
      payments.milestone_id is null
      or exists (
        select 1 from public.milestones m
        where m.id = payments.milestone_id and m.project_id = payments.project_id
      )
    )
  );

drop policy if exists "client_notifications_insert_own" on public.client_notifications;
create policy "client_notifications_insert_own" on public.client_notifications
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = client_notifications.project_id and p.user_id = (select auth.uid())
    )
    and (
      client_notifications.milestone_id is null
      or exists (
        select 1 from public.milestones m
        where m.id = client_notifications.milestone_id
          and m.project_id = client_notifications.project_id
      )
    )
  );

-- -----------------------------------------------------------------------------
-- Client UPI claim.
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
  v_upi_id     text;
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

  -- UPI is only offered on rupee projects whose owner has a UPI id.
  select nullif(btrim(coalesce(pr.upi_id, '')), '') into v_upi_id
  from public.profiles pr
  where pr.user_id = v_project.user_id;

  if v_project.currency <> 'INR' or v_upi_id is null then
    return jsonb_build_object('ok', false, 'error', 'UPI payments are not set up for this project.');
  end if;

  -- Zero-amount milestones never need paying, so they don't block the queue.
  select min(position) into v_next_pos
  from public.milestones
  where project_id = v_project.id and payment_status <> 'paid' and amount > 0;

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

  if exists (
    select 1 from public.payments
    where milestone_id = v_milestone.id
      and gateway = 'upi'
      and status = 'pending'
  ) then
    update public.milestones
    set payment_status = 'pending'
    where id = v_milestone.id
      and payment_status = 'unpaid';
    return jsonb_build_object('ok', true, 'duplicate', true);
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
    return jsonb_build_object('ok', true, 'duplicate', true);
  end;

  update public.milestones
  set payment_status = 'pending'
  where id = v_milestone.id
    and payment_status <> 'paid';

  return jsonb_build_object('ok', true, 'duplicate', false);
end;
$$;

revoke all on function public.report_payment_by_token(text, integer, text) from public;
grant execute on function public.report_payment_by_token(text, integer, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Public invoice by number.
-- -----------------------------------------------------------------------------
create or replace function public.get_invoice_by_number(
  p_token  text,
  p_number text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_invoice public.invoices%rowtype;
  v_position integer;
begin
  if p_token is null or p_token !~ '^[0-9a-fA-F]{20,64}$' then
    return null;
  end if;
  if p_number is null or p_number !~* '^INV-[0-9]{1,10}$' then
    return null;
  end if;

  select * into v_project
  from public.projects
  where public_token = p_token
    and status <> 'archived'
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_invoice
  from public.invoices
  where project_id = v_project.id
    and upper(number) = upper(p_number)
  limit 1;

  if not found then
    return null;
  end if;

  select position into v_position
  from public.milestones
  where id = v_invoice.milestone_id;

  return jsonb_build_object(
    'invoice', jsonb_build_object(
      'number', v_invoice.number,
      'from_name', v_invoice.from_name,
      'client_name', v_invoice.client_name,
      'client_email', v_invoice.client_email,
      'line_title', v_invoice.line_title,
      'amount', v_invoice.amount,
      'currency', v_invoice.currency,
      'due_date', v_invoice.due_date,
      'status', v_invoice.status,
      'issued_at', v_invoice.issued_at,
      'paid_at', v_invoice.paid_at
    ),
    'project', jsonb_build_object(
      'name', v_project.name,
      'public_token', v_project.public_token
    ),
    'milestone_position', v_position
  );
end;
$$;

revoke all on function public.get_invoice_by_number(text, text) from public;
grant execute on function public.get_invoice_by_number(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Reminder opt-out.
-- -----------------------------------------------------------------------------
alter table public.projects
  add column if not exists reminders_enabled boolean not null default true;

comment on column public.projects.reminders_enabled is
  'When false, the daily cron never sends this project''s client a payment reminder.';
