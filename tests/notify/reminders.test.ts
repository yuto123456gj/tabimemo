import { describe, expect, it } from 'vitest';
import { buildReminderPayload, reminderKindFor } from '@/lib/notify/push';
import { jstDatePlusDays } from '@/lib/utils/date';

describe('reminderKindFor', () => {
  const target = '2026-11-16';

  it('開始日の1週間前なら start', () => {
    const place = { open_from: target, open_until: '2026-12-25', status: 'want' };
    expect(reminderKindFor(place, target)).toBe('start');
  });

  it('終了日の1週間前なら end', () => {
    const place = { open_from: '2026-10-01', open_until: target, status: 'want' };
    expect(reminderKindFor(place, target)).toBe('end');
  });

  it('「行った！」にしたスポットには終了のお知らせを送らない', () => {
    const place = { open_from: '2026-10-01', open_until: target, status: 'visited' };
    expect(reminderKindFor(place, target)).toBeNull();
  });

  it('「行った！」でも開始のお知らせは送る', () => {
    const place = { open_from: target, open_until: '2026-12-25', status: 'visited' };
    expect(reminderKindFor(place, target)).toBe('start');
  });

  it('1日だけのイベントは start だけにする', () => {
    const place = { open_from: target, open_until: target, status: 'want' };
    expect(reminderKindFor(place, target)).toBe('start');
  });

  it('日付が合わなければ何も送らない', () => {
    const place = { open_from: '2026-12-01', open_until: '2026-12-25', status: 'want' };
    expect(reminderKindFor(place, target)).toBeNull();
  });

  it('営業期間が空なら何も送らない', () => {
    const place = { open_from: null, open_until: null, status: 'want' };
    expect(reminderKindFor(place, target)).toBeNull();
  });
});

describe('buildReminderPayload', () => {
  it('開始1週間前は「始まります」と日付を伝える', () => {
    const payload = buildReminderPayload({
      kind: 'start',
      placeName: '冬のイルミネーション',
      placeId: 'p1',
      date: '2026-12-01',
    });

    expect(payload.title).toContain('始まります');
    expect(payload.body).toContain('「冬のイルミネーション」');
    expect(payload.body).toContain('12月1日');
    expect(payload.url).toBe('/places/p1');
  });

  it('終了1週間前は「終わります」と伝える', () => {
    const payload = buildReminderPayload({
      kind: 'end',
      placeName: '期間限定カフェ',
      placeId: 'p2',
      date: '2026-12-25',
    });

    expect(payload.title).toContain('終わります');
    expect(payload.body).toContain('12月25日');
  });

  it('開始と終了で通知が上書きされないよう tag を分ける', () => {
    const start = buildReminderPayload({ kind: 'start', placeName: 'X', placeId: 'p3', date: '2026-12-01' });
    const end = buildReminderPayload({ kind: 'end', placeName: 'X', placeId: 'p3', date: '2026-12-01' });

    expect(start.tag).not.toBe(end.tag);
  });
});

describe('jstDatePlusDays', () => {
  it('UTCの深夜でも日本時間の日付で数える', () => {
    // 2026-11-09 16:00 UTC = 2026-11-10 01:00 JST
    const now = new Date('2026-11-09T16:00:00Z');
    expect(jstDatePlusDays(0, now)).toBe('2026-11-10');
    expect(jstDatePlusDays(7, now)).toBe('2026-11-17');
  });

  it('月をまたいでも正しく数える', () => {
    const now = new Date('2026-11-25T00:00:00Z');
    expect(jstDatePlusDays(7, now)).toBe('2026-12-02');
  });

  it('年をまたいでも正しく数える', () => {
    const now = new Date('2026-12-28T00:00:00Z');
    expect(jstDatePlusDays(7, now)).toBe('2027-01-04');
  });
});
