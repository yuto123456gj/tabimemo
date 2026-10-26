'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from './session';
import { ACTIVE_GROUP_COOKIE } from '@/lib/data/session';
import { fail, succeed, type ActionResult } from './types';

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function createGroup(formData: FormData): Promise<ActionResult<string>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return fail('グループ名を入力してください。');

  const { data: group, error } = await ctx.supabase
    .from('groups')
    .insert({ name, created_by: ctx.user.id })
    .select('id')
    .single();

  if (error || !group) return fail(error?.message ?? 'グループを作成できませんでした。');

  const { error: memberError } = await ctx.supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: ctx.user.id, role: 'owner' });

  if (memberError) return fail(memberError.message);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GROUP_COOKIE, group.id, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });

  revalidatePath('/groups');
  revalidatePath('/');
  return succeed(group.id as string);
}

export async function renameGroup(groupId: string, name: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (!name.trim()) return fail('グループ名を入力してください。');

  const { error } = await ctx.supabase.from('groups').update({ name: name.trim() }).eq('id', groupId);
  if (error) return fail(error.message);
  revalidatePath('/groups');
  return succeed();
}

/** 操作対象のグループを切り替える（Cookieに保存） */
export async function switchGroup(groupId: string): Promise<ActionResult> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GROUP_COOKIE, groupId, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
  revalidatePath('/', 'layout');
  return succeed();
}

/** 招待リンクを発行する */
export async function createInvite(groupId: string, days = 14): Promise<ActionResult<string>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await ctx.supabase
    .from('group_invites')
    .insert({ group_id: groupId, created_by: ctx.user.id, expires_at: expiresAt })
    .select('token')
    .single();

  if (error || !data) return fail(error?.message ?? '招待リンクを作成できませんでした。');
  revalidatePath('/groups');
  return succeed(data.token as string);
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('group_invites').update({ revoked: true }).eq('id', inviteId);
  if (error) return fail(error.message);
  revalidatePath('/groups');
  return succeed();
}

/** 招待リンクを受け入れる（RPC経由。RLSは緩めない） */
export async function acceptInvite(token: string): Promise<ActionResult<{ groupId: string; groupName: string }>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { data, error } = await ctx.supabase.rpc('accept_group_invite', { invite_token: token });
  if (error) {
    const messages: Record<string, string> = {
      INVITE_NOT_FOUND: 'この招待リンクは見つかりませんでした。',
      INVITE_REVOKED: 'この招待リンクは無効化されています。',
      INVITE_EXPIRED: 'この招待リンクは有効期限が切れています。',
      AUTH_REQUIRED: 'ログインが必要です。',
    };
    const key = Object.keys(messages).find((k) => error.message.includes(k));
    return fail(key ? messages[key] : error.message);
  }

  // RPC は { group_id, group_name, already_member } の jsonb を返す
  const row = (Array.isArray(data) ? data[0] : data) as
    | { group_id?: string; group_name?: string; already_member?: boolean }
    | null;

  if (!row?.group_id) return fail('グループに参加できませんでした。');

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GROUP_COOKIE, row.group_id, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });

  revalidatePath('/', 'layout');
  return succeed({ groupId: row.group_id, groupName: row.group_name ?? 'グループ' });
}

/** 合言葉を入力してグループに参加する */
export async function joinByCode(
  code: string,
): Promise<ActionResult<{ groupId: string; groupName: string; alreadyMember: boolean }>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const normalized = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (normalized.length !== 8) {
    return fail('合言葉は8文字です。入力を確認してください（ハイフンや空白は入れても大丈夫です）。');
  }

  const { data, error } = await ctx.supabase.rpc('join_group_by_code', { code: normalized });

  if (error) {
    const messages: Record<string, string> = {
      CODE_INVALID: '合言葉の形式が正しくありません。8文字で入力してください。',
      CODE_NOT_FOUND: 'その合言葉のグループは見つかりませんでした。打ち間違いがないか確認してください。',
      AUTH_REQUIRED: 'ログインが必要です。',
    };
    const key = Object.keys(messages).find((k) => error.message.includes(k));
    return fail(key ? messages[key] : error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { group_id?: string; group_name?: string; already_member?: boolean }
    | null;

  if (!row?.group_id) return fail('グループに参加できませんでした。');

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_GROUP_COOKIE, row.group_id, { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });

  revalidatePath('/', 'layout');
  return succeed({
    groupId: row.group_id,
    groupName: row.group_name ?? 'グループ',
    alreadyMember: Boolean(row.already_member),
  });
}

/** 合言葉を作り直す（漏れた時用。オーナーのみ） */
export async function regenerateJoinCode(groupId: string): Promise<ActionResult<string>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { data, error } = await ctx.supabase.rpc('regenerate_join_code', { target_group_id: groupId });
  if (error) {
    if (error.message.includes('NOT_OWNER')) return fail('合言葉を作り直せるのはオーナーだけです。');
    return fail(error.message);
  }

  const row = (Array.isArray(data) ? data[0] : data) as { join_code?: string } | null;
  revalidatePath('/groups');
  return succeed(row?.join_code ?? '');
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  // 最後の1人が抜けると、中のスポットやしおりに誰もアクセスできなくなる。
  // 取り残しを防ぐため、最後のメンバーは抜けられないようにする。
  const { data: members } = await ctx.supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if ((members?.length ?? 0) <= 1) {
    return fail(
      'あなたが最後のメンバーのため、このグループからは抜けられません。' +
        '中のスポットやしおりが誰からも見られなくなってしまうためです。' +
        '不要な場合は、先に他のメンバーを招待するか、グループごと削除してください。',
    );
  }

  const { error } = await ctx.supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', ctx.user.id);

  if (error) return fail(error.message);

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_GROUP_COOKIE)?.value === groupId) {
    cookieStore.delete(ACTIVE_GROUP_COOKIE);
  }
  revalidatePath('/groups');
  return succeed();
}

/** グループごと削除する（中のスポット・しおりも一緒に消える） */
export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('groups').delete().eq('id', groupId);
  if (error) return fail(error.message);

  const cookieStore = await cookies();
  if (cookieStore.get(ACTIVE_GROUP_COOKIE)?.value === groupId) {
    cookieStore.delete(ACTIVE_GROUP_COOKIE);
  }
  revalidatePath('/groups');
  revalidatePath('/', 'layout');
  return succeed();
}

export async function removeMember(groupId: string, userId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) return fail(error.message);
  revalidatePath('/groups');
  return succeed();
}

export async function updateDisplayName(name: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (!name.trim()) return fail('表示名を入力してください。');

  const { error } = await ctx.supabase
    .from('profiles')
    .upsert({ id: ctx.user.id, display_name: name.trim() }, { onConflict: 'id' });

  if (error) return fail(error.message);
  revalidatePath('/settings');
  return succeed();
}

/** 招待リンクを開いた直後の遷移用 */
export async function acceptInviteAndGo(token: string) {
  const result = await acceptInvite(token);
  if (result.ok) redirect('/places');
  return result;
}
