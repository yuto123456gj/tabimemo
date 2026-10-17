'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from './session';
import { fail, succeed, type ActionResult } from './types';

export interface TripInput {
  groupId: string;
  title: string;
  startDate: string;
  endDate: string;
  coverUrl?: string | null;
  areaLat?: number | null;
  areaLng?: number | null;
}

export async function createTrip(input: TripInput): Promise<ActionResult<string>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  if (!input.title?.trim()) return fail('旅行のタイトルを入力してください。');
  if (!input.startDate || !input.endDate) return fail('期間を入力してください。');
  if (input.endDate < input.startDate) return fail('終了日は開始日より後にしてください。');

  const { data, error } = await ctx.supabase
    .from('trips')
    .insert({
      group_id: input.groupId,
      title: input.title.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
      cover_url: input.coverUrl ?? null,
      area_lat: input.areaLat ?? null,
      area_lng: input.areaLng ?? null,
      created_by: ctx.user.id,
    })
    .select('id')
    .single();

  if (error || !data) return fail(error?.message ?? '旅行を作成できませんでした。');
  revalidatePath('/trips');
  revalidatePath('/');
  return succeed(data.id as string);
}

export async function updateTrip(
  tripId: string,
  patch: Partial<{
    title: string;
    start_date: string;
    end_date: string;
    cover_url: string | null;
    is_public: boolean;
    area_lat: number | null;
    area_lng: number | null;
  }>,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('trips').update(patch).eq('id', tripId);
  if (error) return fail(error.message);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath('/trips');
  return succeed();
}

export async function deleteTrip(tripId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('trips').delete().eq('id', tripId);
  if (error) return fail(error.message);
  revalidatePath('/trips');
  return succeed();
}

/** 共有閲覧ページのON/OFF */
export async function toggleTripPublic(tripId: string, isPublic: boolean): Promise<ActionResult> {
  return updateTrip(tripId, { is_public: isPublic });
}

export interface TripItemInput {
  tripId: string;
  dayIndex: number;
  placeId?: string | null;
  customTitle?: string | null;
  arriveTime?: string | null;
  stayMinutes?: number | null;
  transport?: string | null;
  memo?: string | null;
}

export async function addTripItem(input: TripItemInput): Promise<ActionResult<string>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (!input.placeId && !input.customTitle?.trim()) return fail('スポットを選ぶか、項目名を入力してください。');

  // その日の末尾に追加する
  const { data: last } = await ctx.supabase
    .from('trip_items')
    .select('order_index')
    .eq('trip_id', input.tripId)
    .eq('day_index', input.dayIndex)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex = ((last?.order_index as number | undefined) ?? -1) + 1;

  const { data, error } = await ctx.supabase
    .from('trip_items')
    .insert({
      trip_id: input.tripId,
      day_index: input.dayIndex,
      order_index: nextIndex,
      place_id: input.placeId ?? null,
      custom_title: input.customTitle?.trim() || null,
      arrive_time: input.arriveTime || null,
      stay_minutes: input.stayMinutes ?? null,
      transport: input.transport ?? null,
      memo: input.memo ?? null,
    })
    .select('id')
    .single();

  if (error || !data) return fail(error?.message ?? '追加できませんでした。');
  revalidatePath(`/trips/${input.tripId}`);
  return succeed(data.id as string);
}

/** 複数スポットを一度に日程へ入れる */
export async function addTripItems(
  tripId: string,
  dayIndex: number,
  placeIds: string[],
): Promise<ActionResult<number>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (placeIds.length === 0) return fail('スポットを選んでください。');

  const { data: last } = await ctx.supabase
    .from('trip_items')
    .select('order_index')
    .eq('trip_id', tripId)
    .eq('day_index', dayIndex)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextIndex = ((last?.order_index as number | undefined) ?? -1) + 1;

  const rows = placeIds.map((placeId) => ({
    trip_id: tripId,
    day_index: dayIndex,
    order_index: nextIndex++,
    place_id: placeId,
    stay_minutes: 60,
    transport: 'walk',
  }));

  const { error } = await ctx.supabase.from('trip_items').insert(rows);
  if (error) return fail(error.message);
  revalidatePath(`/trips/${tripId}`);
  return succeed(rows.length);
}

