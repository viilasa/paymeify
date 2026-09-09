-- =============================================================================
-- Payment status machine: pending = checkout open / UPI claimed (not paid).
-- Paid still only comes from gateway settle or freelancer manual confirm.
-- =============================================================================

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

  if exists (
    select 1 from public.payments
    where milestone_id = v_milestone.id
      and gateway = 'upi'
      and status = 'pending'
  ) then
    -- Keep milestone in pending so the freelancer inbox stays accurate.
    update public.milestones
    set payment_status = 'pending'
    where id = v_milestone.id
      and payment_status = 'unpaid';
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
    return jsonb_build_object('ok', true);
  end;

  -- Claim only — never 'paid'. Freelancer confirmation or a gateway webhook settles.
  update public.milestones
  set payment_status = 'pending'
  where id = v_milestone.id
    and payment_status <> 'paid';

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.report_payment_by_token(text, integer, text) from public;
grant execute on function public.report_payment_by_token(text, integer, text) to anon, authenticated;

comment on function public.report_payment_by_token(text, integer, text) is
  'Client UPI claim: inserts a pending payment and sets milestone payment_status=pending. Never marks paid.';
