-- Bucket público para logos dos parceiros
insert into storage.buckets (id, name, public)
values ('marketplace-logos', 'marketplace-logos', true)
on conflict (id) do nothing;

-- Leitura pública
create policy "public read marketplace logos"
  on storage.objects for select
  using (bucket_id = 'marketplace-logos');

-- Admin faz upload e atualização
create policy "admin upload marketplace logos"
  on storage.objects for insert
  with check (
    bucket_id = 'marketplace-logos'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "admin update marketplace logos"
  on storage.objects for update
  using (
    bucket_id = 'marketplace-logos'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "admin delete marketplace logos"
  on storage.objects for delete
  using (
    bucket_id = 'marketplace-logos'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
