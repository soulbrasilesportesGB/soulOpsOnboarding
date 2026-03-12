-- Comissão padrão Soul por parceiro
alter table public.marketplace_parceiros
  add column comissao_percent numeric(5,2) not null default 0
    check (comissao_percent between 0 and 100);

-- Quantidade e valor unitário na transação (para rastreio por sessão/unidade)
alter table public.marketplace_transacoes
  add column quantidade     integer     not null default 1 check (quantidade > 0),
  add column valor_unitario numeric(10,2);
