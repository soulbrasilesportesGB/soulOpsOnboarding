-- Adiciona controle de repasse ao parceiro (separado do recebimento do atleta)
alter table public.marketplace_transacoes
  add column status_repasse_parceiro text not null default 'pendente'
    check (status_repasse_parceiro in ('pendente', 'pago'));
