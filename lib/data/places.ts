import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type { PlaceWithExtras, PlaceList, Tag } from '@/types/database';

export interface PlaceFilters {
  status?: 'want' | 'visited' | 'all';
  category?: string | null;
  tagId?: string | null;
  listId?: string | null;
  wantAgain?: boolean;
  search?: string | null;
  sort?: 'created' | 'planned' | 'rating' | 'name';
}

const SELECT = `
  *,
  place_reviews(*),
  place_tags(tag_id, tags(id, group_id, name, created_at)),
  list_places(list_id),
  profiles:added_by(id, display_name, avatar_url)
`;

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
  if (error || !data) return [];

  let places = data as unknown as PlaceWithExtras[];

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
  const { data } = await supabase.from('places').select(SELECT).eq('id', placeId).maybeSingle();
  return (data as unknown as PlaceWithExtras | null) ?? null;
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
  return (data as unknown as PlaceWithExtras[] | null) ?? [];
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
