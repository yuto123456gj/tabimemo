-- =====================================================================
-- 期間限定スポットのリマインダー送信記録
--
-- 毎日1回、cron（/api/cron/reminders）が
--   ・営業開始日（open_from）の1週間前
--   ・営業終了日（open_until）の1週間前
-- にあたるスポットを探して、グループ全員に通知する。
--
-- このテーブルは「もう送ったか」の記録。主キーで重複送信を防ぐ。
-- 書き込むのは cron（サービスロール）だけなので、ポリシーは作らない
-- （RLS有効 + ポリシー無し = 一般ユーザーからは読み書きできない）。
-- =====================================================================

create table if not exists public.place_reminders (
  place_id uuid not null references public.places(id) on delete cascade,
  -- 'start' = 開始1週間前のお知らせ / 'end' = 終了1週間前のお知らせ
  kind text not null check (kind in ('start', 'end')),
  -- 通知の対象になった日付（open_from / open_until の値）
  target_date date not null,
  sent_at timestamptz not null default now(),
  primary key (place_id, kind, target_date)
);

alter table public.place_reminders enable row level security;

comment on table public.place_reminders is '期間限定スポットのリマインダー送信記録（重複送信の防止用）';
