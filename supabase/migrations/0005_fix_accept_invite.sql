-- =====================================================================
-- 招待の受け入れが必ず失敗するバグの修正
--
-- 原因:
--   accept_group_invite は `returns table (group_id uuid, ...)` と
--   宣言していたため、戻り値の変数 group_id と group_members.group_id の
--   列名が衝突し、INSERT 文が
--     「column reference "group_id" is ambiguous」
--   で必ずエラーになっていた。
--
-- 対応:
--   戻り値を jsonb に変えて、名前の衝突そのものを無くす。
-- =====================================================================

drop function if exists public.accept_group_invite(text);

create function public.accept_group_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.group_invites;
  uid uuid := auth.uid();
  was_member boolean;
  found_name text;
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

  select g.name into found_name from public.groups g where g.id = inv.group_id;

  return jsonb_build_object(
    'group_id', inv.group_id,
    'group_name', found_name,
    'already_member', was_member
  );
end;
$$;

revoke all on function public.accept_group_invite(text) from public;
grant execute on function public.accept_group_invite(text) to authenticated;
