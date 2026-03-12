-- Recria a função garantindo permissões corretas
drop function if exists public.check_athlete_email(text);

create function public.check_athlete_email(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where lower(email) = lower(p_email)
  );
$$;

-- Garante acesso anônimo (página pública /beneficios)
grant execute on function public.check_athlete_email(text) to anon;
grant execute on function public.check_athlete_email(text) to authenticated;
