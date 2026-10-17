/**
 * プロセス内の簡易レートリミット。
 * - minInterval: 連続リクエストの最小間隔（Nominatim の利用規約: 1req/秒）
 * - tokenBucket: IPごとの呼び出し回数制限（APIルートの乱用防止）
 *
 * サーバーレスではインスタンスごとの制限になるため厳密ではないが、
 * 「連続で叩かない」という規約順守には十分に効く。
 */

const lastCallAt = new Map<string, number>();
const queues = new Map<string, Promise<unknown>>();

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** key ごとに直列化し、minIntervalMs 以上の間隔を空けて fn を実行する */
export function throttle<T>(key: string, minIntervalMs: number, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.then(async () => {
    const last = lastCallAt.get(key) ?? 0;
    const wait = last + minIntervalMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt.set(key, Date.now());
    return fn();
  });
  // 失敗しても後続を止めない
  queues.set(
    key,
    next.catch(() => undefined),
  );
  return next;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}
const buckets = new Map<string, Bucket>();

/** 簡易トークンバケット。許可されたら true */
export function takeToken(key: string, capacity = 20, refillPerSec = 0.5): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  const elapsed = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSec);
  b.updatedAt = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}

export function clientKey(req: Request): string {
  const h = req.headers;
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}
