import { haversineDistance } from '@/lib/route/geo';

/**
 * 重複スポットの判定（Google Takeout の一括インポート用）。
 * 名前の類似度 + 座標の距離（既定50m以内）で「同じ場所」とみなす。
 */

const DEFAULT_DISTANCE_METERS = 50;
const DEFAULT_NAME_SIMILARITY = 0.6;

/** 比較用に名前を正規化する（全角→半角、記号除去、支店表記の除去） */
export function normalizeName(input: string): string {
  return (input ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s　]+/g, '')
    .replace(/[()（）「」『』【】\[\]{}<>〈〉・,，.。、:：;；!！?？'"’”`~^|/\\\-–—_+*=&#@]/g, '')
    .replace(/(店|本店|支店|駅前店|総本店)$/u, '');
}

/** 文字列を2-gram集合にする */
function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  if (s.length === 0) return out;
  if (s.length === 1) {
    out.add(s);
    return out;
  }
  for (let i = 0; i < s.length - 1; i += 1) out.add(s.slice(i, i + 2));
  return out;
}

/**
 * 名前の類似度（Dice係数, 0〜1）。
 * 日本語は単語分割が難しいので文字bigramで比べる。
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // 片方がもう片方を完全に含む場合（「スターバックス」vs「スターバックス渋谷」）
  if (na.includes(nb) || nb.includes(na)) {
    const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
    return Math.max(0.8, ratio);
  }
  const ba = bigrams(na);
  const bb = bigrams(nb);
  let shared = 0;
  for (const g of ba) if (bb.has(g)) shared += 1;
  return (2 * shared) / (ba.size + bb.size);
}

export interface DedupeTarget {
  name: string;
  lat: number;
  lng: number;
  externalId?: string | null;
}

export interface DedupeOptions {
  distanceMeters?: number;
  nameSimilarity?: number;
}

/** 2件が同じ場所か */
export function isSamePlace(a: DedupeTarget, b: DedupeTarget, options: DedupeOptions = {}): boolean {
  // 外部IDが一致すれば確実に同じ
  if (a.externalId && b.externalId && a.externalId === b.externalId) return true;

  const maxDistance = options.distanceMeters ?? DEFAULT_DISTANCE_METERS;
  const minSimilarity = options.nameSimilarity ?? DEFAULT_NAME_SIMILARITY;

  const distance = haversineDistance(a, b);
  if (distance > maxDistance) return false;
  return nameSimilarity(a.name, b.name) >= minSimilarity;
}

/** existing の中に同じ場所があればそれを返す */
export function findDuplicate<T extends DedupeTarget>(
  candidate: DedupeTarget,
  existing: T[],
  options?: DedupeOptions,
): T | null {
  for (const item of existing) {
    if (isSamePlace(candidate, item, options)) return item;
  }
  return null;
}

/** インポート候補から、既存および候補内の重複を除く */
export function dedupeCandidates<T extends DedupeTarget>(
  candidates: T[],
  existing: DedupeTarget[],
  options?: DedupeOptions,
): { unique: T[]; duplicates: T[] } {
  const unique: T[] = [];
  const duplicates: T[] = [];
  const seen: DedupeTarget[] = [...existing];

  for (const candidate of candidates) {
    if (findDuplicate(candidate, seen, options)) {
      duplicates.push(candidate);
    } else {
      unique.push(candidate);
      seen.push(candidate);
    }
  }
  return { unique, duplicates };
}
