/** アプリ名はここ1か所で管理する（表示名を変えたい時はこのファイルだけ編集する）。 */
export const APP_NAME = 'Tabimemo';
export const APP_NAME_JA = 'タビメモ';
export const APP_TAGLINE = '行きたい場所を貯めて、そのまま旅のしおりに。';
export const APP_DESCRIPTION =
  '気になったお店や景色を保存して、日程に組み込み、最短ルートまで自動で組み立てられる旅のメモアプリ。';

export const PLACE_CATEGORIES = [
  { value: 'restaurant', label: 'ごはん', emoji: '🍽️' },
  { value: 'cafe', label: 'カフェ', emoji: '☕️' },
  { value: 'sightseeing', label: '観光', emoji: '⛩️' },
  { value: 'nature', label: '自然', emoji: '🏞️' },
  { value: 'shopping', label: '買い物', emoji: '🛍️' },
  { value: 'hotel', label: '宿', emoji: '🛏️' },
  { value: 'bar', label: '居酒屋・バー', emoji: '🍶' },
  { value: 'activity', label: '体験', emoji: '🎡' },
  { value: 'other', label: 'その他', emoji: '📍' },
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number]['value'];

export const TRANSPORT_MODES = [
  { value: 'walk', label: '徒歩', emoji: '🚶' },
  { value: 'car', label: '車', emoji: '🚗' },
  { value: 'transit', label: '電車・バス', emoji: '🚃' },
  { value: 'bike', label: '自転車', emoji: '🚲' },
] as const;

export type TransportMode = (typeof TRANSPORT_MODES)[number]['value'];

/** ルート計算に使える移動手段（OSRM のプロファイルに対応するもの）。 */
export const ROUTABLE_MODES = ['walk', 'car'] as const;
export type RoutableMode = (typeof ROUTABLE_MODES)[number];

export const PLACE_STATUSES = [
  { value: 'want', label: '行きたい', emoji: '✨' },
  { value: 'visited', label: '行った！', emoji: '✅' },
] as const;

export type PlaceStatus = (typeof PLACE_STATUSES)[number]['value'];

export function categoryMeta(value: string | null | undefined) {
  return (
    PLACE_CATEGORIES.find((c) => c.value === value) ??
    PLACE_CATEGORIES[PLACE_CATEGORIES.length - 1]
  );
}

export function transportMeta(value: string | null | undefined) {
  return TRANSPORT_MODES.find((t) => t.value === value) ?? TRANSPORT_MODES[0];
}
