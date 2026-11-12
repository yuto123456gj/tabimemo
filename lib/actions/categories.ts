'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from './session';
import { fail, succeed, type ActionResult } from './types';
import { countPlacesInCategory } from '@/lib/data/places';
import { normalizeCategoryInput } from '@/lib/utils/category';
import type { PlaceCategoryRow } from '@/types/database';

/** 自分でカテゴリを追加する */
export async function createPlaceCategory(
  groupId: string,
  label: string,
  emoji: string,
): Promise<ActionResult<PlaceCategoryRow>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const input = normalizeCategoryInput(label, emoji);
  if (!input.ok) return fail(input.error);

  const { data, error } = await ctx.supabase
    .from('place_categories')
    .insert({
      group_id: groupId,
      // 自分で作ったカテゴリは、名前をそのまま値として使う
      value: input.label,
      label: input.label,
      emoji: input.emoji,
    })
    .select('*')
    .single();

  if (error) {
    // unique (group_id, value) 違反
    if (error.code === '23505') return fail('同じ名前のカテゴリがすでにあります。');
    console.error('[createPlaceCategory] 追加に失敗しました:', error.message);
    return fail('カテゴリを追加できませんでした。');
  }

  revalidatePath('/places');
  revalidatePath('/map');
  return succeed(data as PlaceCategoryRow);
}

/**
 * カテゴリを削除する。
 * 使っていたスポットは「その他」に戻る（スポット自体は消えない）。
 */
export async function deletePlaceCategory(categoryId: string): Promise<ActionResult> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);

  const { error } = await ctx.supabase.rpc('delete_place_category', { p_id: categoryId });

  if (error) {
    console.error('[deletePlaceCategory] 削除に失敗しました:', error.message);
    return fail('カテゴリを削除できませんでした。');
  }

  revalidatePath('/places');
  revalidatePath('/map');
  revalidatePath('/');
  return succeed();
}

/** 削除の確認に出す「このカテゴリのスポットは◯件」 */
export async function countCategoryUsage(groupId: string, value: string): Promise<ActionResult<number>> {
  const ctx = await requireUser();
  if (!ctx.ok) return fail(ctx.error);
  return succeed(await countPlacesInCategory(groupId, value));
}
