'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from './session';
import { fail, succeed, type ActionResult } from './types';

export interface PlaceInput {
  groupId: string;
  name: string;
  address?: string | null;
  /** 地図で見つからなかった場合は null のまま保存し、あとから設定できる */
  lat?: number | null;
  lng?: number | null;
  category?: string | null;
  photoUrl?: string | null;
  sourceUrl?: string | null;
  memo?: string | null;
  plannedDate?: string | null;
  externalId?: string | null;
  tags?: string[];
  listIds?: string[];
}

/** タグ名を解決（なければ作る）してIDを返す */
async function resolveTagIds(
  supabase: SupabaseClient,
  groupId: string,
  names: string[],
): Promise<string[]> {
  const clean = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean))).slice(0, 10);
  if (clean.length === 0) return [];

  const { data: existing } = await supabase.from('tags').select('id, name').eq('group_id', groupId).in('name', clean);
  const found = new Map((existing ?? []).map((t) => [t.name as string, t.id as string]));

  const missing = clean.filter((n) => !found.has(n));
  if (missing.length > 0) {
    const { data: inserted } = await supabase
      .from('tags')
      .upsert(
        missing.map((name) => ({ group_id: groupId, name })),
        { onConflict: 'group_id,name' },
      )
      .select('id, name');
    for (const t of inserted ?? []) found.set(t.name as string, t.id as string);
  }

  return clean.map((n) => found.get(n)).filter((id): id is string => Boolean(id));
}

export async function createPlace(input: PlaceInput): Promise<ActionResult<string>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  if (!input.name?.trim()) return fail('スポット名を入力してください。');

  // 座標は「両方そろう」か「両方空」のどちらか
  const hasLat = typeof input.lat === 'number' && Number.isFinite(input.lat);
  const hasLng = typeof input.lng === 'number' && Number.isFinite(input.lng);
  if (hasLat !== hasLng) return fail('位置の指定が不完全です。もう一度地図を選び直してください。');

  const { data, error } = await ctx.supabase
    .from('places')
    .insert({
      group_id: input.groupId,
      name: input.name.trim(),
      address: input.address ?? null,
      lat: hasLat ? input.lat : null,
      lng: hasLng ? input.lng : null,
      category: input.category ?? null,
      photo_url: input.photoUrl ?? null,
      source_url: input.sourceUrl ?? null,
      memo: input.memo ?? null,
      planned_date: input.plannedDate || null,
      external_id: input.externalId ?? null,
      added_by: ctx.user.id,
      status: 'want',
    })
    .select('id')
    .single();

  if (error || !data) return fail(error?.message ?? 'スポットを保存できませんでした。');
  const placeId = data.id as string;

  if (input.tags?.length) {
    const tagIds = await resolveTagIds(ctx.supabase, input.groupId, input.tags);
    if (tagIds.length > 0) {
      await ctx.supabase.from('place_tags').upsert(
        tagIds.map((tag_id) => ({ place_id: placeId, tag_id })),
        { onConflict: 'place_id,tag_id' },
      );
    }
  }

  if (input.listIds?.length) {
    await ctx.supabase.from('list_places').upsert(
      input.listIds.map((list_id) => ({ list_id, place_id: placeId })),
      { onConflict: 'list_id,place_id' },
    );
  }

  revalidatePath('/places');
  revalidatePath('/');
  return succeed(placeId);
}

export async function updatePlace(
  placeId: string,
  patch: Partial<{
    name: string;
    address: string | null;
    category: string | null;
    memo: string | null;
    planned_date: string | null;
    photo_url: string | null;
    source_url: string | null;
    status: 'want' | 'visited';
    lat: number | null;
    lng: number | null;
  }>,
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const clean = { ...patch };
  if (clean.planned_date === '') clean.planned_date = null;

  const { error } = await ctx.supabase.from('places').update(clean).eq('id', placeId);
  if (error) return fail(error.message);

  revalidatePath('/places');
  revalidatePath(`/places/${placeId}`);
  return succeed();
}

export async function deletePlace(placeId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('places').delete().eq('id', placeId);
  if (error) return fail(error.message);
  revalidatePath('/places');
  return succeed();
}

export async function setPlaceStatus(placeId: string, status: 'want' | 'visited'): Promise<ActionResult> {
  return updatePlace(placeId, { status });
}

/** 「行った！」の記録はメンバーごとに持つ */
export async function upsertReview(
  placeId: string,
  review: { visited_on?: string | null; rating?: number | null; comment?: string | null; want_again?: boolean },
): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.from('place_reviews').upsert(
    {
      place_id: placeId,
      user_id: ctx.user.id,
      visited_on: review.visited_on || null,
      rating: review.rating ?? null,
      comment: review.comment ?? null,
      want_again: review.want_again ?? false,
    },
    { onConflict: 'place_id,user_id' },
  );

  if (error) return fail(error.message);

  // レビューを書いた時点で「行った！」にする
  await ctx.supabase.from('places').update({ status: 'visited' }).eq('id', placeId);

  revalidatePath(`/places/${placeId}`);
  revalidatePath('/places');
  return succeed();
}

export async function deleteReview(placeId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase
    .from('place_reviews')
    .delete()
    .eq('place_id', placeId)
    .eq('user_id', ctx.user.id);

  if (error) return fail(error.message);
  revalidatePath(`/places/${placeId}`);
  return succeed();
}

export async function setPlaceTags(placeId: string, groupId: string, tagNames: string[]): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const tagIds = await resolveTagIds(ctx.supabase, groupId, tagNames);
  await ctx.supabase.from('place_tags').delete().eq('place_id', placeId);
  if (tagIds.length > 0) {
    const { error } = await ctx.supabase
      .from('place_tags')
      .insert(tagIds.map((tag_id) => ({ place_id: placeId, tag_id })));
    if (error) return fail(error.message);
  }
  revalidatePath(`/places/${placeId}`);
  return succeed();
}

export async function createList(groupId: string, name: string, emoji?: string): Promise<ActionResult<string>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (!name.trim()) return fail('リスト名を入力してください。');

  const { data, error } = await ctx.supabase
    .from('lists')
    .insert({ group_id: groupId, name: name.trim(), emoji: emoji ?? null, created_by: ctx.user.id })
    .select('id')
    .single();

  if (error || !data) return fail(error?.message ?? 'リストを作成できませんでした。');
  revalidatePath('/places');
  return succeed(data.id as string);
}

export async function togglePlaceInList(listId: string, placeId: string, include: boolean): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  if (include) {
    const { error } = await ctx.supabase
      .from('list_places')
      .upsert({ list_id: listId, place_id: placeId }, { onConflict: 'list_id,place_id' });
    if (error) return fail(error.message);
  } else {
    const { error } = await ctx.supabase
      .from('list_places')
      .delete()
      .eq('list_id', listId)
      .eq('place_id', placeId);
    if (error) return fail(error.message);
  }

  revalidatePath('/places');
  revalidatePath(`/places/${placeId}`);
  return succeed();
}
