/**
 * Supabase のテーブル型（supabase/migrations と対応）。
 * 本番では `supabase gen types typescript` で生成し直してもよい。
 */

export type Role = 'owner' | 'member';
export type Status = 'want' | 'visited';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  token: string;
  created_by: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

export interface Place {
  id: string;
  group_id: string;
  name: string;
  address: string | null;
  /** 緯度。未設定（あとで地図でピンを打つ）の場合は null */
  lat: number | null;
  /** 経度。未設定の場合は null */
  lng: number | null;
  category: string | null;
  photo_url: string | null;
  source_url: string | null;
  memo: string | null;
  planned_date: string | null;
  status: Status;
  added_by: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceReview {
  id: string;
  place_id: string;
  user_id: string;
  visited_on: string | null;
  rating: number | null;
  comment: string | null;
  want_again: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaceList {
  id: string;
  group_id: string;
  name: string;
  emoji: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ListPlace {
  list_id: string;
  place_id: string;
  created_at: string;
}

export interface Tag {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
}

export interface PlaceTag {
  place_id: string;
  tag_id: string;
}

export interface Trip {
  id: string;
  group_id: string;
  title: string;
  start_date: string;
  end_date: string;
  cover_url: string | null;
  area_lat: number | null;
  area_lng: number | null;
  public_share_token: string;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
}

export interface TripItem {
  id: string;
  trip_id: string;
  day_index: number;
  order_index: number;
  place_id: string | null;
  custom_title: string | null;
  arrive_time: string | null;
  stay_minutes: number | null;
  transport: string | null;
  memo: string | null;
  created_at: string;
}

export interface TripChecklistItem {
  id: string;
  trip_id: string;
  label: string;
  checked: boolean;
  assigned_to: string | null;
  order_index: number;
  created_at: string;
}

export interface TripBudgetItem {
  id: string;
  trip_id: string;
  label: string;
  amount: number;
  category: string | null;
  order_index: number;
  created_at: string;
}

/** 画面で使う結合済みの型 */
export type PlaceWithExtras = Place & {
  place_reviews?: PlaceReview[] | null;
  place_tags?: { tag_id: string; tags?: Tag | null }[] | null;
  list_places?: { list_id: string }[] | null;
  profiles?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null;
};

export type TripItemWithPlace = TripItem & {
  places?: Place | null;
};
