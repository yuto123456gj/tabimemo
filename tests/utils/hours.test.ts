import { describe, expect, it } from 'vitest';
import { formatOpeningHours, formatOpeningPeriod, isWithinHours, isWithinPeriod } from '@/lib/utils/hours';

describe('formatOpeningHours', () => {
  it('開始と終了がそろえば範囲で表示する', () => {
    expect(formatOpeningHours({ open_time: '11:00:00', close_time: '20:00:00' })).toBe('11:00〜20:00');
  });

  it('片方だけでも表示できる', () => {
    expect(formatOpeningHours({ open_time: '09:30' })).toBe('9:30〜');
    expect(formatOpeningHours({ close_time: '17:00' })).toBe('〜17:00');
  });

  it('未設定なら null', () => {
    expect(formatOpeningHours({})).toBeNull();
  });
});

describe('formatOpeningPeriod', () => {
  it('期間を表示する', () => {
    expect(formatOpeningPeriod({ open_from: '2026-04-01', open_until: '2026-05-31' })).toBe('4/1(水)〜5/31(日)');
  });

  it('片方だけの指定にも対応する', () => {
    expect(formatOpeningPeriod({ open_until: '2026-05-31' })).toBe('5/31(日)まで');
    expect(formatOpeningPeriod({ open_from: '2026-04-01' })).toBe('4/1(水)から');
  });

  it('未設定なら null', () => {
    expect(formatOpeningPeriod({})).toBeNull();
  });
});

describe('isWithinPeriod', () => {
  const info = { open_from: '2026-04-01', open_until: '2026-05-31' };

  it('期間内なら true', () => {
    expect(isWithinPeriod(info, '2026-04-15')).toBe(true);
  });

  it('初日と最終日も含む', () => {
    expect(isWithinPeriod(info, '2026-04-01')).toBe(true);
    expect(isWithinPeriod(info, '2026-05-31')).toBe(true);
  });

  it('期間外なら false', () => {
    expect(isWithinPeriod(info, '2026-03-31')).toBe(false);
    expect(isWithinPeriod(info, '2026-06-01')).toBe(false);
  });

  it('期間が未設定なら判断しない（true）', () => {
    expect(isWithinPeriod({}, '2026-04-15')).toBe(true);
  });
});

describe('isWithinHours', () => {
  const day = { open_time: '11:00', close_time: '20:00' };

  it('営業時間内なら true', () => {
    expect(isWithinHours(day, '12:30')).toBe(true);
  });

  it('開店時刻・閉店時刻ちょうども含む', () => {
    expect(isWithinHours(day, '11:00')).toBe(true);
    expect(isWithinHours(day, '20:00')).toBe(true);
  });

  it('営業時間外なら false', () => {
    expect(isWithinHours(day, '10:59')).toBe(false);
    expect(isWithinHours(day, '21:00')).toBe(false);
  });

  it('深夜営業（日をまたぐ）に対応する', () => {
    const bar = { open_time: '22:00', close_time: '02:00' };
    expect(isWithinHours(bar, '23:30')).toBe(true);
    expect(isWithinHours(bar, '01:00')).toBe(true);
    expect(isWithinHours(bar, '15:00')).toBe(false);
  });

  it('時間が未設定なら判断しない（null）', () => {
    expect(isWithinHours({}, '12:00')).toBeNull();
    expect(isWithinHours({ open_time: '11:00' }, '12:00')).toBeNull();
  });
});
