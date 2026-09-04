-- =============================================================================
-- Paymeify — core schema
-- Projects -> milestones -> payments, plus freelancer profiles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.project_status as enum ('draft', 'active', 'completed', 'archived');
create type public.milestone_status as enum ('pending', 'in_progress', 'completed');
create type public.payment_status as enum ('unpaid', 'pending', 'paid', 'failed');
create type public.payment_record_status as enum ('created', 'pending', 'captured', 'failed', 'cancelled', 'expired');

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- 40 hex characters built from two v4 UUIDs (~244 bits of entropy).
-- Avoids a pgcrypto dependency while staying computationally unguessable.
create or replace function public.generate_public_token()
returns text
language sql
volatile
as $$
  select replace(gen_random_uuid()::text, '-', '')
      || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  name          text not null default '',
  email         text not null default '',
  business_name text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile row as soon as the auth user exists so the dashboard
-- never has to deal with a missing profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, email, business_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 120),
  client_name  text not null check (char_length(trim(client_name)) between 1 and 120),
  client_email text,
  description  text,
  status       public.project_status not null default 'active',
  currency     text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  public_token text not null unique default public.generate_public_token(),
  start_date   date,
  due_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index projects_user_id_created_at_idx on public.projects (user_id, created_at desc);
create index projects_public_token_idx on public.projects (public_token);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- milestones
-- -----------------------------------------------------------------------------
create table public.milestones (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  title             text not null check (char_length(trim(title)) between 1 and 120),
  description       text,
  amount            numeric(14, 2) not null default 0 check (amount >= 0),
  position          integer not null default 1 check (position > 0),
  status            public.milestone_status not null default 'pending',
  due_date          date,
  payment_status    public.payment_status not null default 'unpaid',
  payment_link_id   text,
  payment_link_url  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  paid_at           timestamptz
);

create index milestones_project_id_position_idx on public.milestones (project_id, position);
create unique index milestones_payment_link_id_key
  on public.milestones (payment_link_id)
  where payment_link_id is not null;

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- payments
-- -----------------------------------------------------------------------------
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid not null references public.projects (id) on delete cascade,
  milestone_id             uuid references public.milestones (id) on delete set null,
  amount                   numeric(14, 2) not null check (amount >= 0),
  currency                 text not null default 'INR',
  gateway                  text not null default 'razorpay',
  gateway_payment_id       text,
  gateway_payment_link_id  text,
  status                   public.payment_record_status not null default 'created',
  created_at               timestamptz not null default now(),
  paid_at                  timestamptz
);

create index payments_project_id_idx on public.payments (project_id);
create index payments_milestone_id_idx on public.payments (milestone_id);

-- One payment row per gateway payment: the guard against duplicate records
-- when Razorpay retries a webhook.
create unique index payments_gateway_payment_id_key
  on public.payments (gateway, gateway_payment_id)
  where gateway_payment_id is not null;

-- -----------------------------------------------------------------------------
-- webhook_events — replay protection, keyed on Razorpay's event id
-- -----------------------------------------------------------------------------
create table public.webhook_events (
  id           text primary key,
  gateway      text not null default 'razorpay',
  event        text not null,
  processed_at timestamptz not null default now()
);
