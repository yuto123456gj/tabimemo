export interface PlaceCandidate {
  /** Google の place_id / OSM の "osm:node:123" など、重複判定に使う外部ID */
  externalId: string | null;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  category: string | null;
  photoUrl: string | null;
  source: 'nominatim' | 'google' | 'manual';
}

export interface SearchOptions {
  /** 現在地や旅行先の近くを優先する */
  near?: { lat: number; lng: number } | null;
  limit?: number;
  language?: string;
}

export interface PlaceSearchProvider {
  readonly id: 'nominatim' | 'google';
  readonly label: string;
  search(query: string, options?: SearchOptions): Promise<PlaceCandidate[]>;
}
