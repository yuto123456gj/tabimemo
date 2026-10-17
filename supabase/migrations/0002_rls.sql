-- =====================================================================
-- Row Level Security
-- 原則: 「そのグループのメンバーだけが読み書きできる」
-- group_members を直接参照すると再帰するため security definer 関数を使う。
-- =====================================================================

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = auth.uid() and gm.role = 'owner'
  );
$$;

/** 自分が所属するグループのID一覧（他メンバーのプロフィール閲覧判定などに使う） */
create or replace function public.my_group_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select gm.group_id from public.group_members gm where gm.user_id = auth.uid();
$$;

create or replace function public.place_group_id(pid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.places where id = pid;
$$;

create or replace function public.trip_group_id(tid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.trips where id = tid;
$$;

create or replace function public.list_group_id(lid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.lists where id = lid;
$$;

create or replace function public.tag_group_id(tid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.tags where id = tid;
$$;

-- ---------------------------------------------------------------- enable
alter table public.profiles           enable row level security;
alter table public.groups             enable row level security;
alter table public.group_members      enable row level security;
alter table public.group_invites      enable row level security;
alter table public.places             enable row level security;
alter table public.place_reviews      enable row level security;
alter table public.lists              enable row level security;
alter table public.list_places        enable row level security;
alter table public.tags               enable row level security;
alter table public.place_tags         enable row level security;
alter table public.trips              enable row level security;
alter table public.trip_items         enable row level security;
alter table public.trip_checklist     enable row level security;
alter table public.trip_budget_items  enable row level security;

-- ---------------------------------------------------------------- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.group_members gm
      where gm.user_id = profiles.id and gm.group_id in (select public.my_group_ids())
    )
  );

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------- groups
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated
  using (public.is_group_member(id) or created_by = auth.uid());

drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update to authenticated
  using (public.is_group_owner(id)) with check (public.is_group_owner(id));

drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups for delete to authenticated
  using (public.is_group_owner(id));

-- ---------------------------------------------------------------- group_members
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select to authenticated
  using (user_id = auth.uid() or public.is_group_member(group_id));

-- グループ作成直後の「自分をownerとして登録」と、ownerによる追加を許可する。
-- 招待リンク経由の参加は accept_group_invite()（security definer）が行う。
drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members for insert to authenticated
  with check (
    public.is_group_owner(group_id)
    or (
      user_id = auth.uid()
      and exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
    )
  );

drop policy if exists group_members_update on public.group_members;
create policy group_members_update on public.group_members for update to authenticated
  using (public.is_group_owner(group_id)) with check (public.is_group_owner(group_id));

-- owner は誰でも外せる / メンバーは自分で抜けられる
drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete to authenticated
  using (public.is_group_owner(group_id) or user_id = auth.uid());

-- ---------------------------------------------------------------- group_invites
drop policy if exists group_invites_select on public.group_invites;
create policy group_invites_select on public.group_invites for select to authenticated
  using (public.is_group_member(group_id));

drop policy if exists group_invites_insert on public.group_invites;
create policy group_invites_insert on public.group_invites for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

drop policy if exists group_invites_update on public.group_invites;
create policy group_invites_update on public.group_invites for update to authenticated
  using (public.is_group_owner(group_id) or created_by = auth.uid())
  with check (public.is_group_owner(group_id) or created_by = auth.uid());

drop policy if exists group_invites_delete on public.group_invites;
create policy group_invites_delete on public.group_invites for delete to authenticated
  using (public.is_group_owner(group_id) or created_by = auth.uid());

-- ---------------------------------------------------------------- places
drop policy if exists places_all on public.places;
create policy places_all on public.places for all to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

-- ---------------------------------------------------------------- place_reviews
drop policy if exists place_reviews_select on public.place_reviews;
create policy place_reviews_select on public.place_reviews for select to authenticated
  using (public.is_group_member(public.place_group_id(place_id)));

drop policy if exists place_reviews_write on public.place_reviews;
create policy place_reviews_write on public.place_reviews for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(public.place_group_id(place_id)));

drop policy if exists place_reviews_update on public.place_reviews;
create policy place_reviews_update on public.place_reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists place_reviews_delete on public.place_reviews;
create policy place_reviews_delete on public.place_reviews for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------- lists / tags
drop policy if exists lists_all on public.lists;
create policy lists_all on public.lists for all to authenticated
  using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

drop policy if exists list_places_all on public.list_places;
create policy list_places_all on public.list_places for all to authenticated
  using (public.is_group_member(public.list_group_id(list_id)))
  with check (public.is_group_member(public.list_group_id(list_id)));

drop policy if exists tags_all on public.tags;
create policy tags_all on public.tags for all to authenticated
  using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

drop policy if exists place_tags_all on public.place_tags;
create policy place_tags_all on public.place_tags for all to authenticated
  using (public.is_group_member(public.place_group_id(place_id)))
  with check (public.is_group_member(public.place_group_id(place_id)));

-- ---------------------------------------------------------------- trips
drop policy if exists trips_all on public.trips;
create policy trips_all on public.trips for all to authenticated
  using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

drop policy if exists trip_items_all on public.trip_items;
create policy trip_items_all on public.trip_items for all to authenticated
  using (public.is_group_member(public.trip_group_id(trip_id)))
  with check (public.is_group_member(public.trip_group_id(trip_id)));

drop policy if exists trip_checklist_all on public.trip_checklist;
create policy trip_checklist_all on public.trip_checklist for all to authenticated
  using (public.is_group_member(public.trip_group_id(trip_id)))
  with check (public.is_group_member(public.trip_group_id(trip_id)));

drop policy if exists trip_budget_all on public.trip_budget_items;
create policy trip_budget_all on public.trip_budget_items for all to authenticated
  using (public.is_group_member(public.trip_group_id(trip_id)))
  with check (public.is_group_member(public.trip_group_id(trip_id)));

-- =====================================================================
-- RPC: 招待の受け入れ（RLSを緩めずに参加させるため security definer）
-- =====================================================================
create or replace function public.accept_group_invite(invite_token text)
returns table (group_id uuid, group_name text, already_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.group_invites;
  uid uuid := auth.uid();
  was_member boolean;
begin
  if uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into inv from public.group_invites gi where gi.token = invite_token;

  if inv.id is null then
    raise exception 'INVITE_NOT_FOUND';
  end if;
  if inv.revoked then
    raise exception 'INVITE_REVOKED';
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'INVITE_EXPIRED';
  end if;

  select exists (
    select 1 from public.group_members gm
    where gm.group_id = inv.group_id and gm.user_id = uid
  ) into was_member;

  insert into public.group_members (group_id, user_id, role)
  values (inv.group_id, uid, 'member')
  on conflict (group_id, user_id) do nothing;

  return query
    select g.id, g.name, was_member from public.groups g where g.id = inv.group_id;
end;
$$;

revoke all on function public.accept_group_invite(text) from public;
grant execute on function public.accept_group_invite(text) to authenticated;

-- 招待リンクを開いた時のプレビュー（ログイン前でもグループ名だけ見せる）
create or replace function public.peek_group_invite(invite_token text)
returns table (group_name text, valid boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.group_invites;
begin
  select * into inv from public.group_invites gi where gi.token = invite_token;

  if inv.id is null then
    return query select null::text, false, 'NOT_FOUND';
    return;
  end if;
  if inv.revoked then
    return query select (select name from public.groups where id = inv.group_id), false, 'REVOKED';
    return;
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    return query select (select name from public.groups where id = inv.group_id), false, 'EXPIRED';
    return;
  end if;

  return query select (select name from public.groups where id = inv.group_id), true, null::text;
end;
$$;

revoke all on function public.peek_group_invite(text) from public;
grant execute on function public.peek_group_invite(text) to anon, authenticated;

-- =====================================================================
-- RPC: 共有閲覧用のしおり取得（is_public = true のものだけ）
-- RLS は一切緩めず、この関数経由でのみ匿名公開する。
-- =====================================================================
create or replace function public.get_public_trip(share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.trips;
  result jsonb;
begin
  select * into t from public.trips tr
  where tr.public_share_token = share_token and tr.is_public = true;

  if t.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'trip', jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'start_date', t.start_date,
      'end_date', t.end_date,
      'cover_url', t.cover_url
    ),
    'items', coalesce((
      select jsonb_agg(item order by item->>'day_index', item->>'order_index')
      from (
        select jsonb_build_object(
          'id', ti.id,
          'day_index', ti.day_index,
          'order_index', ti.order_index,
          'title', coalesce(p.name, ti.custom_title),
          'address', p.address,
          'lat', p.lat,
          'lng', p.lng,
          'category', p.category,
          'photo_url', p.photo_url,
          'arrive_time', ti.arrive_time,
          'stay_minutes', ti.stay_minutes,
          'transport', ti.transport,
          'memo', ti.memo
        ) as item
        from public.trip_items ti
        left join public.places p on p.id = ti.place_id
        where ti.trip_id = t.id
      ) s
    ), '[]'::jsonb),
    'checklist', coalesce((
      select jsonb_agg(jsonb_build_object('label', c.label, 'checked', c.checked) order by c.order_index)
      from public.trip_checklist c where c.trip_id = t.id
    ), '[]'::jsonb),
    'budget', coalesce((
      select jsonb_agg(jsonb_build_object('label', b.label, 'amount', b.amount, 'category', b.category) order by b.order_index)
      from public.trip_budget_items b where b.trip_id = t.id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_public_trip(text) from public;
grant execute on function public.get_public_trip(text) to anon, authenticated;
