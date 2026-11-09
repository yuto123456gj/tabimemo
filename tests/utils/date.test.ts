import { describe, expect, it } from 'vitest';
import { formatJaDate, formatJaDateShort, formatJaTime } from '@/lib/utils/date';

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
});
