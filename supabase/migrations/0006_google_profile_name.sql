-- Google OAuth stores the display name in full_name as well as name.
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
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(new.email, ''),
    nullif(trim(new.raw_user_meta_data ->> 'business_name'), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
