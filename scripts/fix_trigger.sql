create or replace function public.on_auth_user_created()
returns trigger as $$
begin
  insert into public.users (email, name, "identityProviderId", uuid)
  values (
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Utilizador'),
    new.id,
    new.id
  )
  on conflict (email) do update
  set "identityProviderId" = new.id;
  
  return new;
end;
$$ language plpgsql security definer;
