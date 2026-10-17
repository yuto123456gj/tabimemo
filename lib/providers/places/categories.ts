import type { PlaceCategory } from '@/lib/constants';

/**
 * OSM / Google のタイプ文字列や自由文から、アプリのカテゴリを推定する。
 *
 * 注意: 英単語の部分一致は誤判定のもと（"parking" が "park" に当たるなど）。
 * そのため英語のタイプは「完全一致」で判定し、部分一致は日本語の自由文だけに使う。
 */

/** OSM の type/class、Google の types に現れる値 → カテゴリ */
const EXACT: Record<string, PlaceCategory> = {
  // 飲食
  restaurant: 'restaurant',
  fast_food: 'restaurant',
  food: 'restaurant',
  food_court: 'restaurant',
  meal_takeaway: 'restaurant',
  meal_delivery: 'restaurant',
  japanese_restaurant: 'restaurant',
  ramen_restaurant: 'restaurant',
  sushi_restaurant: 'restaurant',
  italian_restaurant: 'restaurant',
  chinese_restaurant: 'restaurant',
  french_restaurant: 'restaurant',
  seafood_restaurant: 'restaurant',
  steak_house: 'restaurant',
  diner: 'restaurant',

  // カフェ
  cafe: 'cafe',
  coffee_shop: 'cafe',
  bakery: 'cafe',
  ice_cream: 'cafe',
  ice_cream_shop: 'cafe',
  tea_house: 'cafe',
  dessert_shop: 'cafe',
  confectionery: 'cafe',
  patisserie: 'cafe',

  // 酒
  bar: 'bar',
  pub: 'bar',
  biergarten: 'bar',
  nightclub: 'bar',
  night_club: 'bar',
  wine_bar: 'bar',
  sake_bar: 'bar',
  izakaya: 'bar',
  brewery: 'bar',

  // 宿
  hotel: 'hotel',
  hostel: 'hotel',
  motel: 'hotel',
  guest_house: 'hotel',
  guesthouse: 'hotel',
  ryokan: 'hotel',
  lodging: 'hotel',
  camp_site: 'hotel',
  campground: 'hotel',
  apartment: 'hotel',
  resort_hotel: 'hotel',

  // 観光
  place_of_worship: 'sightseeing',
  religious: 'sightseeing',
  shinto: 'sightseeing',
  buddhist: 'sightseeing',
  temple: 'sightseeing',
  shrine: 'sightseeing',
  monastery: 'sightseeing',
  church: 'sightseeing',
  attraction: 'sightseeing',
  tourist_attraction: 'sightseeing',
  museum: 'sightseeing',
  art_gallery: 'sightseeing',
  gallery: 'sightseeing',
  artwork: 'sightseeing',
  castle: 'sightseeing',
  ruins: 'sightseeing',
  monument: 'sightseeing',
  memorial: 'sightseeing',
  viewpoint: 'sightseeing',
  observation_deck: 'sightseeing',
  historical_landmark: 'sightseeing',
  historical_place: 'sightseeing',
  landmark: 'sightseeing',
  lighthouse: 'sightseeing',
  tower: 'sightseeing',

  // 自然
  park: 'nature',
  national_park: 'nature',
  state_park: 'nature',
  garden: 'nature',
  botanical_garden: 'nature',
  beach: 'nature',
  peak: 'nature',
  volcano: 'nature',
  waterfall: 'nature',
  forest: 'nature',
  wood: 'nature',
  nature_reserve: 'nature',
  hiking_area: 'nature',
  bay: 'nature',
  island: 'nature',
  cliff:'nature',
  river: 'nature',
  lake: 'nature',
  water: 'nature',

  // 体験
  zoo: 'activity',
  aquarium: 'activity',
  theme_park: 'activity',
  amusement_park: 'activity',
  water_park: 'activity',
  onsen: 'activity',
  hot_spring: 'activity',
  spa: 'activity',
  public_bath: 'activity',
  sauna: 'activity',
  bowling_alley: 'activity',
  karaoke: 'activity',
  cinema: 'activity',
  movie_theater: 'activity',
  stadium: 'activity',
  tourist_information: 'activity',

  // 買い物
  mall: 'shopping',
  shopping_mall: 'shopping',
  department_store: 'shopping',
  supermarket: 'shopping',
  marketplace: 'shopping',
  market: 'shopping',
  convenience_store: 'shopping',
  store: 'shopping',
  shop: 'shopping',
  clothing_store: 'shopping',
  book_store: 'shopping',
  gift_shop: 'shopping',
  souvenir: 'shopping',

  // 明示的に「その他」にしたいもの（誤判定しやすい）
  parking: 'other',
  bus_stop: 'other',
  station: 'other',
  train_station: 'other',
  subway_station: 'other',
  bus_station: 'other',
  airport: 'other',
  toilets: 'other',
  atm: 'other',
  bank: 'other',
  hospital: 'other',
  pharmacy: 'other',
  school: 'other',
  university: 'other',
  post_office: 'other',
};

