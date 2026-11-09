import { describe, expect, it } from 'vitest';
import { buildReminderPayload } from '@/lib/notify/push';
import { jstDatePlusDays } from '@/lib/utils/date';

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
