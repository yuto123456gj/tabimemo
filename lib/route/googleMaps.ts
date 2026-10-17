import type { RoutePoint } from './types';

/**
 * Googleマップの経路URLを作る（アプリでもブラウザでも開ける公式フォーマット）。
 * 中継地点は23件まで（Googleマップの仕様）。
 */
export function googleMapsDirectionsUrl(
  points: Array<Pick<RoutePoint, 'lat' | 'lng' | 'name'>>,
  mode: 'walking' | 'driving' | 'transit' | 'bicycling' = 'walking',
): string | null {
  if (points.length === 0) return null;

  const coord = (p: { lat: number; lng: number }) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

  if (points.length === 1) {
    const params = new URLSearchParams({
      api: '1',
      query: coord(points[0]),
    });
    return `https://www.google.com/maps/search/?${params.toString()}`;
  }

  const limited = points.slice(0, 25);
  const origin = limited[0];
  const destination = limited[limited.length - 1];
  const waypoints = limited.slice(1, -1).slice(0, 23);

  const params = new URLSearchParams({
    api: '1',
    origin: coord(origin),
    destination: coord(destination),
    travelmode: mode,
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map(coord).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** 1地点だけをGoogleマップで開く */
export function googleMapsPlaceUrl(place: { name?: string | null; lat: number; lng: number }): string {
  const params = new URLSearchParams({ api: '1', query: `${place.lat},${place.lng}` });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export const TRANSPORT_TO_GOOGLE_MODE: Record<string, 'walking' | 'driving' | 'transit' | 'bicycling'> = {
  walk: 'walking',
  car: 'driving',
  transit: 'transit',
  bike: 'bicycling',
};
