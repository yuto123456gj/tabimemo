-- =====================================================================
-- 「合言葉」でグループに参加できるようにする
--
-- 招待リンクはログインのリダイレクトを挟むため失敗しやすい。
-- ログイン後にアプリ内で合言葉を打つだけ、という経路を用意する。
-- =====================================================================

-- 紛らわしい文字（0/O/1/I）を除いた8文字の合言葉を作る
create or replace function public.generate_join_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

alter table public.groups add column if not exists join_code text;

-- 既存グループに合言葉を割り当てる（重複したら引き直す）
do $$
declare
  g record;
  candidate text;
begin
  for g in select id from public.groups where join_code is null loop
    loop
      candidate := public.generate_join_code();
      exit when not exists (select 1 from public.groups where join_code = candidate);
    end loop;
    update public.groups set join_code = candidate where id = g.id;
  end loop;
end;
$$;

create unique index if not exists groups_join_code_uniq on public.groups(join_code);
alter table public.groups alter column join_code set default public.generate_join_code();
alter table public.groups alter column join_code set not null;

-- ---------------------------------------------------------------------
-- 合言葉で参加する
-- 入力の大文字小文字やハイフン・空白のゆらぎを吸収する。
-- ---------------------------------------------------------------------
create or replace function public.join_group_by_code(code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  normalized text;
  target public.groups;
  was_member boolean;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- 英数字以外を取り除き、大文字にそろえる（"abcd-2345" でも通る）
  normalized := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));

  if char_length(normalized) <> 8 then
    raise exception 'CODE_INVALID';
  end if;

  select * into target from public.groups g where g.join_code = normalized;

  if target.id is null then
    raise exception 'CODE_NOT_FOUND';
  end if;

  select exists (
    select 1 from public.group_members gm
    where gm.group_id = target.id and gm.user_id = uid
  ) into was_member;

  insert into public.group_members (group_id, user_id, role)
  values (target.id, uid, 'member')
  on conflict (group_id, user_id) do nothing;

  return jsonb_build_object(
    'group_id', target.id,
    'group_name', target.name,
    'already_member', was_member
  );
end;
$$;

revoke all on function public.join_group_by_code(text) from public;
grant execute on function public.join_group_by_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- 合言葉を作り直す（漏れてしまった時用。オーナーのみ）
-- ---------------------------------------------------------------------
create or replace function public.regenerate_join_code(target_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  candidate text;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group_id and gm.user_id = uid and gm.role = 'owner'
  ) then
    raise exception 'NOT_OWNER';
  end if;

  loop
    candidate := public.generate_join_code();
    exit when not exists (select 1 from public.groups where join_code = candidate);
  end loop;

  update public.groups set join_code = candidate where id = target_group_id;

  return jsonb_build_object('join_code', candidate);
end;
$$;

revoke all on function public.regenerate_join_code(uuid) from public;
grant execute on function public.regenerate_join_code(uuid) to authenticated;
