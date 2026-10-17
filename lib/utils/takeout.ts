/**
 * Google Takeout（マイプレイス／保存済みリスト）のパーサー。
 *
 * 対応形式:
 *  - GeoJSON  : 「保存済みの場所.json」など FeatureCollection 形式。座標を持っている
 *  - CSV      : 保存リストの書き出し（Title,Note,URL）。座標はURLから取り出す
 *
 * 外部通信をしない純粋関数なのでテストできる。座標が取れなかった行は
 * needsGeocoding = true として返し、呼び出し側（API）が名前で検索して補完する。
 */

export interface ImportCandidate {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  externalId: string | null;
  sourceUrl: string | null;
  memo: string | null;
  needsGeocoding: boolean;
}

export interface ParseResult {
  format: 'geojson' | 'csv' | 'unknown';
  candidates: ImportCandidate[];
  /** 名前が取れず取り込めなかった行数 */
  skipped: number;
  error?: string;
}

/** GoogleマップURLから緯度経度を取り出す */
export function extractCoordsFromGoogleMapsUrl(
  url: string | null | undefined,
): { lat: number; lng: number } | null {
  if (!url) return null;
  const decoded = (() => {
    try {
      return decodeURIComponent(url);
    } catch {
      return url;
    }
  })();

  // 1. !3d<lat>!4d<lng> （実際の施設の座標。最も正確）
  const d = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/.exec(decoded);
  if (d) return { lat: Number(d[1]), lng: Number(d[2]) };

  // 2. ?q=<lat>,<lng> / &query=<lat>,<lng>
  const q = /[?&](?:q|query|ll|center|destination)=(-?\d+\.\d+)[,%\s]+(-?\d+\.\d+)/.exec(decoded);
  if (q) return { lat: Number(q[1]), lng: Number(q[2]) };

  // 3. @<lat>,<lng>,<zoom>z （地図の表示中心。少しずれることがある）
  const at = /@(-?\d+\.\d+),(-?\d+\.\d+)/.exec(decoded);
  if (at) return { lat: Number(at[1]), lng: Number(at[2]) };

  return null;
}

/** GoogleマップURLから安定した識別子（重複判定用）を取り出す */
export function extractGoogleIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const ftid = /[?&]ftid=([^&]+)/.exec(url);
  if (ftid) return `gmaps:${ftid[1]}`;
  const cid = /[?&]cid=(\d+)/.exec(url);
  if (cid) return `gmaps:cid:${cid[1]}`;
  const placeId = /[?&]place_id=([^&]+)/.exec(url);
  if (placeId) return `google:${placeId[1]}`;
  return null;
}

function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** 素朴だが引用符に対応したCSVパーサー */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };

  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n') {
      pushRow();
    } else if (ch === '\r') {
      // 無視（\r\n に対応）
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) pushRow();

  return rows;
}