/**
 * 意味を持たないタグ値。
 * これらを「その他」と即断すると、名前（例: 伏見稲荷大社）からの推定を
 * 邪魔してしまうので、判定材料から外す。
 */
const NO_SIGNAL = new Set(['yes', 'no', 'house', 'building', 'residential', 'unclassified', 'point', 'feature', 'place']);

/** 日本語の自由文向け（部分一致）。具体的なものから順に当てる。 */
const JA_RULES: Array<[RegExp, PlaceCategory]> = [
  [/(カフェ|珈琲|コーヒー|喫茶|パンケーキ|ケーキ|パフェ|かき氷|スイーツ|ベーカリー)/, 'cafe'],
  [/(居酒屋|立ち飲み|バル|日本酒|焼酎|ワインバー|クラフトビール|ビアガーデン)/, 'bar'],
  [/(ラーメン|寿司|鮨|焼肉|焼鳥|定食|食堂|レストラン|そば|蕎麦|うどん|カレー|天ぷら|うなぎ|丼|中華|イタリアン|フレンチ|お好み焼|たこ焼|串カツ)/, 'restaurant'],
  [/(ホテル|旅館|民宿|ゲストハウス|オーベルジュ|宿泊|キャンプ場)/, 'hotel'],
  [/(温泉|湯けむり|足湯|サウナ|水族館|動物園|遊園地|テーマパーク|体験|工房|クルーズ|映画館|ボウリング)/, 'activity'],
  [/(神社|神宮|大社|寺|院|大仏|城|閣|美術館|博物館|展望台|タワー|記念館|庭園|灯台|世界遺産|名所)/, 'sightseeing'],
  [/(公園|海岸|海水浴場|ビーチ|山頂|登山|滝|湖|池|渓谷|高原|鍾乳洞|森林|並木)/, 'nature'],
  [/(商店街|市場|百貨店|デパート|モール|アウトレット|雑貨|書店|土産)/, 'shopping'],
];

/** 英数字の値をトークンに分解する（"amenity:place_of_worship" → ["amenity","place","of","worship"]） */
function asciiTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter(Boolean);
}

export function guessCategory(...hints: Array<string | null | undefined>): PlaceCategory {
  const values = hints.filter((h): h is string => Boolean(h));

  // 1. 英語のタイプは完全一致で判定（部分一致による誤判定を避ける）
  for (const value of values) {
    for (const token of asciiTokens(value)) {
      if (NO_SIGNAL.has(token)) continue;
      const hit = EXACT[token];
      if (hit) return hit;
    }
  }

  // 2. 日本語を含む自由文は部分一致で判定
  const text = values.join(' ');
  for (const [pattern, category] of JA_RULES) {
    if (pattern.test(text)) return category;
  }

  return 'other';
}
