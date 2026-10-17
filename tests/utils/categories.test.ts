import { describe, expect, it } from 'vitest';
import { guessCategory } from '@/lib/providers/places/categories';

describe('guessCategory', () => {
  it('OSMのtypeを正しく分類する', () => {
    expect(guessCategory('amenity', 'place_of_worship')).toBe('sightseeing');
    expect(guessCategory('amenity', 'cafe')).toBe('cafe');
    expect(guessCategory('tourism', 'hotel')).toBe('hotel');
    expect(guessCategory('leisure', 'park')).toBe('nature');
  });

  it('"parking" を "park"（自然）と誤判定しない', () => {
    expect(guessCategory('amenity', 'parking')).toBe('other');
  });

  it('駅やATMなどは「その他」になる', () => {
    expect(guessCategory('highway', 'bus_stop')).toBe('other');
    expect(guessCategory('railway', 'station')).toBe('other');
    expect(guessCategory('amenity', 'atm')).toBe('other');
  });

  it('Google Places のtypesを分類する', () => {
    expect(guessCategory('japanese_restaurant', 'restaurant', 'food')).toBe('restaurant');
    expect(guessCategory('tourist_attraction')).toBe('sightseeing');
    expect(guessCategory('shopping_mall')).toBe('shopping');
  });

  it('日本語の自由文から分類する', () => {
    expect(guessCategory('старый 伏見稲荷大社')).toBe('sightseeing');
    expect(guessCategory('一蘭 渋谷店 ラーメン')).toBe('restaurant');
    expect(guessCategory('道後温泉 本館')).toBe('activity');
    expect(guessCategory('上野公園')).toBe('nature');
  });

  it('地名に紛れた漢字で誤判定しない', () => {
    // 「松山」の「山」や「和歌山」で自然判定しない
    expect(guessCategory('松山市役所')).toBe('other');
    expect(guessCategory('和歌山駅')).toBe('other');
  });

  it('building=yes のような無意味なタグは名前からの推定を邪魔しない', () => {
    expect(guessCategory('building', 'yes', '伏見稲荷大社')).toBe('sightseeing');
    expect(guessCategory('place', 'house', '道後温泉')).toBe('activity');
  });

  it('分からなければ other', () => {
    expect(guessCategory()).toBe('other');
    expect(guessCategory(null, undefined, '')).toBe('other');
    expect(guessCategory('???')).toBe('other');
  });
});
