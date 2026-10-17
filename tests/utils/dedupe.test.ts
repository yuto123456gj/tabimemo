import { describe, expect, it } from 'vitest';
import { dedupeCandidates, findDuplicate, isSamePlace, nameSimilarity, normalizeName } from '@/lib/utils/dedupe';

describe('normalizeName', () => {
  it('全角・空白・記号・支店表記をそろえる', () => {
    expect(normalizeName('ＢＬＵＥ　ＢＯＴＴＬＥ　ＣＯＦＦＥＥ')).toBe('bluebottlecoffee');
    expect(normalizeName('喫茶 ソワレ（京都本店）')).toBe('喫茶ソワレ京都');
    expect(normalizeName('スターバックス 渋谷店')).toBe('スターバックス渋谷');
  });
});

describe('nameSimilarity', () => {
  it('同じ名前は1', () => {
    expect(nameSimilarity('金閣寺', '金閣寺')).toBe(1);
  });

  it('表記ゆれは高い類似度になる', () => {
    expect(nameSimilarity('ブルーボトルコーヒー 清澄白河', 'ブルーボトルコーヒー清澄白河店')).toBeGreaterThan(0.7);
  });

  it('無関係な名前は低い類似度になる', () => {
    expect(nameSimilarity('金閣寺', 'ラーメン二郎')).toBeLessThan(0.3);
  });

  it('空文字は0', () => {
    expect(nameSimilarity('', '金閣寺')).toBe(0);
  });
});

describe('isSamePlace', () => {
  const base = { name: 'ブルーボトルコーヒー 清澄白河', lat: 35.6816, lng: 139.8008 };

  it('名前が似ていて50m以内なら同じ場所', () => {
    // 約20m離れた地点
    expect(isSamePlace(base, { name: 'ブルーボトルコーヒー清澄白河店', lat: 35.68178, lng: 139.8008 })).toBe(true);
  });

  it('名前が似ていても離れていれば別の場所', () => {
    expect(isSamePlace(base, { name: 'ブルーボトルコーヒー 青山', lat: 35.6655, lng: 139.7126 })).toBe(false);
  });

  it('近くても名前が違えば別の場所（同じビルの別店舗）', () => {
    expect(isSamePlace(base, { name: '丸好酒場', lat: 35.68162, lng: 139.80082 })).toBe(false);
  });

  it('外部IDが一致すれば距離に関係なく同じ場所', () => {
    expect(
      isSamePlace(
        { ...base, externalId: 'google:abc' },
        { name: '全然ちがう名前', lat: 34.7, lng: 135.5, externalId: 'google:abc' },
      ),
    ).toBe(true);
  });

  it('しきい値を変えられる', () => {
    const far = { name: 'ブルーボトルコーヒー清澄白河', lat: 35.6830, lng: 139.8008 }; // 約150m
    expect(isSamePlace(base, far)).toBe(false);
    expect(isSamePlace(base, far, { distanceMeters: 300 })).toBe(true);
  });
});

describe('dedupeCandidates', () => {
  it('既存の場所と候補内の重複を両方はじく', () => {
    const existing = [{ name: '金閣寺', lat: 35.0394, lng: 135.7292 }];
    const candidates = [
      { name: '鹿苑寺（金閣寺）', lat: 35.03942, lng: 135.72922 }, // 既存と同じ
      { name: '銀閣寺', lat: 35.0270, lng: 135.7982 },
      { name: '銀閣寺（慈照寺）', lat: 35.02702, lng: 135.79821 }, // 候補内の重複
    ];

    const { unique, duplicates } = dedupeCandidates(candidates, existing);
    expect(unique.map((u) => u.name)).toEqual(['銀閣寺']);
    expect(duplicates).toHaveLength(2);
  });

  it('重複がなければすべて通す', () => {
    const { unique, duplicates } = dedupeCandidates(
      [
        { name: '伏見稲荷大社', lat: 34.9671, lng: 135.7727 },
        { name: '清水寺', lat: 34.9949, lng: 135.7850 },
      ],
      [],
    );
    expect(unique).toHaveLength(2);
    expect(duplicates).toHaveLength(0);
  });
});

describe('findDuplicate', () => {
  it('見つからなければ null', () => {
    expect(findDuplicate({ name: '通天閣', lat: 34.6525, lng: 135.5063 }, [])).toBeNull();
  });
});
