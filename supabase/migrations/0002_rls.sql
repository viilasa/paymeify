-- =============================================================================
-- Paymeify — Row Level Security
--
-- Rules:
--   * A freelancer reaches only their own profile, projects, milestones, payments.
--   * Clients never authenticate; they read one project through a SECURITY
--     DEFINER function keyed on the project's public_token.
--   * Payment state is writable only by the service role (webhook handler).
-- =============================================================================

alter table public.profiles       enable row level security;
alter table public.projects       enable row level security;
alter table public.milestones     enable row level security;
alter table public.payments       enable row level security;
alter table public.webhook_events enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create policy "projects_select_own" on public.projects
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "projects_update_own" on public.projects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "projects_delete_own" on public.projects
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- milestones — ownership is inherited from the parent project
-- -----------------------------------------------------------------------------
create policy "milestones_select_own" on public.milestones
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "milestones_insert_own" on public.milestones
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "milestones_update_own" on public.milestones
  for update to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "milestones_delete_own" on public.milestones
  for delete to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = milestones.project_id and p.user_id = (select auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- payments — read-only for the freelancer, written only by the service role
-- -----------------------------------------------------------------------------
create policy "payments_select_own" on public.payments
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = payments.project_id and p.user_id = (select auth.uid())
    )
  );

-- webhook_events has RLS enabled and no policies: service role only.

-- -----------------------------------------------------------------------------
-- Payment fields on milestones are gateway-owned.
-- Even an authenticated freelancer cannot flip a milestone to "paid" by hand;
-- only the webhook handler (service role) can.
-- -----------------------------------------------------------------------------
create or replace function public.guard_milestone_payment_fields()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.payment_status  := 'unpaid';
    new.payment_link_id := null;
    new.payment_link_url := null;
    new.paid_at         := null;
    return new;
  end if;

  if new.payment_status is distinct from old.payment_status
     or new.paid_at is distinct from old.paid_at
     or new.payment_link_id is distinct from old.payment_link_id
     or new.payment_link_url is distinct from old.payment_link_url then
    raise exception 'Milestone payment fields are managed by the payment gateway.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger milestones_guard_payment_fields
  before insert or update on public.milestones
  for each row execute function public.guard_milestone_payment_fields();

-- -----------------------------------------------------------------------------
-- Public client portal read path.
--
-- Returns a whitelisted view of one project. Internal UUIDs are never included;
-- clients address milestones by their position number.
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
    'milestones',      coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'position',       m.position,
            'title',          m.title,
            'description',    m.description,
            'amount',         m.amount,
            'status',         m.status,
            'payment_status', m.payment_status,
            'due_date',       m.due_date,
            'paid_at',        m.paid_at
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
