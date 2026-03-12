-- Marketplace: parceiros/prestadores de serviço
create table public.marketplace_parceiros (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,
  categoria             text not null check (categoria in (
                          'Saúde e Performance',
                          'Equipamentos e Suplementos',
                          'Estilo de Vida e Logística',
                          'Mentorias Soul'
                        )),
  descricao             text,
  beneficio             text,
  contato               text,
  logo_url              text,
  registro_profissional text,
  ativo                 boolean not null default true,
  criado_em             timestamptz not null default now()
);

alter table public.marketplace_parceiros enable row level security;

-- Leitura pública: apenas parceiros ativos (página /beneficios)
create policy "public read active parceiros"
  on public.marketplace_parceiros for select
  using (ativo = true);

-- Admin gerencia tudo
create policy "admin full access parceiros"
  on public.marketplace_parceiros for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
