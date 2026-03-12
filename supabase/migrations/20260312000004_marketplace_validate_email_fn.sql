-- Função pública (SECURITY DEFINER) para validar e-mail de atleta Soul
-- sem expor dados da tabela users para usuários anônimos.
create or replace function public.check_athlete_email(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users where lower(email) = lower(p_email)
  );
$$;

-- Permite chamada anônima (página pública /beneficios)
grant execute on function public.check_athlete_email(text) to anon;
