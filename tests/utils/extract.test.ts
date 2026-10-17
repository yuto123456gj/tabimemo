import { describe, expect, it } from 'vitest';
import { extractWithRules } from '@/lib/providers/extract/rule';

describe('extractWithRules', () => {
  it('Instagram風のキャプションから店名とエリアを拾う', () => {
    const text = [
      '📍喫茶ソワレ',
      '京都の河原町にある老舗喫茶。ゼリーポンチが可愛すぎた☕️',
      '#京都カフェ #喫茶店 #ゼリーポンチ',
      'https://www.instagram.com/p/ABC123/',
    ].join('\n');

    const result = extractWithRules(text);
    expect(result.provider).toBe('rule');
    expect(result.sourceUrl).toBe('https://www.instagram.com/p/ABC123/');
    expect(result.spots.length).toBeGreaterThan(0);
    expect(result.spots[0].name).toBe('喫茶ソワレ');
    expect(result.spots[0].area).toBe('河原町');
    expect(result.spots[0].query).toContain('喫茶ソワレ');
    expect(result.spots[0].category).toBe('cafe');
    expect(result.tags).toContain('京都カフェ');
  });

  it('括弧でくくられた店名を最優先する', () => {
    const result = extractWithRules('渋谷で見つけた「ブルーボトルコーヒー」が最高だった');
    expect(result.spots[0].name).toBe('ブルーボトルコーヒー');
    expect(result.spots[0].area).toBe('渋谷');
  });

  it('候補は最大3件', () => {
    const text = '「A店」「B店」「C店」「D店」「E店」 大阪';
    expect(extractWithRules(text).spots.length).toBeLessThanOrEqual(3);
  });

  it('エリアしか分からない時はエリアで検索できるようにする', () => {
    const result = extractWithRules('沖縄に行きたい');
    expect(result.spots[0].area).toBe('沖縄');
    expect(result.spots[0].query).toBe('沖縄');
  });

  it('長い地名を優先する（大阪より大阪城）', () => {
    const result = extractWithRules('「お好み焼き屋さん」に行った 大阪城のそば');
    expect(result.spots[0].area).toBe('大阪城');
  });

  it('カテゴリを推定する', () => {
    expect(extractWithRules('「鳥貴族」で飲んだ 新宿 #居酒屋').spots[0].category).toBe('bar');
    expect(extractWithRules('「金閣寺」の紅葉 京都 #寺').spots[0].category).toBe('sightseeing');
    expect(extractWithRules('「道後温泉」最高 松山').spots[0].category).toBe('activity');
  });

  it('URLしか無ければ案内メッセージを返す', () => {
    const result = extractWithRules('https://www.tiktok.com/@user/video/123');
    expect(result.sourceUrl).toBe('https://www.tiktok.com/@user/video/123');
    expect(result.spots).toHaveLength(0);
    expect(result.note).toBeTruthy();
  });

  it('空文字でも落ちない', () => {
    const result = extractWithRules('');
    expect(result.spots).toHaveLength(0);
    expect(result.sourceUrl).toBeNull();
  });

  it('「フォローしてね」のような定型文は店名にしない', () => {
    const result = extractWithRules('「フォローしてね」 渋谷のカフェ');
    expect(result.spots.every((s) => s.name !== 'フォローしてね')).toBe(true);
  });
});
