import { guessCategory } from '@/lib/providers/places/categories';
import type { ExtractProvider, ExtractResult, ExtractedSpot } from './types';

/**
 * ルールベースの簡易抽出（ANTHROPIC_API_KEY が無い時のフォールバック）。
 * 外部通信をしない純粋関数なので Vitest でテストできる。
 */

const URL_RE = /https?:\/\/[^\s<>"'）)」】]+/g;

/** よく使われるエリア名（含まれていればエリアとして採用する） */
const AREA_WORDS = [
  '北海道','札幌','函館','小樽','旭川','青森','弘前','盛岡','仙台','秋田','山形','福島','郡山',
  '東京','新宿','渋谷','原宿','表参道','青山','恵比寿','中目黒','目黒','代官山','下北沢','三軒茶屋',
  '池袋','上野','浅草','日暮里','銀座','有楽町','日本橋','丸の内','神田','秋葉原','神保町','月島',
  '六本木','麻布','西麻布','広尾','赤坂','虎ノ門','品川','大井町','蒲田','吉祥寺','中野','高円寺',
  '荻窪','立川','町田','八王子','豊洲','門前仲町','清澄白河','蔵前','錦糸町','北千住','自由が丘',
  '横浜','中華街','みなとみらい','鎌倉','江ノ島','川崎','武蔵小杉','箱根','湯河原','小田原',
  '千葉','船橋','柏','浦安','さいたま','大宮','川越','所沢','水戸','宇都宮','日光','前橋','高崎','草津',
  '新潟','富山','金沢','福井','山梨','河口湖','長野','松本','軽井沢','岐阜','高山','白川郷',
  '静岡','熱海','伊豆','浜松','名古屋','栄','大須','熱田','豊橋','三重','伊勢','津',
  '滋賀','大津','彦根','京都','嵐山','祇園','河原町','烏丸','伏見','宇治',
  '大阪','梅田','難波','なんば','心斎橋','天王寺','新世界','京橋','福島区','中之島','北新地','堀江',
  '天満','鶴橋','堺','堺筋','阿倍野','大阪城','USJ','神戸','三宮','元町','有馬','姫路','芦屋','西宮',
  '奈良','和歌山','白浜','鳥取','松江','出雲','岡山','倉敷','広島','宮島','尾道','山口','下関',
  '徳島','高松','松山','道後','高知','福岡','博多','天神','中洲','大濠','糸島','北九州','小倉',
  '佐賀','長崎','佐世保','熊本','阿蘇','大分','別府','湯布院','宮崎','鹿児島','指宿','沖縄','那覇',
  '国際通り','石垣','宮古島','恩納','北谷','美ら海',
];

/** 店名っぽさを下げるノイズ語 */
const NOISE_WORDS = [
  'フォロー','いいね','保存','リール','投稿','動画','コメント','プロフィール','リンク','ストーリー',
  '詳細','チェック','おすすめ','pr','ad','ありがとう','営業時間','定休日','アクセス','予約','本日',
  '最後まで','他の投稿','参考に','保存して','行きたい','行ってみたい','めちゃ','やばい','神','最高',
];

/**
 * カテゴリ推定のヒント。上から順に当てるので、具体的なものを先に置く。
 * 「山」「海」「川」のような1文字は地名（松山・和歌山など）に紛れ込むため、
 * 必ず前後の語とセットでマッチさせる。
 */
const CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/(カフェ|cafe|珈琲|コーヒー|喫茶|パンケーキ|スイーツ|ケーキ|パフェ|かき氷)/i, 'cafe'],
  [/(居酒屋|バー|bar|日本酒|ワイン|ビール|クラフトビール|焼酎|飲み)/i, 'bar'],
  [/(ラーメン|寿司|焼肉|焼鳥|定食|食堂|レストラン|ごはん|ランチ|ディナー|そば|うどん|カレー|中華|イタリアン|フレンチ|天ぷら|うなぎ|丼)/i, 'restaurant'],
  [/(ホテル|旅館|ゲストハウス|オーベルジュ|民宿|宿泊|一泊)/i, 'hotel'],
  [/(温泉|湯めぐり|足湯|サウナ|水族館|動物園|遊園地|テーマパーク|体験|工房|アクティビティ|クルーズ)/i, 'activity'],
  [/(神社|神宮|寺|大仏|城|美術館|博物館|展望|観光|名所|世界遺産|庭園|灯台)/i, 'sightseeing'],
  [/(公園|海岸|海沿い|海辺|海水浴|ビーチ|登山|山頂|富士山|滝|湖|渓谷|絶景|紅葉|桜並木|花火|川沿い|森林|高原|鍾乳洞)/i, 'nature'],
  [/(ショップ|雑貨|市場|商店街|ストア|買い物|アウトレット|百貨店)/i, 'shopping'],
];

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function looksNoisy(s: string): boolean {
  const lower = s.toLowerCase();
  return NOISE_WORDS.some((w) => lower.includes(w.toLowerCase()));
}

