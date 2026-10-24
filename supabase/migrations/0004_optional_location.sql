-- =====================================================================
-- スポットの座標を「あとから設定」できるようにする
--
-- 名前は分かっているが地図上で見つからないお店を、先に名前だけ登録し、
-- あとから地図をタップして位置を決められるようにする。
-- =====================================================================

alter table public.places alter column lat drop not null;
alter table public.places alter column lng drop not null;

-- 片方だけ入っている中途半端な状態を防ぐ（両方そろうか、両方空か）
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'places_latlng_both_or_none'
  ) then
    alter table public.places
      add constraint places_latlng_both_or_none
      check ((lat is null) = (lng is null));
  end if;
end;
$$;

comment on column public.places.lat is '緯度。未設定（あとで地図でピンを打つ）の場合は null';
comment on column public.places.lng is '経度。未設定（あとで地図でピンを打つ）の場合は null';
