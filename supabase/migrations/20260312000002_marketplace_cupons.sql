-- Marketplace: cupons gerados por atletas
create table public.marketplace_cupons (
  id            uuid primary key default gen_random_uuid(),
  parceiro_id   uuid not null references public.marketplace_parceiros(id) on delete cascade,
  atleta_email  text,
  atleta_cpf    text,
  codigo        text not null unique,
  criado_em     timestamptz not null default now(),

  -- 1 cupom por atleta (email) por parceiro
  unique (parceiro_id, atleta_email),
  -- 1 cupom por atleta (CPF) por parceiro
  unique (parceiro_id, atleta_cpf)
);

alter table public.marketplace_cupons enable row level security;

-- Insert aberto: validação de usuário Soul feita no componente React antes do insert
create policy "public insert cupons"
  on public.marketplace_cupons for insert
  with check (true);

-- Admin lê todos os cupons
create policy "admin read cupons"
  on public.marketplace_cupons for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
