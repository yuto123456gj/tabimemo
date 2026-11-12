-- =====================================================================
-- カテゴリをグループごとに持てるようにする（自分で作れる／消せる）
--
-- これまでカテゴリはコードに直書きの9個だけだった。
-- グループごとのテーブルに移し、追加・削除できるようにする。
--
--  places.category には、このテーブルの value を入れる（今までと同じ文字列）。
--  カテゴリを消したときは、そのカテゴリだったスポットを null に戻す
--  （画面では「その他」として表示される。スポット自体は消えない）。
-- =====================================================================

create table if not exists public.place_categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  -- places.category に保存される文字列。標準カテゴリは 'cafe' などの英字
  value text not null,
  -- 画面に出る名前
  label text not null,
  emoji text not null default '📍',
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  unique (group_id, value)
);

create index if not exists place_categories_group_id_idx on public.place_categories (group_id);

alter table public.place_categories enable row level security;

drop policy if exists place_categories_all on public.place_categories;
create policy place_categories_all on public.place_categories for all to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- ---------------------------------------------------------------------
-- 最初から入っている9個を、グループごとに作る
-- ---------------------------------------------------------------------
create or replace function public.seed_default_categories(gid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.place_categories (group_id, value, label, emoji, sort_order)
  values
    (gid, 'restaurant',  'ごはん',       '🍽️', 0),
    (gid, 'cafe',        'カフェ',       '☕️', 1),
    (gid, 'sightseeing', '観光',         '⛩️', 2),
    (gid, 'nature',      '自然',         '🏞️', 3),
    (gid, 'shopping',    '買い物',       '🛍️', 4),
    (gid, 'hotel',       '宿',           '🛏️', 5),
    (gid, 'bar',         '居酒屋・バー', '🍶', 6),
    (gid, 'activity',    '体験',         '🎡', 7),
    (gid, 'other',       'その他',       '📍', 8)
  on conflict (group_id, value) do nothing;
$$;

-- これから作られるグループにも自動で入れる
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- すでにあるグループにも入れる
do $$
declare
  g record;
begin
  for g in select id from public.groups loop
    perform public.seed_default_categories(g.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- カテゴリの削除
--
-- そのカテゴリを使っているスポットは category を null に戻してから消す。
-- security definer にはしない（呼んだ人の権限＝RLSでそのまま守られる）。
-- ---------------------------------------------------------------------
create or replace function public.delete_place_category(p_id uuid)
returns void
language plpgsql
as $$
declare
  cat record;
begin
  select group_id, value into cat from public.place_categories where id = p_id;
  if not found then
    return;
  end if;

  update public.places set category = null
    where group_id = cat.group_id and category = cat.value;

  delete from public.place_categories where id = p_id;
end;
$$;

revoke all on function public.seed_default_categories(uuid) from public;
grant execute on function public.seed_default_categories(uuid) to authenticated;

revoke all on function public.delete_place_category(uuid) from public;
grant execute on function public.delete_place_category(uuid) to authenticated;

-- 相手の画面にもすぐ反映させる
do $$
begin
  alter publication supabase_realtime add table public.place_categories;
exception
  when duplicate_object then null;
  when undefined_object then null; -- publication が無い環境（ローカル等）では無視
end;
$$;

comment on table public.place_categories is 'グループごとのカテゴリ（自分で追加・削除できる）';
comment on column public.place_categories.value is 'places.category に保存される文字列';
comment on function public.delete_place_category(uuid) is 'カテゴリを削除し、使っていたスポットは「その他」（null）に戻す';
