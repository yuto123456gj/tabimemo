/**
 * Webプッシュ通知の送信（サーバー専用）。
 *
 * 「スポットが追加されたら、同じグループの他のメンバーの端末に通知を出す」ために使う。
 * 通知の失敗でアプリの操作自体が失敗してはいけないので、
 * このファイルの関数は例外を外に出さない（ログだけ残す）。
 */
import webpush, { type PushSubscription, type WebPushError } from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env, isPushConfigured } from '@/lib/env';
import { APP_NAME_JA, categoryMeta } from '@/lib/constants';

/** Service Worker（public/sw.js）が受け取るJSON。形を変えたら sw.js も直す。 */
export interface PushPayload {
  title: string;
  body: string;
  /** 通知をタップした時に開くパス */
  url: string;
  /** 同じ通知を重ねて出さないための識別子 */
  tag: string;
}

export interface PlaceAddedInput {
  actorName: string;
  placeName: string;
  placeId: string;
  category?: string | null;
}

/** 「○○さんが「△△」を追加しました」という通知の中身を組み立てる */
export function buildPlaceAddedPayload({
  actorName,
  placeName,
  placeId,
  category,
}: PlaceAddedInput): PushPayload {
  const name = placeName.trim() || '新しいスポット';
  const who = actorName.trim() || 'メンバー';
  const emoji = category ? `${categoryMeta(category).emoji} ` : '';

  return {
    title: `${emoji}行きたい場所が追加されました`,
    body: `${who}さんが「${name}」を追加しました`,
    url: `/places/${placeId}`,
    tag: `place-${placeId}`,
  };
}

interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

function toSubscription(target: PushTarget): PushSubscription {
  return {
    endpoint: target.endpoint,
    keys: { p256dh: target.p256dh, auth: target.auth_key },
  };
}

/** 購読が無効になったことを示すステータス（相手が通知を切った・アプリを消した） */
function isGone(error: unknown): boolean {
  const status = (error as WebPushError | undefined)?.statusCode;
  return status === 404 || status === 410;
}

/**
 * グループの「自分以外のメンバー」全員に通知を送る。
 * 送信先は security definer 関数経由で取得する（他人の購読は RLS では読めない）。
 */
async function sendToGroup(
  supabase: SupabaseClient,
  groupId: string,
  payload: PushPayload,
): Promise<void> {
  const { data, error } = await supabase.rpc('push_targets_for_group', { gid: groupId });

  if (error) {
    console.error('[push] 送信先を取得できませんでした:', error.message);
    return;
  }

  const targets = (data ?? []) as PushTarget[];
  if (targets.length === 0) return;

  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    targets.map((target) =>
      webpush.sendNotification(toSubscription(target), body, {
        // 相手がオフラインでも、しばらくは配信を試み続けてもらう（1日）
        TTL: 60 * 60 * 24,
      }),
    ),
  );

  // 無効になった購読先は消しておく（次回以降むだに送らない）
  const dead = results
    .map((result, i) => (result.status === 'rejected' && isGone(result.reason) ? targets[i].endpoint : null))
    .filter((endpoint): endpoint is string => endpoint !== null);

  for (const endpoint of dead) {
    await supabase.rpc('prune_push_subscription', { p_endpoint: endpoint });
  }

  for (const result of results) {
    if (result.status === 'rejected' && !isGone(result.reason)) {
      console.error('[push] 送信に失敗しました:', (result.reason as Error)?.message ?? result.reason);
    }
  }
}

/**
 * 自分の端末にテスト通知を送る（設定画面の「テスト通知」用）。
 * 相手がいないと動作確認できないため、自分宛てだけは送れるようにしている。
 */
export async function sendTestPush(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ sent: number; failed: number }> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  const targets = (data ?? []) as PushTarget[];
  if (targets.length === 0) return { sent: 0, failed: 0 };

  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  const body = JSON.stringify({
    title: `${APP_NAME_JA}のテスト通知`,
    body: 'この端末に通知が届きました 🎉',
    url: '/settings',
    tag: 'tabimemo-test',
  } satisfies PushPayload);

  const results = await Promise.allSettled(
    targets.map((target) => webpush.sendNotification(toSubscription(target), body, { TTL: 60 })),
  );

  let sent = 0;
  let failed = 0;
  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      sent += 1;
      continue;
    }
    failed += 1;
    if (isGone(result.reason)) {
      await supabase.rpc('prune_push_subscription', { p_endpoint: targets[i].endpoint });
    } else {
      console.error('[push] テスト送信に失敗しました:', (result.reason as Error)?.message ?? result.reason);
    }
  }

  return { sent, failed };
}

/**
 * スポット追加を他のメンバーに知らせる。
 * 鍵が未設定なら何もしない（通知機能OFFの状態でも普通にアプリが動くようにする）。
 */
export async function notifyPlaceAdded(
  supabase: SupabaseClient,
  input: { groupId: string; placeId: string; placeName: string; actorId: string; category?: string | null },
): Promise<void> {
  if (!isPushConfigured()) return;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', input.actorId)
      .maybeSingle();

    const payload = buildPlaceAddedPayload({
      actorName: (profile?.display_name as string | null) ?? APP_NAME_JA,
      placeName: input.placeName,
      placeId: input.placeId,
      category: input.category,
    });

    await sendToGroup(supabase, input.groupId, payload);
  } catch (error) {
    // 通知が送れなくても、スポットの保存自体は成功させる
    console.error('[push] 通知処理でエラーが発生しました:', error);
  }
}
