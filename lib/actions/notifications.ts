'use server';

import { requireUser } from './session';
import { fail, succeed, type ActionResult } from './types';
import { isPushConfigured } from '@/lib/env';
import { sendTestPush } from '@/lib/notify/push';

export interface PushSubscriptionInput {
  /** プッシュサービスのURL（購読の識別子） */
  endpoint: string;
  /** 本文を暗号化するための公開鍵 */
  p256dh: string;
  /** 本文を暗号化するための認証シークレット */
  auth: string;
  userAgent?: string | null;
}

/** この端末を通知先として登録する（通知ON） */
export async function savePushSubscription(input: PushSubscriptionInput): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  if (!isPushConfigured()) {
    return fail('このサイトでは通知がまだ設定されていません（VAPIDキーが未設定です）。');
  }
  if (!input.endpoint || !input.p256dh || !input.auth) {
    return fail('通知の登録情報が足りませんでした。もう一度お試しください。');
  }

  const { error } = await ctx.supabase.rpc('save_push_subscription', {
    p_endpoint: input.endpoint,
    p_p256dh: input.p256dh,
    p_auth: input.auth,
    p_user_agent: input.userAgent ?? null,
  });

  if (error) {
    console.error('[push] 購読を保存できませんでした:', error.message);
    return fail('通知の登録に失敗しました。時間をおいてもう一度お試しください。');
  }

  return succeed();
}

/** この端末を通知先から外す（通知OFF） */
export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (!endpoint) return fail('解除する通知先が分かりませんでした。');

  const { error } = await ctx.supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', ctx.user.id);

  if (error) {
    console.error('[push] 購読を削除できませんでした:', error.message);
    return fail('通知の解除に失敗しました。時間をおいてもう一度お試しください。');
  }

  return succeed();
}

/**
 * 自分の端末に通知を送って、ちゃんと届くか確かめる。
 * （相手の追加を待たずに設定を確認できるようにするため）
 */
export async function sendTestNotification(): Promise<ActionResult<number>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  if (!isPushConfigured()) {
    return fail('このサイトでは通知がまだ設定されていません（VAPIDキーが未設定です）。');
  }

  try {
    const { sent, failed } = await sendTestPush(ctx.supabase, ctx.user.id);
    if (sent === 0 && failed === 0) {
      return fail('この端末はまだ通知先として登録されていません。通知をONにしてからお試しください。');
    }
    if (sent === 0) {
      return fail('通知を送れませんでした。通知を一度OFFにして、もう一度ONにしてみてください。');
    }
    return succeed(sent);
  } catch (error) {
    console.error('[push] テスト通知に失敗しました:', error);
    return fail('通知の送信に失敗しました。時間をおいてもう一度お試しください。');
  }
}
