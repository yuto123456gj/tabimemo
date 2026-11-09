/**
 * 期間限定スポットのリマインダー（毎日1回、Vercel Cron から呼ばれる）。
 *
 *   ・営業開始日（open_from）の1週間前  → 「あと1週間で始まります」
 *   ・営業終了日（open_until）の1週間前 → 「あと1週間で終わります」
 *
 * 送り先はそのスポットのグループ全員（追加した本人も含む）。
 * cron には「ログイン中の人」がいないため、ここだけはサービスロールキーを使う。
 * 外から叩かれないよう CRON_SECRET で保護する。
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildReminderPayload, deliver, type PushTarget, type ReminderKind } from '@/lib/notify/push';
import { env, isPushConfigured } from '@/lib/env';
import { jstDatePlusDays } from '@/lib/utils/date';

/** 何日前に知らせるか */
const DAYS_AHEAD = 7;

interface TargetPlace {
  id: string;
  name: string;
  group_id: string;
  open_from: string | null;
  open_until: string | null;
}

export async function GET(request: NextRequest) {
  if (!env.cronSecret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET が未設定です' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ ok: false, error: 'VAPIDキーが未設定です' }, { status: 503 });
  }

  const targetDate = jstDatePlusDays(DAYS_AHEAD);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('places')
    .select('id, name, group_id, open_from, open_until')
    .or(`open_from.eq.${targetDate},open_until.eq.${targetDate}`);

  if (error) {
    console.error('[cron] スポットを取得できませんでした:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const places = (data ?? []) as TargetPlace[];
  // 同じグループを何度も引かないよう、送信先をキャッシュする
  const targetsByGroup = new Map<string, PushTarget[]>();
  let notified = 0;
  let skipped = 0;

  for (const place of places) {
    // 1日だけのイベント（開始日=終了日）は「始まります」だけにする
    const kind: ReminderKind = place.open_from === targetDate ? 'start' : 'end';

    // 先に記録を作る。重複（= すでに送信済み）なら何もしない
    const { error: markError } = await supabase
      .from('place_reminders')
      .insert({ place_id: place.id, kind, target_date: targetDate });

    if (markError) {
      if (markError.code !== '23505') {
        console.error('[cron] 送信記録を作れませんでした:', markError.message);
      }
      skipped += 1;
      continue;
    }

    const targets = await groupTargets(supabase, place.group_id, targetsByGroup);
    if (targets.length === 0) {
      skipped += 1;
      continue;
    }

    const payload = buildReminderPayload({
      kind,
      placeName: place.name,
      placeId: place.id,
      date: targetDate,
    });
    const { sent, dead } = await deliver(targets, payload);

    for (const endpoint of dead) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      // キャッシュからも外す（同じグループの次のスポットで送り直さない）
      targetsByGroup.set(
        place.group_id,
        (targetsByGroup.get(place.group_id) ?? []).filter((t) => t.endpoint !== endpoint),
      );
    }

    if (sent > 0) {
      notified += 1;
      continue;
    }

    // 1件も届かなかったときは記録を消して、手動の再実行でやり直せるようにする
    await supabase
      .from('place_reminders')
      .delete()
      .eq('place_id', place.id)
      .eq('kind', kind)
      .eq('target_date', targetDate);
    skipped += 1;
  }

  return NextResponse.json({ ok: true, date: targetDate, found: places.length, notified, skipped });
}

/** グループ全員（通知ONの端末すべて）の送信先 */
async function groupTargets(
  supabase: ReturnType<typeof createAdminClient>,
  groupId: string,
  cache: Map<string, PushTarget[]>,
): Promise<PushTarget[]> {
  const cached = cache.get(groupId);
  if (cached) return cached;

  const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);
  const userIds = (members ?? []).map((m) => m.user_id as string);

  if (userIds.length === 0) {
    cache.set(groupId, []);
    return [];
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .in('user_id', userIds);

  const targets = (subs ?? []) as PushTarget[];
  cache.set(groupId, targets);
  return targets;
}
