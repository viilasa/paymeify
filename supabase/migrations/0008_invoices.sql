-- =============================================================================
-- Simple milestone invoices (payment invoices, not GST tax invoices).
-- One numbered invoice per milestone, emailed via Resend; public print page
-- is keyed on the project's public_token + milestone position.
-- =============================================================================

create table public.invoices (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  milestone_id  uuid not null references public.milestones (id) on delete cascade,
  number        text not null,
  from_name     text not null,
  client_name   text not null,
  client_email  text,
  line_title    text not null,
  amount        numeric(14, 2) not null check (amount >= 0),
  currency      text not null,
  due_date      date,
  status        text not null default 'sent'
                  check (status in ('sent', 'paid', 'void')),
  issued_at     timestamptz not null default now(),
  sent_at       timestamptz,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, number)
);

comment on table public.invoices is
  'Payment invoices for milestones. Snapshots amounts so later edits do not rewrite a sent invoice.';

create unique index invoices_one_open_per_milestone_idx
  on public.invoices (milestone_id)
  where status = 'sent';

create index invoices_project_idx on public.invoices (project_id, issued_at desc);
create index invoices_user_idx on public.invoices (user_id, issued_at desc);

alter table public.invoices enable row level security;

create policy "invoices_select_own" on public.invoices
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "invoices_insert_own" on public.invoices
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "invoices_update_own" on public.invoices
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Allow invoice_sent on the notification log.
alter table public.client_notifications
  drop constraint if exists client_notifications_kind_check;

alter table public.client_notifications
  add constraint client_notifications_kind_check
  check (kind in (
    'project_created',
    'milestone_completed',
    'payment_reminder',
    'invoice_sent'
  ));

-- Public portal: anyone with the project token can view the invoice for a
-- milestone position. Mirrors get_project_by_token — no auth required.
create or replace function public.get_invoice_by_token(
  p_token text,
  p_position integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_milestone public.milestones%rowtype;
  v_invoice public.invoices%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 20 then
    return null;
  end if;
  if p_position is null or p_position < 1 or p_position > 1000 then
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

  select * into v_milestone
  from public.milestones
  where project_id = v_project.id
    and position = p_position
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_invoice
  from public.invoices
  where milestone_id = v_milestone.id
    and status <> 'void'
  order by issued_at desc
  limit 1;

  if not found then
    return null;
  end if;

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
    'milestone_position', v_milestone.position
  );
end;
$$;

revoke all on function public.get_invoice_by_token(text, integer) from public;
grant execute on function public.get_invoice_by_token(text, integer) to anon, authenticated;
