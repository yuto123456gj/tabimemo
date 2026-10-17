const EARTH_RADIUS_M = 6371008.8;

/** 2点間の直線距離（メートル）。ハーバサインの公式。 */
export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 移動手段ごとの平均速度（m/秒）。直線距離から所要時間を見積もる時に使う。 */
export const AVERAGE_SPEED_MPS = {
  walk: 1.25, // 約4.5km/h
  car: 8.3, // 約30km/h（市街地）
  transit: 8.3,
  bike: 3.9,
} as const;

/** 直線距離を道のりに近づける補正係数（市街地の迂回を見込む） */
export const DETOUR_FACTOR = 1.3;

export function estimateDuration(distanceMeters: number, mode: keyof typeof AVERAGE_SPEED_MPS = 'walk') {
  return distanceMeters / AVERAGE_SPEED_MPS[mode];
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '-';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)}km`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '-';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}分`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

/** 複数地点の中心（地図の初期表示に使う） */
export function centroid(points: Array<{ lat: number; lng: number }>) {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

/** 2点が「同じ場所」と言える距離か（重複インポート判定に使う） */
export function isWithinMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  meters: number,
): boolean {
  return haversineDistance(a, b) <= meters;
}
