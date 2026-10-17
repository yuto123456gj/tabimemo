import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import type {
  Trip,
  TripBudgetItem,
  TripChecklistItem,
  TripItemWithPlace,
} from '@/types/database';

export async function listTrips(groupId: string): Promise<Trip[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('trips')
    .select('*')
    .eq('group_id', groupId)
    .order('start_date', { ascending: false });
  return (data as Trip[] | null) ?? [];
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();
  return (data as Trip | null) ?? null;
}

export async function getTripItems(tripId: string): Promise<TripItemWithPlace[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('trip_items')
    .select('*, places(*)')
    .eq('trip_id', tripId)
    .order('day_index')
    .order('order_index');
  return (data as unknown as TripItemWithPlace[] | null) ?? [];
}

export async function getTripChecklist(tripId: string): Promise<TripChecklistItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('trip_checklist')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index');
  return (data as TripChecklistItem[] | null) ?? [];
}

export async function getTripBudget(tripId: string): Promise<TripBudgetItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('trip_budget_items')
    .select('*')
    .eq('trip_id', tripId)
    .order('order_index');
  return (data as TripBudgetItem[] | null) ?? [];
}

/** ホーム用: 進行中・直近の旅行 */
export async function upcomingTrips(groupId: string, limit = 3): Promise<Trip[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('trips')
    .select('*')
    .eq('group_id', groupId)
    .gte('end_date', today)
    .order('start_date', { ascending: true })
    .limit(limit);
  return (data as Trip[] | null) ?? [];
}

/**
 * 共有閲覧ページ用のデータ取得。
 * RLSを緩めず、security definer の RPC 経由で is_public=true のものだけ取る。
 */
export interface PublicTripItem {
  id: string;
  day_index: number;
  order_index: number;
  title: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  category: string | null;
  photo_url: string | null;
  arrive_time: string | null;
  stay_minutes: number | null;
  transport: string | null;
  memo: string | null;
}

export interface PublicTrip {
  trip: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    cover_url: string | null;
  };
  items: PublicTripItem[];
  checklist: { label: string; checked: boolean }[];
  budget: { label: string; amount: number; category: string | null }[];
}

export async function getPublicTrip(token: string): Promise<PublicTrip | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_public_trip', { share_token: token });
  if (error || !data) return null;
  return data as unknown as PublicTrip;
}
