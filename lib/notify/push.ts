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
import { formatJaMonthDay } from '@/lib/utils/date';

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

export type ReminderKind = 'start' | 'end';

/** 期間限定スポットの「1週間前」のお知らせを組み立てる */
export function buildReminderPayload({
  kind,
  placeName,
  placeId,
  date,
}: {
  kind: ReminderKind;
  placeName: string;
  placeId: string;
  /** open_from または open_until の日付（YYYY-MM-DD） */
  date: string;
}): PushPayload {
  const name = placeName.trim() || '保存したスポット';
  const when = formatJaMonthDay(date);

  return kind === 'start'
    ? {
        title: '⏳ あと1週間で始まります',
        body: `「${name}」は${when}から。そろそろ予定を決めませんか？`,
        url: `/places/${placeId}`,
        tag: `reminder-start-${placeId}-${date}`,
      }
    : {
        title: '⏳ あと1週間で終わります',
        body: `「${name}」は${when}まで。行くなら今のうち！`,
        url: `/places/${placeId}`,
        tag: `reminder-end-${placeId}-${date}`,
      };
}

export interface PushTarget {
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

export interface DeliveryResult {
  sent: number;
  failed: number;
  /** 無効になっていた購読先（呼び出し側で削除する） */
  dead: string[];
}

/**
 * 渡された購読先すべてに1件の通知を送る。
 * 購読先の削除方法は呼び出し側（ログイン中の本人 / cron）で違うので、ここではやらない。
 */
export async function deliver(
  targets: PushTarget[],
  payload: PushPayload,
  ttlSeconds = 60 * 60 * 24,
): Promise<DeliveryResult> {
  if (targets.length === 0) return { sent: 0, failed: 0, dead: [] };

  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    targets.map((target) => webpush.sendNotification(toSubscription(target), body, { TTL: ttlSeconds })),
  );

  const out: DeliveryResult = { sent: 0, failed: 0, dead: [] };
  for (const [i, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      out.sent += 1;
      continue;
    }
    out.failed += 1;
    if (isGone(result.reason)) {
      out.dead.push(targets[i].endpoint);
    } else {
      console.error('[push] 送信に失敗しました:', (result.reason as Error)?.message ?? result.reason);
    }
  }
  return out;
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

  const { dead } = await deliver((data ?? []) as PushTarget[], payload);

  // 無効になった購読先は消しておく（次回以降むだに送らない）
  for (const endpoint of dead) {
    await supabase.rpc('prune_push_subscription', { p_endpoint: endpoint });
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

  const { sent, failed, dead } = await deliver(
    (data ?? []) as PushTarget[],
    {
      title: `${APP_NAME_JA}のテスト通知`,
      body: 'この端末に通知が届きました 🎉',
      url: '/settings',
      tag: 'tabimemo-test',
    },
    60,
  );

  for (const endpoint of dead) {
    await supabase.rpc('prune_push_subscription', { p_endpoint: endpoint });
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
