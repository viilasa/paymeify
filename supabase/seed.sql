-- =============================================================================
-- Paymeify — demo data
--
-- Run this AFTER signing up at least one freelancer account.
-- It attaches the demo project to the account named below (or, if that email
-- does not exist, to the most recently created account).
--
-- Supabase SQL editor:  paste and run.
-- Supabase CLI:         supabase db reset  (runs migrations, then this file)
-- =============================================================================

do $$
declare
  v_user_id    uuid;
  v_project_id uuid;
  v_m1         uuid;
  v_m2         uuid;
begin
  select id into v_user_id
  from auth.users
  where email = 'demo@paymeify.app'
  limit 1;

  if v_user_id is null then
    select id into v_user_id from auth.users order by created_at desc limit 1;
  end if;

  if v_user_id is null then
    raise notice 'No auth user found. Sign up in the app first, then re-run this seed.';
    return;
  end if;

  -- Keep the seed idempotent.
  delete from public.projects
  where user_id = v_user_id and name = 'ABC Studio Website';

  insert into public.projects
    (user_id, name, client_name, client_email, description, status, currency, start_date, due_date)
  values
    (
      v_user_id,
      'ABC Studio Website',
      'Acme Coffee',
      'hello@acmecoffee.example',
      'Marketing site redesign and build — 6 pages, CMS, and launch support.',
      'active',
      'INR',
      current_date - 28,
      current_date + 24
    )
  returning id into v_project_id;

  insert into public.milestones
    (project_id, title, description, amount, position, status, due_date, payment_status, paid_at)
  values
    (v_project_id, 'Discovery',   'Kickoff workshop, sitemap, and content audit.',           5000,  1, 'completed',   current_date - 21, 'paid',   now() - interval '20 days'),
    (v_project_id, 'Design',      'Full visual design for all six pages, desktop + mobile.', 10000, 2, 'completed',   current_date - 10, 'paid',   now() - interval '9 days'),
    (v_project_id, 'Development', 'Next.js build, CMS wiring, and responsive QA.',           15000, 3, 'in_progress', current_date + 10, 'unpaid', null),
    (v_project_id, 'Launch',      'Domain setup, analytics, and post-launch fixes.',         15000, 4, 'pending',     current_date + 24, 'unpaid', null);

  select id into v_m1 from public.milestones where project_id = v_project_id and position = 1;
  select id into v_m2 from public.milestones where project_id = v_project_id and position = 2;

  insert into public.payments
    (project_id, milestone_id, amount, currency, gateway, gateway_payment_id, status, paid_at)
  values
    (v_project_id, v_m1, 5000,  'INR', 'razorpay', 'pay_demo_discovery', 'captured', now() - interval '20 days'),
    (v_project_id, v_m2, 10000, 'INR', 'razorpay', 'pay_demo_design',    'captured', now() - interval '9 days')
  on conflict do nothing;

  raise notice 'Seeded "ABC Studio Website" for user %', v_user_id;
end
$$;
