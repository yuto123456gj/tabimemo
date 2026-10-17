import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { Group, Profile } from '@/types/database';

export const ACTIVE_GROUP_COOKIE = 'tabimemo_group';

export interface GroupWithRole extends Group {
  role: string;
  member_count: number;
}

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
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
}

/** 自分が所属するグループ（メンバー数つき） */
export async function getMyGroups(): Promise<GroupWithRole[]> {
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
}

/**
 * いま操作対象になっているグループ。
 * Cookie に保存された選択を優先し、無ければ最初のグループ。
 */
export async function getActiveGroup(): Promise<GroupWithRole | null> {
  const groups = await getMyGroups();
  if (groups.length === 0) return null;

  const cookieStore = await cookies();
  const selected = cookieStore.get(ACTIVE_GROUP_COOKIE)?.value;
  return groups.find((g) => g.id === selected) ?? groups[0];
}

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
  const { data } = await supabase
    .from('group_members')
    .select('user_id, role, created_at, profiles(id, display_name, avatar_url)')
    .eq('group_id', groupId);

  return (data ?? []).map((row) => {
    const profile = row.profiles as unknown as Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
    return {
      user_id: row.user_id as string,
      role: row.role as string,
      created_at: row.created_at as string,
      display_name: profile?.display_name ?? 'メンバー',
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}
