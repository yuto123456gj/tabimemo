import { describe, expect, it } from 'vitest';
import {
  dateForDayIndex,
  dayCount,
  formatJaDate,
  formatJaDateShort,
  formatJaTime,
  formatStayMinutes,
  formatYen,
  tripDates,
  tripLengthLabel,
  tripPhase,
} from '@/lib/utils/date';

describe('日付フォーマット', () => {
  it('日本語の日付になる', () => {
    expect(formatJaDate('2026-10-17')).toBe('2026年10月17日(土)');
    expect(formatJaDateShort('2026-10-17')).toBe('10/17(土)');
  });

  it('タイムゾーンで1日ずれない', () => {
    expect(formatJaDateShort('2026-01-01')).toBe('1/1(木)');
  });

  it('時刻は先頭の0を落とす', () => {
    expect(formatJaTime('09:30:00')).toBe('9:30');
    expect(formatJaTime('18:05')).toBe('18:05');
    expect(formatJaTime(null)).toBe('');
  });

  it('滞在時間を読みやすくする', () => {
    expect(formatStayMinutes(45)).toBe('45分');
    expect(formatStayMinutes(60)).toBe('1時間');
    expect(formatStayMinutes(90)).toBe('1時間30分');
    expect(formatStayMinutes(null)).toBe('');
  });

  it('金額は円表記', () => {
    expect(formatYen(12345)).toBe('¥12,345');
  });
});

describe('旅程の日付', () => {
  it('開始日から終了日までの配列を作る', () => {
    expect(tripDates('2026-05-01', '2026-05-03')).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
    expect(dayCount('2026-05-01', '2026-05-03')).toBe(3);
  });

  it('月をまたいでも正しい', () => {
    expect(tripDates('2026-04-30', '2026-05-02')).toEqual(['2026-04-30', '2026-05-01', '2026-05-02']);
  });

  it('同日なら1日', () => {
    expect(tripDates('2026-05-01', '2026-05-01')).toEqual(['2026-05-01']);
    expect(tripLengthLabel('2026-05-01', '2026-05-01')).toBe('日帰り');
  });

  it('泊数の表記', () => {
    expect(tripLengthLabel('2026-05-01', '2026-05-03')).toBe('2泊3日');
  });

  it('day_index から日付を求められる', () => {
    expect(dateForDayIndex('2026-05-01', 0)).toBe('2026-05-01');
    expect(dateForDayIndex('2026-05-01', 2)).toBe('2026-05-03');
  });

  it('終了日が開始日より前なら開始日だけ返す', () => {
    expect(tripDates('2026-05-03', '2026-05-01')).toEqual(['2026-05-03']);
  });
});

describe('tripPhase', () => {
  it('これから / 進行中 / 終了 を判定する', () => {
    const now = new Date(2026, 4, 2); // 2026-05-02
    expect(tripPhase('2026-06-01', '2026-06-03', now)).toBe('upcoming');
    expect(tripPhase('2026-05-01', '2026-05-03', now)).toBe('ongoing');
    expect(tripPhase('2026-04-01', '2026-04-03', now)).toBe('past');
  });

  it('初日と最終日は進行中', () => {
    const now = new Date(2026, 4, 1);
    expect(tripPhase('2026-05-01', '2026-05-03', now)).toBe('ongoing');
    expect(tripPhase('2026-04-28', '2026-05-01', now)).toBe('ongoing');
  });
});