function cleanName(raw: string): string {
  return raw
    .replace(/[#＃@＠]/g, '')
    // 絵文字・記号（📍🍽 など）を落とす。残すと検索ワードとして邪魔になる
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{20E3}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[-–—・:：|｜>＞\s]+/, '')
    .replace(/[-–—・:：|｜<＜\s]+$/, '')
    .trim();
}

function detectArea(text: string): string | null {
  // 長い地名を優先（「大阪」より「大阪城」）
  const hits = AREA_WORDS.filter((w) => text.includes(w)).sort((a, b) => b.length - a.length);
  return hits[0] ?? null;
}

function detectCategory(text: string): string | null {
  for (const [re, cat] of CATEGORY_HINTS) {
    if (re.test(text)) return cat;
  }
  const guessed = guessCategory(text);
  return guessed === 'other' ? null : guessed;
}

/** テキストから店名候補を拾う */
function collectNameCandidates(text: string): Array<{ name: string; score: number }> {
  const out: Array<{ name: string; score: number }> = [];

  const push = (raw: string | undefined, score: number) => {
    if (!raw) return;
    const name = cleanName(raw);
    if (name.length < 2 || name.length > 40) return;
    if (looksNoisy(name)) return;
    if (/^\d+$/.test(name)) return;
    out.push({ name, score });
  };

  // 1. 括弧でくくられた名前（最も当たりやすい）
  for (const m of text.matchAll(/[「『【\[]([^」』】\]]{2,40})[」』】\]]/g)) push(m[1], 0.9);

  // 2. 「📍店名」「店名：」「お店：店名」「場所: 店名」など
  for (const m of text.matchAll(/(?:📍|🏠|🍽|☕️?|店名|お店|場所|住所|スポット|name)\s*[:：]?\s*([^\n#@、。,]{2,40})/gi)) {
    push(m[1], 0.8);
  }

  // 3. 「〜 @ 渋谷」の @ より前
  for (const m of text.matchAll(/^(.{2,40}?)\s*[@＠]\s*.{1,20}$/gm)) push(m[1], 0.6);

  // 4. ハッシュタグ（エリア名そのものは除く）
  for (const m of text.matchAll(/[#＃]([^\s#＃]{2,30})/g)) {
    const t = cleanName(m[1] ?? '');
    if (!t || AREA_WORDS.includes(t)) continue;
    // 「渋谷カフェ」のような複合タグは店名ではないので低スコア
    push(t, 0.35);
  }

  // 5. 本文の最初の行（キャプションは店名から始まることが多い）
  const firstLine = text.split('\n').map((l) => l.trim()).filter(Boolean)[0];
  push(firstLine, 0.5);

  return out;
}

export function extractWithRules(input: string): ExtractResult {
  const text = (input ?? '').trim();
  const urls = uniq(text.match(URL_RE) ?? []);
  const sourceUrl = urls[0] ?? null;
  const body = text.replace(URL_RE, ' ').trim();

  const tags = uniq(
    Array.from(body.matchAll(/[#＃]([^\s#＃]{1,30})/g))
      .map((m) => cleanName(m[1] ?? ''))
      .filter((t) => t.length >= 2 && t.length <= 20),
  ).slice(0, 8);

  const area = detectArea(body);
  const category = detectCategory(body);

  const candidates = collectNameCandidates(body);

  // 同じ名前はスコアの高い方を残す
  const byName = new Map<string, number>();
  for (const c of candidates) {
    const prev = byName.get(c.name) ?? 0;
    if (c.score > prev) byName.set(c.name, c.score);
  }

  const spots: ExtractedSpot[] = Array.from(byName.entries())
    .map(([name, score]) => ({
      name,
      area,
      category,
      // 検索精度を上げるため、エリア名が名前に含まれていなければ足す
      query: area && !name.includes(area) ? `${name} ${area}` : name,
      confidence: Math.min(0.95, score),
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  // 何も拾えなくてもエリアだけで検索できるようにする
  if (spots.length === 0 && area) {
    spots.push({ name: null, area, category, query: area, confidence: 0.2 });
  }

  return {
    provider: 'rule',
    sourceUrl,
    tags,
    spots,
    memo: body ? body.slice(0, 500) : null,
    note:
      spots.length === 0
        ? 'テキストから場所を見つけられませんでした。店名を直接入力して検索してください。'
        : undefined,
  };
}

export const ruleExtractProvider: ExtractProvider = {
  id: 'rule',
  label: 'かんたん抽出（ルールベース）',
  async extract(text: string) {
    return extractWithRules(text);
  },
};
