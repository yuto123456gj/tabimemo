-- =====================================================================
-- Tabimemo 初期スキーマ
-- 実行方法: Supabase SQL Editor に貼り付け、または `supabase db push`
-- =====================================================================

-- ---------- 共通ユーティリティ ----------

-- ランダムトークン（拡張機能に依存しないよう uuid を流用）
create or replace function public.tabimemo_token()
returns text
language sql
volatile
as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------- groups ----------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  token text not null unique default public.tabimemo_token(),
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz default (now() + interval '14 days'),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists group_invites_group_idx on public.group_invites(group_id);

-- ---------- places ----------
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  address text,
  lat double precision not null,
  lng double precision not null,
  category text,
  photo_url text,
  source_url text,
  memo text,
  planned_date date,
  status text not null default 'want' check (status in ('want', 'visited')),
  added_by uuid references auth.users(id) on delete set null,
  external_id text, -- Google Places の place_id / OSM の osm_id / Takeout の識別子
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists places_group_idx on public.places(group_id);
create index if not exists places_status_idx on public.places(group_id, status);
create unique index if not exists places_group_external_uniq
  on public.places(group_id, external_id) where external_id is not null;

drop trigger if exists places_updated_at on public.places;
create trigger places_updated_at before update on public.places
  for each row execute function public.set_updated_at();

-- メンバーごとの「行った記録」
create table if not exists public.place_reviews (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  visited_on date,
  rating smallint check (rating between 1 and 5),
  comment text,
  want_again boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, user_id)
);

drop trigger if exists place_reviews_updated_at on public.place_reviews;
create trigger place_reviews_updated_at before update on public.place_reviews
  for each row execute function public.set_updated_at();

-- ---------- リスト（多対多） ----------
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  emoji text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lists_group_idx on public.lists(group_id);

create table if not exists public.list_places (
  list_id uuid not null references public.lists(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, place_id)
);

-- ---------- タグ（多対多） ----------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (group_id, name)
);

create table if not exists public.place_tags (
  place_id uuid not null references public.places(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (place_id, tag_id)
);

-- ---------- 旅（しおり） ----------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  start_date date not null,
  end_date date not null,
  cover_url text,
  area_lat double precision,
  area_lng double precision,
  public_share_token text not null unique default public.tabimemo_token(),
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists trips_group_idx on public.trips(group_id);

create table if not exists public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_index integer not null default 0 check (day_index >= 0),
  order_index integer not null default 0,
  place_id uuid references public.places(id) on delete set null,
  custom_title text,
  arrive_time time,
  stay_minutes integer check (stay_minutes is null or stay_minutes >= 0),
  transport text,
  memo text,
  created_at timestamptz not null default now(),
  -- スポットかフリー項目のどちらかであること
  check (place_id is not null or custom_title is not null)
);
create index if not exists trip_items_trip_idx on public.trip_items(trip_id, day_index, order_index);

create table if not exists public.trip_checklist (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  checked boolean not null default false,
  assigned_to uuid references auth.users(id) on delete set null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists trip_checklist_trip_idx on public.trip_checklist(trip_id);

create table if not exists public.trip_budget_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  amount integer not null default 0,
  category text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists trip_budget_trip_idx on public.trip_budget_items(trip_id);

-- ---------- 新規ユーザーの初期化 ----------
-- サインアップ時に profile と「最初のグループ」を自動作成する。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
  nickname text;
begin
  nickname := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, 'たびびと'), '@', 1)
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, nickname, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  insert into public.groups (name, created_by)
  values ('わたしの行きたい場所', new.id)
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Realtime ----------
-- 共有相手の画面に即時反映させたいテーブルを publication に追加する。
do $$
declare
  t text;
begin
  foreach t in array array[
    'places', 'place_reviews', 'trips', 'trip_items',
    'trip_checklist', 'trip_budget_items', 'lists', 'list_places',
    'group_members', 'tags', 'place_tags'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
      when undefined_object then null; -- publication が無い環境（ローカル等）では無視
    end;
  end loop;
end;
$$;
