-- =====================================================================
-- Webプッシュ通知の購読先（端末ごとに1行）
--
-- ブラウザが発行する購読情報（endpoint + 暗号鍵2つ）を保存する。
-- 「スポットが追加されたら、同じグループの他のメンバーに通知する」ために使う。
-- 通知のON/OFFは、この行があるかどうかで表す（端末ごとに切り替わる）。
--
-- 他人の購読先は RLS で読めないので、送信に必要な分だけを
-- security definer 関数（push_targets_for_group）経由で取り出す。
-- =====================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- プッシュサービスのURL。端末・ブラウザごとに固有で、これが購読の識別子になる
  endpoint text not null unique,
  -- 本文を暗号化するための鍵（ブラウザから渡されたものをそのまま保存する）
  p256dh text not null,
  -- ブラウザが返す "auth" の値。列名を auth にすると SQL 内で auth スキーマと
  -- 紛らわしくなるため auth_key という名前にしている
  auth_key text not null,
  -- 「どの端末か」を設定画面に出すための控え（任意）
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- 自分の購読だけを読み書きできる
drop policy if exists push_subscriptions_select_self on public.push_subscriptions;
create policy push_subscriptions_select_self on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert_self on public.push_subscriptions;
create policy push_subscriptions_insert_self on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_update_self on public.push_subscriptions;
create policy push_subscriptions_update_self on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_delete_self on public.push_subscriptions;
create policy push_subscriptions_delete_self on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 購読の登録
--
-- 同じ端末を別のアカウントで使うと endpoint が重複しうる。
-- endpoint は「いま購読したアカウント」のものなので、古い行は消して入れ直す。
-- （RLS だけでは他人名義の行を上書きできないため関数にする）
-- ---------------------------------------------------------------------
create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'ログインが必要です';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
end;
$$;

-- ---------------------------------------------------------------------
-- 送信先の取り出し
--
-- 呼び出した人が属するグループに限り、「自分以外のメンバー」の購読先を返す。
-- 購読情報が漏れても VAPID の秘密鍵が無ければ通知は送れないため、
-- サービスロールキーを本番に置かずに済むこちらの方式を採る。
-- ---------------------------------------------------------------------
create or replace function public.push_targets_for_group(gid uuid)
returns table (endpoint text, p256dh text, auth_key text)
language sql
stable
security definer
set search_path = public
as $$
  select ps.endpoint, ps.p256dh, ps.auth_key
  from public.push_subscriptions ps
  join public.group_members gm on gm.user_id = ps.user_id
  where gm.group_id = gid
    and ps.user_id <> auth.uid()
    and public.is_group_member(gid);
$$;

-- ---------------------------------------------------------------------
-- 無効になった購読の削除
--
-- 相手が通知を切る・アプリを消すと、プッシュサービスが 404/410 を返す。
-- 他人の行なので RLS では消せないため、
-- 「自分の購読」または「同じグループのメンバーの購読」だけを消せる関数にする。
-- ---------------------------------------------------------------------
create or replace function public.prune_push_subscription(p_endpoint text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.push_subscriptions ps
  where ps.endpoint = p_endpoint
    and (
      ps.user_id = auth.uid()
      or exists (
        select 1
        from public.group_members mine
        join public.group_members theirs on theirs.group_id = mine.group_id
        where mine.user_id = auth.uid()
          and theirs.user_id = ps.user_id
      )
    );
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

revoke all on function public.push_targets_for_group(uuid) from public;
grant execute on function public.push_targets_for_group(uuid) to authenticated;

revoke all on function public.prune_push_subscription(text) from public;
grant execute on function public.prune_push_subscription(text) to authenticated;

comment on table public.push_subscriptions is 'Webプッシュの購読先（端末ごと）。通知のON/OFFは行の有無で表す';
comment on function public.save_push_subscription(text, text, text, text) is '購読を登録する（同じendpointの古い行は置き換える）';
comment on function public.push_targets_for_group(uuid) is '同じグループの「自分以外」の購読先を返す（通知送信用）';
comment on function public.prune_push_subscription(text) is '無効になった購読先を1件削除する';
