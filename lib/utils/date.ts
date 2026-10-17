const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  // 'YYYY-MM-DD' はローカル日付として扱う（UTC解釈で1日ずれるのを防ぐ）
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

/** 2026年10月17日(金) */
export function formatJaDate(value: string | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
}

/** 10/17(金) */
export function formatJaDateShort(value: string | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

/** 10月17日(金) */
export function formatJaMonthDay(value: string | Date): string {
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`;
}

/** 'HH:MM:SS' / 'HH:MM' → '9:30' */
export function formatJaTime(value: string | null | undefined): string {
  if (!value) return '';
  const [h, m] = value.split(':');
  if (h === undefined || m === undefined) return value;
  return `${Number(h)}:${m}`;
}

/** 滞在時間（分）→ '1時間30分' */
export function formatStayMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export function toDateInputValue(value: string | Date): string {
  const d = toDate(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 旅行の開始日〜終了日の日付配列（しおりのタブに使う） */
export function tripDates(startDate: string, endDate: string): string[] {
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const out: string[] = [];
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 90) {
    out.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return out.length > 0 ? out : [toDateInputValue(start)];
}

export function dayCount(startDate: string, endDate: string): number {
  return tripDates(startDate, endDate).length;
}

/** その日付がday_index何番目か */
export function dateForDayIndex(startDate: string, dayIndex: number): string {
  const d = toDate(startDate);
  d.setDate(d.getDate() + dayIndex);
  return toDateInputValue(d);
}

/** 「2泊3日」のような表記 */
export function tripLengthLabel(startDate: string, endDate: string): string {
  const days = dayCount(startDate, endDate);
  if (days <= 1) return '日帰り';
  return `${days - 1}泊${days}日`;
}

/** 進行中 / これから / 終わった */
export function tripPhase(startDate: string, endDate: string, now = new Date()): 'upcoming' | 'ongoing' | 'past' {
  const today = toDateInputValue(now);
  if (today < toDateInputValue(toDate(startDate))) return 'upcoming';
  if (today > toDateInputValue(toDate(endDate))) return 'past';
  return 'ongoing';
}

export function formatYen(amount: number): string {
  return `¥${Math.round(amount).toLocaleString('ja-JP')}`;
}

export function relativeFromNow(value: string | Date): string {
  const d = toDate(value);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たったいま';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return formatJaDateShort(d);
}