export async function updateTripItem(
  itemId: string,
  tripId: string,
  patch: Partial<{
    day_index: number;
    order_index: number;
    arrive_time: string | null;
    stay_minutes: number | null;
    transport: string | null;
    memo: string | null;
    custom_title: string | null;
  }>,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const clean = { ...patch };
  if (clean.arrive_time === '') clean.arrive_time = null;

  const { error } = await ctx.supabase.from('trip_items').update(clean).eq('id', itemId);
  if (error) return fail(error.message);
  revalidatePath(`/trips/${tripId}`);
  return succeed();
}

export async function deleteTripItem(itemId: string, tripId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('trip_items').delete().eq('id', itemId);
  if (error) return fail(error.message);
  revalidatePath(`/trips/${tripId}`);
  return succeed();
}

/**
 * 並び替えの一括保存（ドラッグ&ドロップ、日をまたぐ移動、ルート最適化の確定で使う）。
 */
export async function reorderTripItems(
  tripId: string,
  updates: Array<{ id: string; dayIndex: number; orderIndex: number }>,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (updates.length === 0) return succeed();

  // upsert だと必須列が必要になるため、1件ずつ更新する（1日分なので件数は少ない）
  const results = await Promise.all(
    updates.map((u) =>
      ctx.supabase
        .from('trip_items')
        .update({ day_index: u.dayIndex, order_index: u.orderIndex })
        .eq('id', u.id)
        .eq('trip_id', tripId),
    ),
  );

  const firstError = results.find((r) => r.error)?.error;
  if (firstError) return fail(firstError.message);

  revalidatePath(`/trips/${tripId}`);
  return succeed();
}

/** 旅行が終わったら、しおりのスポットを一括で「行った！」にする */
export async function markTripPlacesVisited(tripId: string): Promise<ActionResult<number>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { data: items } = await ctx.supabase
    .from('trip_items')
    .select('place_id')
    .eq('trip_id', tripId)
    .not('place_id', 'is', null);

  const placeIds = Array.from(
    new Set(((items ?? []) as { place_id: string | null }[]).map((i) => i.place_id).filter((id): id is string => !!id)),
  );

  if (placeIds.length === 0) return fail('しおりに登録されたスポットがありません。');

  const { error } = await ctx.supabase.from('places').update({ status: 'visited' }).in('id', placeIds);
  if (error) return fail(error.message);

  revalidatePath('/places');
  revalidatePath(`/trips/${tripId}`);
  return succeed(placeIds.length);
}

// ---------------- 持ち物チェックリスト ----------------

export async function addChecklistItem(tripId: string, label: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (!label.trim()) return fail('持ち物を入力してください。');

  const { data: last } = await ctx.supabase
    .from('trip_checklist')
    .select('order_index')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await ctx.supabase.from('trip_checklist').insert({
    trip_id: tripId,
    label: label.trim(),
    order_index: ((last?.order_index as number | undefined) ?? -1) + 1,
  });

  if (error) return fail(error.message);
  revalidatePath(`/trips/${tripId}`);
  return succeed();
}

export async function toggleChecklistItem(itemId: string, tripId: string, checked: boolean): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('trip_checklist').update({ checked }).eq('id', itemId);
  if (error) return fail(error.message);
  revalidatePath(`/trips/${tripId}`);
  return succeed();
}

export async function deleteChecklistItem(itemId: string, tripId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('trip_checklist').delete().eq('id', itemId);
  if (error) return fail(error.message);
  revalidatePath(`/trips/${tripId}`);
  return succeed();
}

// ---------------- 予算メモ ----------------

export async function addBudgetItem(
  tripId: string,
  label: string,
  amount: number,
  category?: string | null,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (!label.trim()) return fail('項目名を入力してください。');
  if (!Number.isFinite(amount)) return fail('金額を数字で入力してください。');

  const { data: last } = await ctx.supabase
    .from('trip_budget_items')
    .select('order_index')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await ctx.supabase.from('trip_budget_items').insert({
    trip_id: tripId,
    label: label.trim(),
    amount: Math.round(amount),
    category: category ?? null,
    order_index: ((last?.order_index as number | undefined) ?? -1) + 1,
  });

  if (error) return fail(error.message);
  revalidatePath(`/trips/${tripId}`);
  return succeed();
}

export async function deleteBudgetItem(itemId: string, tripId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('trip_budget_items').delete().eq('id', itemId);
  if (error) return fail(error.message);
  revalidatePath(`/trips/${tripId}`);
  return succeed();
}
