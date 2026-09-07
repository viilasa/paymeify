-- =============================================================================
-- Plans: free (trial — 1 project) vs pro (unlimited)
-- =============================================================================

create type public.plan_tier as enum ('free', 'pro');

alter table public.profiles
  add column if not exists plan public.plan_tier not null default 'free';

comment on column public.profiles.plan is
  'free = trial (1 project). pro = unlimited projects (₹399/month).';
