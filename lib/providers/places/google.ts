import { env } from '@/lib/env';
import { guessCategory } from './categories';
import type { PlaceCandidate, PlaceSearchProvider, SearchOptions } from './types';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  primaryType?: string;
  photos?: { name?: string }[];
}

/**
 * Google Places API (New) の Text Search。
 * APIキーはサーバー側だけで使い、写真は /api/places/photo 経由で中継する
 * （キーをクライアントに出さないため）。
 */
export const googleProvider: PlaceSearchProvider = {
  id: 'google',
  label: 'Google Places',

  async search(query: string, options: SearchOptions = {}): Promise<PlaceCandidate[]> {
    const q = query.trim();
    if (!q) return [];

    const body: Record<string, unknown> = {
      textQuery: q,
      languageCode: options.language ?? 'ja',
      regionCode: 'JP',
      maxResultCount: Math.min(options.limit ?? 5, 10),
    };

    if (options.near) {
      body.locationBias = {
        circle: {
          center: { latitude: options.near.lat, longitude: options.near.lng },
          radius: 30000,
        },
      };
    }

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': env.googlePlacesKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.shortFormattedAddress',
          'places.location',
          'places.types',
          'places.primaryType',
          'places.photos',
        ].join(','),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Google Places error: ${res.status} ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as { places?: GooglePlace[] };
    return (json.places ?? [])
      .map((p): PlaceCandidate | null => {
        const lat = p.location?.latitude;
        const lng = p.location?.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return null;
        const photoName = p.photos?.[0]?.name;
        return {
          externalId: p.id ? `google:${p.id}` : null,
          name: p.displayName?.text ?? q,
          address: p.shortFormattedAddress ?? p.formattedAddress ?? null,
          lat,
          lng,
          category: guessCategory(p.primaryType, ...(p.types ?? [])),
          photoUrl: photoName ? `/api/places/photo?name=${encodeURIComponent(photoName)}` : null,
          source: 'google',
        };
      })
      .filter((p): p is PlaceCandidate => p !== null);
  },
};
