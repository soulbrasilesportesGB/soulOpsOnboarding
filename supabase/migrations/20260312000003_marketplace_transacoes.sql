-- Marketplace: transações manuais (repasse de comissão Soul)
create table public.marketplace_transacoes (
  id                uuid primary key default gen_random_uuid(),
  parceiro_id       uuid not null references public.marketplace_parceiros(id) on delete restrict,
  atleta_email      text,
  valor_bruto       numeric(10,2) not null check (valor_bruto >= 0),
  comissao_percent  numeric(5,2)  not null check (comissao_percent between 0 and 100),
  valor_liquido     numeric(10,2) generated always as (
                      round(valor_bruto * (1 - comissao_percent / 100.0), 2)
                    ) stored,
  status_repasse    text not null default 'pendente'
                      check (status_repasse in ('pendente', 'pago')),
  criado_em         timestamptz not null default now()
);

alter table public.marketplace_transacoes enable row level security;

-- Apenas admin gerencia transações
create policy "admin full access transacoes"
  on public.marketplace_transacoes for all
  using  ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
