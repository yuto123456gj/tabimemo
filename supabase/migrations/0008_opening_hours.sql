-- =====================================================================
-- スポットの営業時間・営業期間（すべて任意）
--
--  open_time / close_time : その日の営業時間（11:00〜20:00 など）
--  open_from / open_until : 営業期間（期間限定の店やイベント用）
--  hours_note             : 定休日などの補足メモ
-- =====================================================================

alter table public.places add column if not exists open_time  time;
alter table public.places add column if not exists close_time time;
alter table public.places add column if not exists open_from  date;
alter table public.places add column if not exists open_until date;
alter table public.places add column if not exists hours_note text;

-- 期間は「開始 <= 終了」であること（片方だけの指定は許す）
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'places_open_period_order') then
    alter table public.places
      add constraint places_open_period_order
      check (open_from is null or open_until is null or open_from <= open_until);
  end if;
end;
$$;

comment on column public.places.open_time  is '営業開始時刻（任意）';
comment on column public.places.close_time is '営業終了時刻（任意）。翌朝までの営業は開始より小さい値になりうる';
comment on column public.places.open_from  is '営業期間の開始日（任意・期間限定用）';
comment on column public.places.open_until is '営業期間の終了日（任意・期間限定用）';
comment on column public.places.hours_note is '定休日などの補足（任意）';
