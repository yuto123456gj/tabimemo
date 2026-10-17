import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';
import { extractWithRules } from './rule';
import type { ExtractProvider, ExtractResult, ExtractedSpot } from './types';

/** 抽出に使うモデル。差し替えたい時はここだけ変える。 */
const MODEL = 'claude-opus-5-5';

const SYSTEM_PROMPT = `あなたは旅行メモアプリの抽出アシスタントです。
ユーザーがSNS投稿から貼り付けたテキストを読み、訪れたい「場所」を特定します。

次のJSONだけを出力してください（説明文やコードフェンスは禁止）:
{
  "spots": [
    {
      "name": "店名または場所名（分からなければ null）",
      "area": "エリア・市区町村・駅名（分からなければ null）",
      "category": "restaurant|cafe|sightseeing|nature|shopping|hotel|bar|activity|other のいずれか、不明なら null",
      "query": "地図検索にかける文字列。原則『店名 エリア』の形",
      "confidence": 0.0〜1.0 の数値
    }
  ],
  "tags": ["ハッシュタグなどから拾ったタグ（#は外す）"],
  "memo": "この場所についての短いメモ（本文の要約。80文字以内）または null"
}

ルール:
- spots は最大3件。確信度の高い順に並べる。
- 推測で架空の店名を作らない。読み取れない時は name を null にして area だけ返す。
- テキストに無い住所や電話番号を補完しない。
- 日本語で返す。`;

function toSpots(raw: unknown): ExtractedSpot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): ExtractedSpot | null => {
      if (typeof item !== 'object' || item === null) return null;
      const o = item as Record<string, unknown>;
      const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : null;
      const area = typeof o.area === 'string' && o.area.trim() ? o.area.trim() : null;
      const query =
        typeof o.query === 'string' && o.query.trim()
          ? o.query.trim()
          : [name, area].filter(Boolean).join(' ');
      if (!query) return null;
      const confidence = typeof o.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : 0.5;
      return {
        name,
        area,
        category: typeof o.category === 'string' && o.category !== 'null' ? o.category : null,
        query,
        confidence,
      };
    })
    .filter((s): s is ExtractedSpot => s !== null)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/** モデル出力からJSON部分だけを取り出す（コードフェンス付きで返ってきても耐える） */
function parseJsonLoose(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(body.slice(start, end + 1));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const claudeExtractProvider: ExtractProvider = {
  id: 'claude',
  label: 'Claude による抽出',

  async extract(text: string): Promise<ExtractResult> {
    const fallback = extractWithRules(text);
    if (!env.anthropicKey) return fallback;

    const client = new Anthropic({ apiKey: env.anthropicKey });

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        // 軽い抽出タスクなので effort は low（Opus 5.5 は thinking が常にON）
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: text.slice(0, 6000) }],
      });

      if (response.stop_reason === 'refusal') {
        return { ...fallback, note: 'Claude が抽出を見送ったため、かんたん抽出の結果を表示しています。' };
      }

      const output = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n');

      const parsed = parseJsonLoose(output);
      if (!parsed) {
        return { ...fallback, note: 'Claude の応答を解釈できなかったため、かんたん抽出にフォールバックしました。' };
      }

      const spots = toSpots(parsed.spots);
      if (spots.length === 0) {
        return { ...fallback, note: 'Claude は場所を特定できませんでした。手動で検索してください。' };
      }

      const tags = Array.isArray(parsed.tags)
        ? parsed.tags.filter((t): t is string => typeof t === 'string').map((t) => t.replace(/^[#＃]/, '')).slice(0, 8)
        : fallback.tags;

      return {
        provider: 'claude',
        sourceUrl: fallback.sourceUrl,
        tags,
        spots,
        memo: typeof parsed.memo === 'string' && parsed.memo.trim() ? parsed.memo.trim() : fallback.memo,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      return { ...fallback, note: `Claude 呼び出しに失敗したためかんたん抽出を使いました（${message}）` };
    }
  },
};
