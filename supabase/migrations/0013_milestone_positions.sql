-- =============================================================================
-- Paymeify — milestone numbering you can trust
--
--   * Renumbers every project's milestones to 1..n, fixing gaps and duplicate
--     positions left by earlier non-atomic reorders, deletes, and double adds.
--   * Makes (project_id, position) unique. The constraint is DEFERRABLE
--     INITIALLY DEFERRED so a reorder can shuffle positions inside one
--     statement and only has to be unique when it commits.
--   * reorder_milestones: sets a whole project's order in one transaction.
-- =============================================================================

update public.milestones m
set position = ranked.rn
from (
  select
    id,
    row_number() over (
      partition by project_id
      order by position, created_at, id
    ) as rn
  from public.milestones
) ranked
where m.id = ranked.id
  and m.position is distinct from ranked.rn;

alter table public.milestones
  drop constraint if exists milestones_project_position_key;

alter table public.milestones
  add constraint milestones_project_position_key
  unique (project_id, position)
  deferrable initially deferred;

-- -----------------------------------------------------------------------------
-- reorder_milestones(project, ids in their new order)
--
-- SECURITY INVOKER: the caller's own RLS decides which milestones it can see
-- and update, so a freelancer can only ever reorder their own project. The
-- list must name every milestone in the project exactly once.
-- -----------------------------------------------------------------------------
create or replace function public.reorder_milestones(
  p_project_id uuid,
  p_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_ids is null or cardinality(p_ids) = 0 then
    raise exception 'Nothing to reorder.' using errcode = 'check_violation';
  end if;

  if cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) as x) then
    raise exception 'Each milestone can appear only once.' using errcode = 'check_violation';
  end if;

  select count(*) into v_count
  from public.milestones
  where project_id = p_project_id;

  if v_count = 0 or v_count <> cardinality(p_ids) then
    raise exception 'The new order must include every milestone in the project.'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from unnest(p_ids) as x
    where not exists (
      select 1 from public.milestones m
      where m.id = x and m.project_id = p_project_id
    )
  ) then
    raise exception 'That milestone is not part of this project.'
      using errcode = 'check_violation';
  end if;

  update public.milestones m
  set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where m.id = o.id
    and m.project_id = p_project_id
    and m.position is distinct from o.ord;
end;
$$;

revoke all on function public.reorder_milestones(uuid, uuid[]) from public;
grant execute on function public.reorder_milestones(uuid, uuid[]) to authenticated;
