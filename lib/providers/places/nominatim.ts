import { env } from '@/lib/env';
import { throttle } from '@/lib/utils/ratelimit';
import { guessCategory } from './categories';
import type { PlaceCandidate, PlaceSearchProvider, SearchOptions } from './types';

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

interface NominatimResult {
  osm_type?: string;
  osm_id?: number;
  place_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  category?: string;
  type?: string;
  class?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
  namedetails?: Record<string, string> | null;
}

function toCandidate(r: NominatimResult): PlaceCandidate {
  const parts = r.display_name.split(',').map((s) => s.trim());
  const name = r.namedetails?.['name:ja'] || r.name || parts[0] || r.display_name;
  // 日本の住所は display_name が逆順なので、日本語ロケールでは読みやすい向きに直す
  const addr = r.address ?? {};
  const jp = [
    addr.postcode ? `〒${addr.postcode}` : '',
    addr.province || addr.state || '',
    addr.city || addr.town || addr.village || addr.county || '',
    addr.suburb || addr.neighbourhood || addr.quarter || '',
    addr.road || '',
    addr.house_number || '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    externalId: r.osm_type && r.osm_id ? `osm:${r.osm_type}:${r.osm_id}` : r.place_id ? `osm:place:${r.place_id}` : null,
    name,
    address: jp || parts.slice(1).reverse().join(' ') || r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    // タグを優先し、判断できない時は名前（「〜大社」「〜ラーメン」など）で補う
    category: guessCategory(
      r.class,
      r.type,
      r.category,
      r.extratags?.cuisine,
      r.extratags?.tourism,
      r.extratags?.religion,
      r.extratags?.amenity,
      name,
    ),
    photoUrl: r.extratags?.image ?? null,
    source: 'nominatim',
  };
}

export const nominatimProvider: PlaceSearchProvider = {
  id: 'nominatim',
  label: 'OpenStreetMap (Nominatim)',

  async search(query: string, options: SearchOptions = {}): Promise<PlaceCandidate[]> {
    const q = query.trim();
    if (!q) return [];

    const params = new URLSearchParams({
      q,
      format: 'jsonv2',
      addressdetails: '1',
      namedetails: '1',
      extratags: '1',
      limit: String(Math.min(options.limit ?? 5, 10)),
      'accept-language': options.language ?? 'ja',
    });

    // 近くを優先（viewbox は厳密な絞り込みにはせず、優先度付けのみ）
    if (options.near) {
      const { lat, lng } = options.near;
      const d = 0.6; // 約60km
      params.set('viewbox', `${lng - d},${lat + d},${lng + d},${lat - d}`);
      params.set('bounded', '0');
    }

    // Nominatim の利用規約: 1秒に1リクエストまで + 連絡先付きUser-Agent
    return throttle('nominatim', 1100, async () => {
      const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
        headers: {
          'User-Agent': env.nominatimUserAgent,
          Referer: env.siteUrl,
          Accept: 'application/json',
        },
        // 同じ検索語は1時間キャッシュしてリクエスト数を抑える
        next: { revalidate: 3600 },
      });

      if (!res.ok) {
        throw new Error(`Nominatim error: ${res.status}`);
      }
      const json = (await res.json()) as NominatimResult[];
      return json.map(toCandidate).filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
    });
  },
};
