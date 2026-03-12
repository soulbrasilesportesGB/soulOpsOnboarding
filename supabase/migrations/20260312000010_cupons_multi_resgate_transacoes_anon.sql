-- Permite múltiplos resgates do mesmo benefício pelo mesmo atleta
alter table public.marketplace_cupons
  drop constraint if exists marketplace_cupons_parceiro_id_atleta_email_key;

-- Permite que a página pública crie transações automaticamente ao resgatar cupom
create policy "anon insert transacoes"
  on public.marketplace_transacoes for insert
  with check (true);
