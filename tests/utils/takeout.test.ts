import { describe, expect, it } from 'vitest';
import {
  extractCoordsFromGoogleMapsUrl,
  extractGoogleIdFromUrl,
  parseCsv,
  parseTakeout,
  parseTakeoutCsv,
  parseTakeoutGeoJson,
} from '@/lib/utils/takeout';

const GEOJSON = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [139.8008, 35.6816] },
      properties: {
        Title: 'ブルーボトルコーヒー 清澄白河',
        'Google Maps URL': 'https://www.google.com/maps/place/?q=place_id:ChIJabc123',
        Location: {
          Address: '東京都江東区平野1-4-8',
          'Business Name': 'ブルーボトルコーヒー 清澄白河フラッグシップカフェ',
          'Country Code': 'JP',
        },
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] }, // 座標なし扱い
      properties: {
        Title: '座標のない場所',
        'Google Maps URL': 'https://maps.google.com/?cid=1234567890',
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [135.7292, 35.0394] },
      properties: { Title: '' }, // 名前なし → スキップ
    },
  ],
});

describe('extractCoordsFromGoogleMapsUrl', () => {
  it('!3d!4d 形式から取り出せる', () => {
    const url = 'https://www.google.com/maps/place/x/@35.0,135.0,17z/data=!3m1!4b1!4m2!3m1!1s0x0:0x0!3d35.0394!4d135.7292';
    expect(extractCoordsFromGoogleMapsUrl(url)).toEqual({ lat: 35.0394, lng: 135.7292 });
  });

  it('@lat,lng 形式から取り出せる', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://www.google.com/maps/@35.6812,139.7671,15z')).toEqual({
      lat: 35.6812,
      lng: 139.7671,
    });
  });

  it('?q=lat,lng 形式から取り出せる', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://maps.google.com/?q=34.7025,135.4959')).toEqual({
      lat: 34.7025,
      lng: 135.4959,
    });
  });

  it('座標が無いURLは null', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://maps.app.goo.gl/abcdef')).toBeNull();
    expect(extractCoordsFromGoogleMapsUrl(null)).toBeNull();
  });
});

describe('extractGoogleIdFromUrl', () => {
  it('cid / ftid / place_id を識別子にできる', () => {
    expect(extractGoogleIdFromUrl('https://maps.google.com/?cid=123')).toBe('gmaps:cid:123');
    expect(extractGoogleIdFromUrl('https://www.google.com/maps/place/?ftid=0x1:0x2')).toBe('gmaps:0x1:0x2');
    expect(extractGoogleIdFromUrl('https://www.google.com/maps/place/?q=place_id:ChIJx')).toBeNull();
    expect(extractGoogleIdFromUrl('https://www.google.com/maps/search/?place_id=ChIJx')).toBe('google:ChIJx');
  });
});

describe('parseCsv', () => {
  it('引用符・カンマ入りの値を扱える', () => {
    const rows = parseCsv('Title,Note,URL\n"カフェ, 渋谷","""最高""です",https://example.com\n');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(['カフェ, 渋谷', '"最高"です', 'https://example.com']);
  });

  it('CRLFと空行を無視する', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n\r\n');
    expect(rows).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('parseTakeoutGeoJson', () => {
  it('座標・住所・店名を取り込む', () => {
    const result = parseTakeoutGeoJson(GEOJSON);
    expect(result.format).toBe('geojson');
    expect(result.skipped).toBe(1);
    expect(result.candidates).toHaveLength(2);

    const first = result.candidates[0];
    expect(first.name).toBe('ブルーボトルコーヒー 清澄白河フラッグシップカフェ');
    expect(first.lat).toBeCloseTo(35.6816);
    expect(first.lng).toBeCloseTo(139.8008);
    expect(first.address).toBe('東京都江東区平野1-4-8');
    expect(first.needsGeocoding).toBe(false);
  });

  it('座標が取れない行は needsGeocoding になる', () => {
    const result = parseTakeoutGeoJson(GEOJSON);
    const second = result.candidates[1];
    expect(second.name).toBe('座標のない場所');
    expect(second.needsGeocoding).toBe(true);
    expect(second.externalId).toBe('gmaps:cid:1234567890');
  });

  it('壊れたJSONはエラーを返す（例外は投げない）', () => {
    const result = parseTakeoutGeoJson('{ broken');
    expect(result.candidates).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });
});

describe('parseTakeoutCsv', () => {
  it('Title,Note,URL 形式を取り込み、URLから座標を拾う', () => {
    const csv = [
      'Title,Note,URL',
      '金閣寺,紅葉の時期に,"https://www.google.com/maps/place/x/data=!3d35.0394!4d135.7292"',
      '名前だけの場所,,https://maps.app.goo.gl/xxxx',
      ',メモだけ,https://example.com',
    ].join('\n');

    const result = parseTakeoutCsv(csv);
    expect(result.format).toBe('csv');
    expect(result.skipped).toBe(1);
    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]).toMatchObject({
      name: '金閣寺',
      memo: '紅葉の時期に',
      lat: 35.0394,
      lng: 135.7292,
      needsGeocoding: false,
    });
    expect(result.candidates[1].needsGeocoding).toBe(true);
  });

  it('ヘッダーが無いCSVも1列目をタイトルとして扱う', () => {
    // 座標入りURLはカンマを含むので、実ファイル同様に引用符で囲む
    const result = parseTakeoutCsv('通天閣,,"https://maps.google.com/?q=34.6525,135.5063"');
    expect(result.candidates[0].name).toBe('通天閣');
    expect(result.candidates[0].lat).toBeCloseTo(34.6525);
  });

  it('緯度経度の列があればそれを使う', () => {
    const result = parseTakeoutCsv('title,lat,lng\n東京タワー,35.6586,139.7454');
    expect(result.candidates[0]).toMatchObject({ name: '東京タワー', lat: 35.6586, lng: 139.7454 });
  });
});

describe('parseTakeout', () => {
  it('中身から形式を判定する', () => {
    expect(parseTakeout(GEOJSON).format).toBe('geojson');
    expect(parseTakeout('Title,Note,URL\n金閣寺,,').format).toBe('csv');
  });

  it('ファイル名からも判定できる', () => {
    expect(parseTakeout(GEOJSON, '保存済みの場所.json').format).toBe('geojson');
  });
});
