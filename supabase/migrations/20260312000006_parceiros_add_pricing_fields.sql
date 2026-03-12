-- Novos campos de precificação, modalidade e controle financeiro
alter table public.marketplace_parceiros
  add column valor_original    numeric(10,2),
  add column valor_unidade     text,                          -- ex: 'sessão', 'mês', 'hora'
  add column desconto_tipo     text
    check (desconto_tipo in ('percent', 'valor')),
  add column desconto_valor    numeric(10,2),
  add column modalidade        text
    check (modalidade in ('presencial', 'online', 'híbrido')),
  add column cidade_estado     text,                          -- para presenciais
  add column mensalidade_valor numeric(10,2),
  add column mensalidade_status text not null default 'ativo'
    check (mensalidade_status in ('ativo', 'pendente', 'inadimplente')),
  add column link_agendamento  text;                          -- admin-only (Calendly, WA, site)
