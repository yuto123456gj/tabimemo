import { describe, expect, it } from 'vitest';
import { buildPlaceAddedPayload } from '@/lib/notify/push';

describe('buildPlaceAddedPayload', () => {
  it('追加した人とスポット名が本文に入る', () => {
    const payload = buildPlaceAddedPayload({
      actorName: 'ゆうと',
      placeName: '喫茶ツバメ',
      placeId: 'abc-123',
    });

    expect(payload.body).toBe('ゆうとさんが「喫茶ツバメ」を追加しました');
    expect(payload.url).toBe('/places/abc-123');
  });

  it('カテゴリの絵文字がタイトルに付く', () => {
    const payload = buildPlaceAddedPayload({
      actorName: 'ゆうと',
      placeName: '喫茶ツバメ',
      placeId: 'abc-123',
      category: 'cafe',
    });

    expect(payload.title.startsWith('☕️')).toBe(true);
  });

  it('同じスポットの通知が重ならないよう tag にIDを使う', () => {
    const a = buildPlaceAddedPayload({ actorName: 'A', placeName: 'X', placeId: 'p1' });
    const b = buildPlaceAddedPayload({ actorName: 'B', placeName: 'Y', placeId: 'p1' });

    expect(a.tag).toBe(b.tag);
    expect(a.tag).toBe('place-p1');
  });

  it('名前が空でも通知が壊れない', () => {
    const payload = buildPlaceAddedPayload({ actorName: '  ', placeName: '  ', placeId: 'p2' });

    expect(payload.body).toBe('メンバーさんが「新しいスポット」を追加しました');
  });
});