export function parseTakeoutGeoJson(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { format: 'unknown', candidates: [], skipped: 0, error: 'JSONとして読めませんでした' };
  }

  const features =
    typeof json === 'object' && json !== null && Array.isArray((json as { features?: unknown[] }).features)
      ? ((json as { features: unknown[] }).features as Record<string, unknown>[])
      : null;

  if (!features) {
    return { format: 'unknown', candidates: [], skipped: 0, error: 'features が見つかりませんでした' };
  }

  const candidates: ImportCandidate[] = [];
  let skipped = 0;

  for (const feature of features) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const location = (props.Location ?? props.location ?? {}) as Record<string, unknown>;
    const geometry = (feature.geometry ?? {}) as Record<string, unknown>;
    const coords = Array.isArray(geometry.coordinates) ? (geometry.coordinates as unknown[]) : null;

    const name =
      (typeof location['Business Name'] === 'string' && location['Business Name']) ||
      (typeof props.Title === 'string' && props.Title) ||
      (typeof location.Address === 'string' && location.Address) ||
      '';

    if (!name.trim()) {
      skipped += 1;
      continue;
    }

    let lat: number | null = null;
    let lng: number | null = null;

    if (coords && coords.length >= 2) {
      const [x, y] = coords as [unknown, unknown];
      if (isValidLatLng(y, x)) {
        lng = Number(x);
        lat = Number(y);
      }
    }

    // Geo Coordinates は文字列で入っていることがある
    if (lat === null) {
      const geo = (location['Geo Coordinates'] ?? {}) as Record<string, unknown>;
      const gLat = Number(geo.Latitude ?? geo.latitude);
      const gLng = Number(geo.Longitude ?? geo.longitude);
      if (isValidLatLng(gLat, gLng)) {
        lat = gLat;
        lng = gLng;
      }
    }

    const url =
      (typeof props['Google Maps URL'] === 'string' && props['Google Maps URL']) ||
      (typeof props.url === 'string' && props.url) ||
      null;

    if (lat === null) {
      const fromUrl = extractCoordsFromGoogleMapsUrl(url);
      if (fromUrl) {
        lat = fromUrl.lat;
        lng = fromUrl.lng;
      }
    }

    candidates.push({
      name: name.trim(),
      address: typeof location.Address === 'string' ? location.Address : null,
      lat,
      lng,
      externalId: extractGoogleIdFromUrl(url),
      sourceUrl: url,
      memo: typeof props.Comment === 'string' ? props.Comment : null,
      needsGeocoding: lat === null,
    });
  }

  return { format: 'geojson', candidates, skipped };
}

export function parseTakeoutCsv(text: string): ParseResult {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { format: 'csv', candidates: [], skipped: 0, error: '行がありませんでした' };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = header.some((h) => ['title', 'タイトル', 'name', '名前'].includes(h));
  const body = hasHeader ? rows.slice(1) : rows;

  const indexOf = (...names: string[]) => {
    for (const n of names) {
      const i = header.indexOf(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const titleIdx = hasHeader ? indexOf('title', 'タイトル', 'name', '名前') : 0;
  const noteIdx = hasHeader ? indexOf('note', 'メモ', 'comment', 'コメント') : 1;
  const urlIdx = hasHeader ? indexOf('url', 'urls', 'link', 'リンク') : 2;
  const latIdx = hasHeader ? indexOf('lat', 'latitude', '緯度') : -1;
  const lngIdx = hasHeader ? indexOf('lng', 'lon', 'longitude', '経度') : -1;
  const addressIdx = hasHeader ? indexOf('address', '住所') : -1;

  const candidates: ImportCandidate[] = [];
  let skipped = 0;

  for (const row of body) {
    const name = (titleIdx >= 0 ? row[titleIdx] : row[0])?.trim() ?? '';
    if (!name) {
      skipped += 1;
      continue;
    }

    const url = urlIdx >= 0 ? (row[urlIdx]?.trim() || null) : null;
    let lat: number | null = null;
    let lng: number | null = null;

    if (latIdx >= 0 && lngIdx >= 0) {
      const a = Number(row[latIdx]);
      const b = Number(row[lngIdx]);
      if (isValidLatLng(a, b)) {
        lat = a;
        lng = b;
      }
    }
    if (lat === null) {
      const fromUrl = extractCoordsFromGoogleMapsUrl(url);
      if (fromUrl) {
        lat = fromUrl.lat;
        lng = fromUrl.lng;
      }
    }

    candidates.push({
      name,
      address: addressIdx >= 0 ? (row[addressIdx]?.trim() || null) : null,
      lat,
      lng,
      externalId: extractGoogleIdFromUrl(url),
      sourceUrl: url,
      memo: noteIdx >= 0 ? (row[noteIdx]?.trim() || null) : null,
      needsGeocoding: lat === null,
    });
  }

  return { format: 'csv', candidates, skipped };
}

/** 拡張子や中身から形式を判定して取り込む */
export function parseTakeout(text: string, filename?: string): ParseResult {
  const trimmed = text.trimStart();
  const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  const isJsonName = /\.(json|geojson)$/i.test(filename ?? '');

  if (looksJson || isJsonName) {
    const result = parseTakeoutGeoJson(text);
    if (result.candidates.length > 0 || result.format === 'geojson') return result;
  }
  return parseTakeoutCsv(text);
}
