import { NextResponse, type NextRequest } from 'next/server';
import { parseTakeout } from '@/lib/utils/takeout';
import { searchPlaces } from '@/lib/providers/places';
import { guessCategory } from '@/lib/providers/places/categories';
import { clientKey, takeToken } from '@/lib/utils/ratelimit';
import { getCurrentUser } from '@/lib/data/session';
import { isSupabaseConfigured } from '@/lib/env';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 300;
/** 座標が無い行の住所解決は、Nominatimの負荷を考えて件数を絞る */
const MAX_GEOCODE = 12;

/**
 * Google Takeout（GeoJSON / CSV）を読み込み、取り込み候補を返す。
 * 実際の登録は Server Action（importPlaces）で行い、重複はそこで除く。
 */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  if (!takeToken(`import:${clientKey(request)}`, 6, 0.05)) {
    return NextResponse.json({ error: '少し待ってからもう一度お試しください。' }, { status: 429 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'ファイルを選んでください。' }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'ファイルが大きすぎます（5MBまで）。' }, { status: 413 });
  }

  const text = await file.text();
  const parsed = parseTakeout(text, file.name);

  if (parsed.candidates.length === 0) {
    return NextResponse.json(
      { error: parsed.error ?? '取り込める場所が見つかりませんでした。', format: parsed.format },
      { status: 422 },
    );
  }

  const rows = parsed.candidates.slice(0, MAX_ROWS);

  // 座標が無い行だけ、名前で検索して補完する（上限あり）
  let geocoded = 0;
  for (const row of rows) {
    if (!row.needsGeocoding || geocoded >= MAX_GEOCODE) continue;
    geocoded += 1;
    try {
      const query = [row.name, row.address].filter(Boolean).join(' ');
      const result = await searchPlaces(query, { limit: 1 });
      const hit = result.candidates[0];
      if (hit) {
        row.lat = hit.lat;
        row.lng = hit.lng;
        row.address = row.address ?? hit.address;
        row.needsGeocoding = false;
      }
    } catch {
      // 1件失敗しても他の行は続ける
    }
  }

  const ready = rows
    .filter((r) => r.lat !== null && r.lng !== null)
    .map((r) => ({
      name: r.name,
      address: r.address,
      lat: r.lat as number,
      lng: r.lng as number,
      category: guessCategory(r.name, r.address),
      externalId: r.externalId,
      sourceUrl: r.sourceUrl,
      memo: r.memo,
    }));

  const unresolved = rows.filter((r) => r.lat === null || r.lng === null).map((r) => r.name);

  return NextResponse.json({
    format: parsed.format,
    total: parsed.candidates.length,
    truncated: parsed.candidates.length > MAX_ROWS,
    rows: ready,
    unresolved,
    skipped: parsed.skipped,
  });
}
