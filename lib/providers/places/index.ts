import { env } from '@/lib/env';
import { googleProvider } from './google';
import { nominatimProvider } from './nominatim';
import type { PlaceCandidate, PlaceSearchProvider, SearchOptions } from './types';

export type { PlaceCandidate, PlaceSearchProvider, SearchOptions };

/**
 * GOOGLE_PLACES_API_KEY があれば Google、無ければ Nominatim。
 * 実装を差し替えたい時はここだけ変える。
 */
export function getPlaceSearchProvider(): PlaceSearchProvider {
  return env.googlePlacesKey ? googleProvider : nominatimProvider;
}

/** Google が失敗したら Nominatim にフォールバックして必ず結果を返そうとする */
export async function searchPlaces(
  query: string,
  options?: SearchOptions,
): Promise<{ provider: string; candidates: PlaceCandidate[]; fallbackReason?: string }> {
  const primary = getPlaceSearchProvider();
  try {
    const candidates = await primary.search(query, options);
    if (candidates.length > 0 || primary.id === 'nominatim') {
      return { provider: primary.id, candidates };
    }
  } catch (error) {
    if (primary.id === 'nominatim') {
      return {
        provider: 'nominatim',
        candidates: [],
        fallbackReason: error instanceof Error ? error.message : '検索に失敗しました',
      };
    }
  }

  // Google で取れなかった場合のフォールバック
  try {
    const candidates = await nominatimProvider.search(query, options);
    return { provider: 'nominatim', candidates, fallbackReason: 'Google Places が使えなかったため OSM で検索しました' };
  } catch (error) {
    return {
      provider: 'nominatim',
      candidates: [],
      fallbackReason: error instanceof Error ? error.message : '検索に失敗しました',
    };
  }
}
