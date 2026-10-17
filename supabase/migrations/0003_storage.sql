-- =====================================================================
-- Storage: スポット写真 / しおりカバー画像
-- 画像は公開読み取り（URLを知っている人は見られる）、書き込みはログイン必須。
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

drop policy if exists "place photos are readable" on storage.objects;
create policy "place photos are readable" on storage.objects for select
  using (bucket_id = 'place-photos');

drop policy if exists "place photos insert by owner" on storage.objects;
create policy "place photos insert by owner" on storage.objects for insert to authenticated
  with check (bucket_id = 'place-photos' and owner = auth.uid());

drop policy if exists "place photos update by owner" on storage.objects;
create policy "place photos update by owner" on storage.objects for update to authenticated
  using (bucket_id = 'place-photos' and owner = auth.uid());

drop policy if exists "place photos delete by owner" on storage.objects;
create policy "place photos delete by owner" on storage.objects for delete to authenticated
  using (bucket_id = 'place-photos' and owner = auth.uid());
