import { categoryMeta } from '@/lib/constants';

export const CATEGORY_LABEL_MAX = 12;

export type CategoryInput = { ok: true; label: string; emoji: string } | { ok: false; error: string };

/**
 * 自分で作るカテゴリの入力チェック。
 * 名前は必須（長すぎるものは断る）。絵文字は任意で、空なら 📍 を使う。
 */
export function normalizeCategoryInput(label: string, emoji: string): CategoryInput {
  const name = label.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'カテゴリの名前を入れてください。' };
  if ([...name].length > CATEGORY_LABEL_MAX) {
    return { ok: false, error: `カテゴリの名前は${CATEGORY_LABEL_MAX}文字までにしてください。` };
  }

  // 絵文字は1文字だけ使う（複数貼られてもチップが崩れないように）
  const picked = [...emoji.trim()].slice(0, 4).join('');
  return { ok: true, label: name, emoji: picked || '📍' };
}

/**
 * スポットに出すカテゴリの見た目。
 * グループのカテゴリ設定を優先し、無ければ既定（最後は「その他」）にする。
 */
export function placeCategoryMeta(place: {
  category: string | null;
  category_meta?: { label: string; emoji: string } | null;
}): { label: string; emoji: string } {
  return place.category_meta ?? categoryMeta(place.category);
}

/**
 * 写真が無いスポットの下地に使う色（色相）。
 *
 * 色相をそのままばらけさせると一覧が虹色になるので、
 * ブランドになじむ8色から、カテゴリ名で選ぶ（同じ名前なら必ず同じ色）。
 */
const TINT_HUES = [18, 35, 48, 95, 165, 200, 258, 330];

export function categoryHue(value: string | null): number {
  if (!value) return TINT_HUES[0];
  let hash = 0;
  for (const ch of value) {
    hash = (hash * 31 + ch.codePointAt(0)!) % 1000;
  }
  return TINT_HUES[hash % TINT_HUES.length];
}
