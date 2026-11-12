import { describe, expect, it } from 'vitest';
import { normalizeCategoryInput, placeCategoryMeta } from '@/lib/utils/category';

describe('normalizeCategoryInput', () => {
  it('前後の空白を落として受け取る', () => {
    const result = normalizeCategoryInput('  ラーメン  ', '🍜');
    expect(result).toEqual({ ok: true, label: 'ラーメン', emoji: '🍜' });
  });

  it('名前が空なら断る', () => {
    expect(normalizeCategoryInput('   ', '🍜')).toEqual({
      ok: false,
      error: 'カテゴリの名前を入れてください。',
    });
  });

  it('長すぎる名前は断る（絵文字まじりでも文字数で数える）', () => {
    const result = normalizeCategoryInput('あ'.repeat(13), '🍜');
    expect(result.ok).toBe(false);
  });

  it('ちょうど12文字は通る', () => {
    const result = normalizeCategoryInput('あ'.repeat(12), '🍜');
    expect(result.ok).toBe(true);
  });

  it('アイコンが空なら 📍 を使う', () => {
    const result = normalizeCategoryInput('温泉', '  ');
    expect(result).toEqual({ ok: true, label: '温泉', emoji: '📍' });
  });
});

describe('placeCategoryMeta', () => {
  it('グループの設定があればそれを使う', () => {
    const meta = placeCategoryMeta({ category: 'ラーメン', category_meta: { label: 'ラーメン', emoji: '🍜' } });
    expect(meta).toEqual({ label: 'ラーメン', emoji: '🍜' });
  });

  it('設定が無ければ既定のカテゴリにあてはめる', () => {
    expect(placeCategoryMeta({ category: 'cafe' })).toMatchObject({ label: 'カフェ' });
  });

  it('カテゴリ無し（削除された後など）は「その他」になる', () => {
    expect(placeCategoryMeta({ category: null, category_meta: null })).toMatchObject({ label: 'その他' });
  });
});
