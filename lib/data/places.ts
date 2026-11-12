import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { PlaceCategoryRow, PlaceWithExtras, PlaceList, Tag } from '@/types/database';

export interface PlaceFilters {
  status?: 'want' | 'visited' | 'all';
  category?: string | null;
  tagId?: string | null;
  listId?: string | null;
  wantAgain?: boolean;
  search?: string | null;
  sort?: 'created' | 'planned' | 'rating' | 'name';
}

/**
 * places を取るときの共通SELECT。
 *
 * 注意: added_by は auth.users を参照しているため、PostgREST では
 * profiles を直接埋め込めない（外部キーが無くクエリ全体がエラーになる）。
 * 「誰が追加したか」は attachAddedBy() で別途ひもづける。
 */
const SELECT = `
  *,
  place_reviews(*),
  place_tags(tag_id, tags(id, group_id, name, created_at)),
  list_places(list_id)
`;

/** 追加した人のプロフィールを、まとめて1回の問い合わせでひもづける */
async function attachAddedBy(
  supabase: SupabaseClient,
  places: PlaceWithExtras[],
): Promise<PlaceWithExtras[]> {
  const ids = Array.from(new Set(places.map((p) => p.added_by).filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return places;

  const { data } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ids);
  const byId = new Map(
    ((data ?? []) as { id: string; display_name: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]),
  );

  return places.map((p) => ({
    ...p,
    profiles: p.added_by ? (byId.get(p.added_by) ?? null) : null,
  }));
}

/**
 * カテゴリの表示名・絵文字をひもづける。
 * カテゴリはグループごとに増減するので、表示のたびに引き直す。
 */
async function attachCategoryMeta(
  supabase: SupabaseClient,
  places: PlaceWithExtras[],
): Promise<PlaceWithExtras[]> {
  const groupIds = Array.from(new Set(places.map((p) => p.group_id)));
  if (groupIds.length === 0) return places;

  const { data } = await supabase
    .from('place_categories')
    .select('group_id, value, label, emoji')
    .in('group_id', groupIds);

  const byKey = new Map(
    ((data ?? []) as Pick<PlaceCategoryRow, 'group_id' | 'value' | 'label' | 'emoji'>[]).map((c) => [
      `${c.group_id}:${c.value}`,
      { label: c.label, emoji: c.emoji },
    ]),
  );

  return places.map((p) => ({
    ...p,
    category_meta: p.category ? (byKey.get(`${p.group_id}:${p.category}`) ?? null) : null,
  }));
}

export async function listPlaces(groupId: string, filters: PlaceFilters = {}): Promise<PlaceWithExtras[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();

  let query = supabase.from('places').select(SELECT).eq('group_id', groupId);

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%`);

  switch (filters.sort) {
    case 'planned':
      query = query.order('planned_date', { ascending: true, nullsFirst: false });
      break;
    case 'name':
      query = query.order('name', { ascending: true });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query.limit(500);
  if (error || !data) {
    // 握りつぶすと「0件」と区別がつかなくなるのでログに残す
    if (error) console.error('[listPlaces] 取得に失敗しました:', error.message);
    return [];
  }

  let places = await attachCategoryMeta(supabase, await attachAddedBy(supabase, data as unknown as PlaceWithExtras[]));

  // 結合先での絞り込みはクライアント側で行う（RLS下でのJOINフィルタを単純に保つため）
  if (filters.tagId) {
    places = places.filter((p) => (p.place_tags ?? []).some((pt) => pt.tag_id === filters.tagId));
  }
  if (filters.listId) {
    places = places.filter((p) => (p.list_places ?? []).some((lp) => lp.list_id === filters.listId));
  }
  if (filters.wantAgain) {
    places = places.filter((p) => (p.place_reviews ?? []).some((r) => r.want_again));
  }
  if (filters.sort === 'rating') {
    const avg = (p: PlaceWithExtras) => {
      const ratings = (p.place_reviews ?? []).map((r) => r.rating).filter((r): r is number => typeof r === 'number');
      return ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : -1;
    };
    places = [...places].sort((a, b) => avg(b) - avg(a));
  }

  return places;
}

export async function getPlace(placeId: string): Promise<PlaceWithExtras | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('places').select(SELECT).eq('id', placeId).maybeSingle();
  if (error) {
    console.error('[getPlace] 取得に失敗しました:', error.message);
    return null;
  }
  if (!data) return null;

  const withMeta = await attachCategoryMeta(supabase, await attachAddedBy(supabase, [data as unknown as PlaceWithExtras]));
  return withMeta[0] ?? null;
}

/** グループのカテゴリ一覧（画面の並び順） */
export async function listPlaceCategories(groupId: string): Promise<PlaceCategoryRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('place_categories')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order')
    .order('created_at');

  if (error) {
    console.error('[listPlaceCategories] 取得に失敗しました:', error.message);
    return [];
  }
  return (data as PlaceCategoryRow[] | null) ?? [];
}

/** そのカテゴリを使っているスポットの件数（削除の確認に出す） */
export async function countPlacesInCategory(groupId: string, value: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('places')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('category', value);
  return count ?? 0;
}

export async function listTags(groupId: string): Promise<Tag[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('tags').select('*').eq('group_id', groupId).order('name');
  return (data as Tag[] | null) ?? [];
}

export async function listLists(groupId: string): Promise<PlaceList[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('lists').select('*').eq('group_id', groupId).order('created_at');
  return (data as PlaceList[] | null) ?? [];
}

/** 既存スポットの重複判定用に、名前と座標だけを軽く取る */
export async function listPlaceKeys(groupId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('places').select('id, name, lat, lng, external_id').eq('group_id', groupId);
  return ((data ?? []) as { id: string; name: string; lat: number; lng: number; external_id: string | null }[]).map(
    (p) => ({ ...p, externalId: p.external_id }),
  );
}

/** ホーム用: 最近追加したスポット */
export async function recentPlaces(groupId: string, limit = 6): Promise<PlaceWithExtras[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('places')
    .select(SELECT)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return attachCategoryMeta(
    supabase,
    await attachAddedBy(supabase, (data as unknown as PlaceWithExtras[] | null) ?? []),
  );
}

export async function countPlaces(groupId: string) {
  if (!isSupabaseConfigured()) return { want: 0, visited: 0 };
  const supabase = await createSupabaseServerClient();
  const [want, visited] = await Promise.all([
    supabase.from('places').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'want'),
    supabase.from('places').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'visited'),
  ]);
  return { want: want.count ?? 0, visited: visited.count ?? 0 };
}
