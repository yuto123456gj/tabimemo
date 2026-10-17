'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from './session';
import { dedupeCandidates } from '@/lib/utils/dedupe';
import { fail, succeed, type ActionResult } from './types';

export interface PlaceInput {
  groupId: string;
  name: string;
  address?: string | null;
  lat: number;
  lng: number;
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
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return fail('場所（緯度経度）が決まっていません。');

  const { data, error } = await ctx.supabase
    .from('places')
    .insert({
      group_id: input.groupId,
      name: input.name.trim(),
      address: input.address ?? null,
      lat: input.lat,
      lng: input.lng,
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
    lat: number;
    lng: number;
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

export interface ImportRow {
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category?: string | null;
  externalId?: string | null;
  sourceUrl?: string | null;
  memo?: string | null;
}

/**
 * Googleマップの保存場所の一括取り込み。
 * 既存スポットと「名前の類似度 + 50m以内」で重複判定し、重複は登録しない。
 */
export async function importPlaces(
  groupId: string,
  rows: ImportRow[],
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  if (rows.length === 0) return fail('取り込める行がありませんでした。');

  const { data: existingRaw } = await ctx.supabase
    .from('places')
    .select('id, name, lat, lng, external_id')
    .eq('group_id', groupId);

  const existing = ((existingRaw ?? []) as { name: string; lat: number; lng: number; external_id: string | null }[]).map(
    (p) => ({ name: p.name, lat: p.lat, lng: p.lng, externalId: p.external_id }),
  );

  const valid = rows.filter((r) => r.name?.trim() && Number.isFinite(r.lat) && Number.isFinite(r.lng));
  const { unique, duplicates } = dedupeCandidates(
    valid.map((r) => ({ ...r, externalId: r.externalId ?? null })),
    existing,
  );

  if (unique.length === 0) {
    return succeed({ imported: 0, skipped: duplicates.length + (rows.length - valid.length) });
  }

  const { error } = await ctx.supabase.from('places').insert(
    unique.map((r) => ({
      group_id: groupId,
      name: r.name.trim(),
      address: r.address ?? null,
      lat: r.lat,
      lng: r.lng,
      category: r.category ?? null,
      external_id: r.externalId ?? null,
      source_url: r.sourceUrl ?? null,
      memo: r.memo ?? null,
      added_by: ctx.user.id,
      status: 'want' as const,
    })),
  );

  if (error) return fail(error.message);

  revalidatePath('/places');
  revalidatePath('/');
  return succeed({
    imported: unique.length,
    skipped: duplicates.length + (rows.length - valid.length),
  });
}
