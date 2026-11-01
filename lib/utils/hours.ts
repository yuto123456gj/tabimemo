import { formatJaDateShort, formatJaTime } from './date';

export interface OpeningInfo {
  open_time?: string | null;
  close_time?: string | null;
  open_from?: string | null;
  open_until?: string | null;
  hours_note?: string | null;
}

/** 「11:00〜20:00」のような表示用の文字列。未設定なら null */
export function formatOpeningHours(info: OpeningInfo): string | null {
  const open = info.open_time ? formatJaTime(info.open_time) : null;
  const close = info.close_time ? formatJaTime(info.close_time) : null;
  if (open && close) return `${open}〜${close}`;
  if (open) return `${open}〜`;
  if (close) return `〜${close}`;
  return null;
}

/** 「4/1〜5/31まで」のような営業期間の表示。未設定なら null */
export function formatOpeningPeriod(info: OpeningInfo): string | null {
  const from = info.open_from ? formatJaDateShort(info.open_from) : null;
  const until = info.open_until ? formatJaDateShort(info.open_until) : null;
  if (from && until) return `${from}〜${until}`;
  if (from) return `${from}から`;
  if (until) return `${until}まで`;
  return null;
}

/** その日付が営業期間内か。期間が未設定なら true（判断しない） */
export function isWithinPeriod(info: OpeningInfo, date: string): boolean {
  if (info.open_from && date < info.open_from) return false;
  if (info.open_until && date > info.open_until) return false;
  return true;
}

/**
 * 到着時刻が営業時間内かどうか。
 * 判定できない（時間が未設定）場合は null を返す。
 * 深夜営業（22:00〜翌2:00 のように終了が開始より小さい）にも対応する。
 */
export function isWithinHours(info: OpeningInfo, time: string): boolean | null {
  if (!info.open_time || !info.close_time) return null;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':');
    const hours = Number(h);
    const mins = Number(m);
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
    return hours * 60 + mins;
  };

  const target = toMinutes(time);
  const open = toMinutes(info.open_time);
  const close = toMinutes(info.close_time);
  if (target === null || open === null || close === null) return null;

  // 日をまたぐ営業（例: 22:00〜2:00）
  if (close < open) return target >= open || target <= close;
  return target >= open && target <= close;
}
