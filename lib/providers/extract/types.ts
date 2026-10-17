export interface ExtractedSpot {
  /** 場所検索にかける文字列（「店名 エリア」の形が当たりやすい） */
  query: string;
  /** 推定した店名 */
  name: string | null;
  /** 推定したエリア（渋谷、京都 など） */
  area: string | null;
  /** 推定カテゴリ */
  category: string | null;
  /** 抽出の確信度 0-1 */
  confidence: number;
}

export interface ExtractResult {
  provider: 'claude' | 'rule';
  /** 貼り付けテキストに含まれていた元投稿URL */
  sourceUrl: string | null;
  /** ハッシュタグなどから拾ったタグ候補 */
  tags: string[];
  /** 抽出できたスポット候補（確信度の高い順） */
  spots: ExtractedSpot[];
  memo: string | null;
  note?: string;
}

export interface ExtractProvider {
  readonly id: 'claude' | 'rule';
  readonly label: string;
  extract(text: string): Promise<ExtractResult>;
}
