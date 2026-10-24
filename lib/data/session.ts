import { cache } from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { Group, Profile } from '@/types/database';

export const ACTIVE_GROUP_COOKIE = 'tabimemo_group';

export interface GroupWithRole extends Group {
  role: string;
  member_count: number;
}

export const getCurrentUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  // トリガーが未実行だった場合に備えてフォールバックを返す
  return (
    (data as Profile | null) ?? {
      id: user.id,
      display_name: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? 'たびびと',
      avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
      created_at: user.created_at,
    }
  );
});

/**
 * 自分が所属するグループ（メンバー数つき）。
 * 1リクエスト中に何度呼んでも、実際の問い合わせは1回だけになる（React cache）。
 */
export const getMyGroups = cache(async (): Promise<GroupWithRole[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('group_members')
    .select('role, groups(id, name, created_by, created_at)')
    .eq('user_id', user.id);

  if (error || !data) return [];

  const groups = data
    .map((row) => {
      const group = row.groups as unknown as Group | null;
      if (!group) return null;
      return { ...group, role: row.role as string, member_count: 0 } satisfies GroupWithRole;
    })
    .filter((g): g is GroupWithRole => g !== null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (groups.length === 0) return [];

  // メンバー数をまとめて取る
  const { data: members } = await supabase
    .from('group_members')
    .select('group_id')
    .in(
      'group_id',
      groups.map((g) => g.id),
    );

  if (members) {
    const counts = new Map<string, number>();
    for (const m of members as { group_id: string }[]) {
      counts.set(m.group_id, (counts.get(m.group_id) ?? 0) + 1);
    }
    for (const g of groups) g.member_count = counts.get(g.id) ?? 1;
  }

  return groups;
});

/**
 * いま操作対象になっているグループ。
 * Cookie に保存された選択を優先し、無ければ最初のグループ。
 */
export const getActiveGroup = cache(async (): Promise<GroupWithRole | null> => {
  const groups = await getMyGroups();
  if (groups.length === 0) return null;

  const cookieStore = await cookies();
  const selected = cookieStore.get(ACTIVE_GROUP_COOKIE)?.value;
  return groups.find((g) => g.id === selected) ?? groups[0];
});

/** ページ側で「ログイン済み + グループあり」を前提にしたい時に使う */
export async function requireContext() {
  const user = await getCurrentUser();
  const group = user ? await getActiveGroup() : null;
  return { user, group };
}

/** グループのメンバー一覧（誰が追加したかの表示に使う） */
export async function getGroupMembers(groupId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();

  // group_members.user_id は auth.users を参照しているため profiles を直接
  // 埋め込めない（外部キーが無くクエリ全体がエラーになる）。2回に分けて取る。
  const { data: members, error } = await supabase
    .from('group_members')
    .select('user_id, role, created_at')
    .eq('group_id', groupId);

  if (error || !members) {
    if (error) console.error('[getGroupMembers] 取得に失敗しました:', error.message);
    return [];
  }

  const ids = members.map((m) => m.user_id as string);
  const { data: profiles } = ids.length
    ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids)
    : { data: [] };

  const byId = new Map(
    ((profiles ?? []) as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[]).map((p) => [p.id, p]),
  );

  return members.map((row) => {
    const profile = byId.get(row.user_id as string);
    return {
      user_id: row.user_id as string,
      role: row.role as string,
      created_at: row.created_at as string,
      display_name: profile?.display_name ?? 'メンバー',
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}
