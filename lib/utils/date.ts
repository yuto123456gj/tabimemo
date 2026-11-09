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


export function toDateInputValue(value: string | Date): string {
  const d = toDate(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 日本時間での「今日」から days 日後の 'YYYY-MM-DD'。
 * サーバー（Vercel）は UTC で動くため、日付の判定は必ずこれを通す。
 */
export function jstDatePlusDays(days: number, now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  jst.setUTCDate(jst.getUTCDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}`;
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
