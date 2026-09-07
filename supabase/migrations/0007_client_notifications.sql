-- =============================================================================
-- Client notifications: phone on the project, a send log, RLS for owners.
-- Email/SMS themselves run in the app (Resend + Twilio), not in Postgres.
-- =============================================================================

alter table public.projects
  add column if not exists client_phone text;

comment on column public.projects.client_phone is
  'E.164 mobile number. Used only to SMS the client the project link. Never exposed on the public portal.';

create table public.client_notifications (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete set null,
  kind         text not null check (kind in ('project_created', 'milestone_completed', 'payment_reminder')),
  channel      text not null check (channel in ('email', 'sms')),
  recipient    text not null,
  sent_at      timestamptz not null default now()
);

create index client_notifications_project_sent_idx
  on public.client_notifications (project_id, kind, sent_at desc);

create index client_notifications_milestone_sent_idx
  on public.client_notifications (milestone_id, kind, sent_at desc)
  where milestone_id is not null;

alter table public.client_notifications enable row level security;

create policy "client_notifications_select_own" on public.client_notifications
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = client_notifications.project_id
        and p.user_id = (select auth.uid())
    )
  );

create policy "client_notifications_insert_own" on public.client_notifications
  for insert to authenticated
  with check (
    exists (
      select 1 from public.projects p
      where p.id = client_notifications.project_id
        and p.user_id = (select auth.uid())
    )
  );
