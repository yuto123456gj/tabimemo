/**
 * 動作確認用のシードデータを投入する。
 *
 *   npm run seed -- you@example.com
 *   （または SEED_USER_EMAIL=you@example.com npm run seed）
 *
 * 前提:
 *  - supabase/migrations のSQLを流し終えていること
 *  - .env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY があること
 *  - 対象のメールアドレスで一度ログイン（サインアップ）済みであること
 *
 * service role キーを使うのでRLSを迂回します。ローカル／自分のプロジェクトでのみ実行してください。
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GROUP_NAME = 'サンプル: 行きたい場所';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。');
  process.exit(1);
}

const email = process.argv[2] ?? process.env.SEED_USER_EMAIL ?? '';
if (!email) {
  console.error('✗ 対象のメールアドレスを指定してください: npm run seed -- you@example.com');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  memo?: string;
  status?: 'want' | 'visited';
  tags?: string[];
}

/** 東京・大阪の実在スポット（座標はおおよその位置） */
const PLACES: SeedPlace[] = [
  // --- 東京 ---
  { name: '東京スカイツリー', address: '東京都墨田区押上1-1-2', lat: 35.7101, lng: 139.8107, category: 'sightseeing', memo: '夜景がきれい。チケットは事前予約がおすすめ', tags: ['定番', '夜景'] },
  { name: '浅草寺', address: '東京都台東区浅草2-3-1', lat: 35.7148, lng: 139.7967, category: 'sightseeing', memo: '仲見世通りで食べ歩き', tags: ['定番'] },
  { name: '明治神宮', address: '東京都渋谷区代々木神園町1-1', lat: 35.6764, lng: 139.6993, category: 'sightseeing', tags: ['朝イチ'] },
  { name: '新宿御苑', address: '東京都新宿区内藤町11', lat: 35.6852, lng: 139.71, category: 'nature', memo: '桜と紅葉の季節が特に良い', tags: ['のんびり'] },
  { name: 'teamLab Planets TOKYO', address: '東京都江東区豊洲6-1-16', lat: 35.6487, lng: 139.7901, category: 'activity', memo: '裸足になるので脱ぎやすい靴で', tags: ['雨の日でもOK'] },
  { name: 'ブルーボトルコーヒー 清澄白河', address: '東京都江東区平野1-4-8', lat: 35.6816, lng: 139.8008, category: 'cafe', memo: '朝の時間帯が空いている', status: 'visited', tags: ['カフェ'] },
  { name: '築地場外市場', address: '東京都中央区築地4-16-2', lat: 35.6654, lng: 139.7707, category: 'restaurant', memo: '午前中に行くのが鉄則', tags: ['朝ごはん'] },
  { name: '豊洲市場', address: '東京都江東区豊洲6-6-1', lat: 35.645, lng: 139.7867, category: 'restaurant', tags: ['朝ごはん'] },
  { name: '代官山 蔦屋書店', address: '東京都渋谷区猿楽町17-5', lat: 35.649, lng: 139.703, category: 'shopping', memo: '夜までやっているので時間調整に', tags: ['雨の日でもOK'] },
  { name: '新宿ゴールデン街', address: '東京都新宿区歌舞伎町1-1-6', lat: 35.694, lng: 139.7045, category: 'bar', memo: 'チャージがある店が多い', tags: ['夜'] },
  { name: '上野動物園', address: '東京都台東区上野公園9-83', lat: 35.7166, lng: 139.7714, category: 'activity', tags: ['family'] },
  { name: '渋谷スクランブル交差点', address: '東京都渋谷区道玄坂2-1', lat: 35.6595, lng: 139.7005, category: 'sightseeing', status: 'visited', tags: ['定番'] },

  // --- 大阪 ---
  { name: '大阪城', address: '大阪府大阪市中央区大阪城1-1', lat: 34.6873, lng: 135.5259, category: 'sightseeing', memo: '天守閣からの眺めが良い', tags: ['定番'] },
  { name: '道頓堀', address: '大阪府大阪市中央区道頓堀1', lat: 34.6687, lng: 135.5013, category: 'restaurant', memo: 'たこ焼きとグリコの看板', tags: ['定番', '食べ歩き'] },
  { name: '通天閣', address: '大阪府大阪市浪速区恵美須東1-18-6', lat: 34.6525, lng: 135.5063, category: 'sightseeing', tags: ['定番'] },
  { name: '串カツ だるま 新世界総本店', address: '大阪府大阪市浪速区恵美須東2-3-9', lat: 34.6522, lng: 135.5061, category: 'restaurant', memo: 'ソースの二度づけ禁止', tags: ['夜'] },
  { name: '海遊館', address: '大阪府大阪市港区海岸通1-1-10', lat: 34.6545, lng: 135.4289, category: 'activity', memo: '夕方以降は比較的空いている', tags: ['雨の日でもOK'] },
  { name: '黒門市場', address: '大阪府大阪市中央区日本橋2-4-1', lat: 34.6652, lng: 135.5063, category: 'shopping', tags: ['食べ歩き'] },
  { name: '梅田スカイビル 空中庭園展望台', address: '大阪府大阪市北区大淀中1-1-88', lat: 34.7054, lng: 135.4902, category: 'sightseeing', memo: '日没の30分前がベスト', tags: ['夜景'] },
  { name: 'ユニバーサル・スタジオ・ジャパン', address: '大阪府大阪市此花区桜島2-1-33', lat: 34.6654, lng: 135.4323, category: 'activity', memo: '1日がかり。朝イチ入場推奨', tags: ['丸一日'] },
  { name: '中之島公園', address: '大阪府大阪市北区中之島1', lat: 34.6927, lng: 135.5075, category: 'nature', tags: ['のんびり'] },
  { name: '北新地 お初天神通り', address: '大阪府大阪市北区曽根崎2-5-4', lat: 34.7008, lng: 135.5005, category: 'bar', tags: ['夜'] },
];

async function main() {
  console.log(`▶ シード投入を開始します（対象: ${email}）`);

  // 1. ユーザーを探す
  const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;

  const user = usersPage.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`✗ ユーザーが見つかりません: ${email}`);
    console.error('  先にアプリでログイン（サインアップ）してから実行してください。');
    process.exit(1);
  }
  console.log(`✓ ユーザーを確認: ${user.email}`);

  // 2. プロフィール（トリガーが動いていない場合に備える）
  await supabase
    .from('profiles')
    .upsert({ id: user.id, display_name: user.email?.split('@')[0] ?? 'たびびと' }, { onConflict: 'id' });

  // 3. サンプルグループ（すでにあれば中身を入れ替える）
  const { data: existing } = await supabase.from('groups').select('id').eq('name', GROUP_NAME).eq('created_by', user.id).maybeSingle();

  let groupId = existing?.id as string | undefined;

  if (groupId) {
    console.log('… 既存のサンプルグループを初期化します');
    await supabase.from('trips').delete().eq('group_id', groupId);
    await supabase.from('places').delete().eq('group_id', groupId);
    await supabase.from('tags').delete().eq('group_id', groupId);
    await supabase.from('lists').delete().eq('group_id', groupId);
  } else {
    const { data: group, error } = await supabase
      .from('groups')
      .insert({ name: GROUP_NAME, created_by: user.id })
      .select('id')
      .single();
    if (error) throw error;
    groupId = group.id as string;
    await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id, role: 'owner' });
  }
  console.log(`✓ グループ: ${GROUP_NAME}`);

  // 4. リスト
  const { data: lists } = await supabase
    .from('lists')
    .insert([
      { group_id: groupId, name: '東京さんぽ', emoji: '🗼', created_by: user.id },
      { group_id: groupId, name: '大阪の食べ歩き', emoji: '🍢', created_by: user.id },
    ])
    .select('id, name');

  const tokyoList = lists?.find((l) => l.name === '東京さんぽ')?.id as string | undefined;
  const osakaList = lists?.find((l) => l.name === '大阪の食べ歩き')?.id as string | undefined;

  // 5. スポット
  const { data: inserted, error: placeError } = await supabase
    .from('places')
    .insert(
      PLACES.map((p) => ({
        group_id: groupId,
        name: p.name,
        address: p.address,
        lat: p.lat,
        lng: p.lng,
        category: p.category,
        memo: p.memo ?? null,
        status: p.status ?? 'want',
        added_by: user.id,
      })),
    )
    .select('id, name, address');

  if (placeError) throw placeError;
  console.log(`✓ スポット ${inserted?.length ?? 0}件`);

  const idByName = new Map((inserted ?? []).map((p) => [p.name as string, p.id as string]));

  // 6. タグ
  const tagNames = Array.from(new Set(PLACES.flatMap((p) => p.tags ?? [])));
  const { data: tags } = await supabase
    .from('tags')
    .insert(tagNames.map((name) => ({ group_id: groupId, name })))
    .select('id, name');

  const tagIdByName = new Map((tags ?? []).map((t) => [t.name as string, t.id as string]));

  const placeTags = PLACES.flatMap((p) =>
    (p.tags ?? [])
      .map((t) => ({ place_id: idByName.get(p.name), tag_id: tagIdByName.get(t) }))
      .filter((row): row is { place_id: string; tag_id: string } => Boolean(row.place_id && row.tag_id)),
  );
  if (placeTags.length > 0) await supabase.from('place_tags').insert(placeTags);
  console.log(`✓ タグ ${tagNames.length}件`);

  // 7. リストへの割り当て
  const listRows = [
    ...(tokyoList
      ? PLACES.filter((p) => p.address.startsWith('東京'))
          .map((p) => ({ list_id: tokyoList, place_id: idByName.get(p.name) }))
          .filter((r): r is { list_id: string; place_id: string } => Boolean(r.place_id))
      : []),
    ...(osakaList
      ? PLACES.filter((p) => p.address.startsWith('大阪') && ['restaurant', 'bar', 'shopping'].includes(p.category))
          .map((p) => ({ list_id: osakaList, place_id: idByName.get(p.name) }))
          .filter((r): r is { list_id: string; place_id: string } => Boolean(r.place_id))
      : []),
  ];
  if (listRows.length > 0) await supabase.from('list_places').insert(listRows);

  // 8. 「行った」記録
  const visited = PLACES.filter((p) => p.status === 'visited');
  const reviews = visited
    .map((p) => ({
      place_id: idByName.get(p.name),
      user_id: user.id,
      visited_on: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
      rating: 5,
      comment: p.name === 'ブルーボトルコーヒー 清澄白河' ? 'ラテが美味しかった。朝の光が入る席がおすすめ。' : 'やっぱり一度は見ておきたい場所。',
      want_again: true,
    }))
    .filter((r) => r.place_id);
  if (reviews.length > 0) await supabase.from('place_reviews').insert(reviews);
  console.log(`✓ 行った記録 ${reviews.length}件`);

  // 9. サンプル旅行（大阪 2泊3日）
  const start = new Date();
  start.setDate(start.getDate() + 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      group_id: groupId,
      title: '大阪ぐるっと2泊3日',
      start_date: toISO(start),
      end_date: toISO(end),
      area_lat: 34.6937,
      area_lng: 135.5023,
      created_by: user.id,
      is_public: false,
    })
    .select('id, public_share_token')
    .single();

  if (tripError) throw tripError;

  const item = (
    dayIndex: number,
    orderIndex: number,
    placeName: string | null,
    extra: Record<string, unknown> = {},
  ) => ({
    trip_id: trip.id,
    day_index: dayIndex,
    order_index: orderIndex,
    place_id: placeName ? (idByName.get(placeName) ?? null) : null,
    ...extra,
  });

  await supabase.from('trip_items').insert([
    item(0, 0, null, { custom_title: '新大阪駅に到着', arrive_time: '10:30', transport: 'transit', memo: 'コインロッカーに荷物を預ける' }),
    item(0, 1, '梅田スカイビル 空中庭園展望台', { arrive_time: '11:30', stay_minutes: 60, transport: 'walk' }),
    item(0, 2, '中之島公園', { arrive_time: '13:30', stay_minutes: 45, transport: 'walk' }),
    item(0, 3, '大阪城', { arrive_time: '15:00', stay_minutes: 90, transport: 'transit' }),
    item(0, 4, '北新地 お初天神通り', { arrive_time: '18:30', stay_minutes: 120, transport: 'transit', memo: '予約した方が安心' }),

    item(1, 0, 'ユニバーサル・スタジオ・ジャパン', { arrive_time: '08:30', stay_minutes: 480, transport: 'transit', memo: '朝イチで入場' }),
    item(1, 1, '道頓堀', { arrive_time: '18:00', stay_minutes: 90, transport: 'transit' }),
    item(1, 2, '串カツ だるま 新世界総本店', { arrive_time: '20:00', stay_minutes: 60, transport: 'walk' }),

    item(2, 0, '黒門市場', { arrive_time: '09:30', stay_minutes: 60, transport: 'walk', memo: '朝ごはんは market で' }),
    item(2, 1, '通天閣', { arrive_time: '11:00', stay_minutes: 45, transport: 'walk' }),
    item(2, 2, '海遊館', { arrive_time: '13:00', stay_minutes: 120, transport: 'transit' }),
    item(2, 3, null, { custom_title: '新大阪駅から帰る', arrive_time: '17:30', transport: 'transit' }),
  ]);

  await supabase.from('trip_checklist').insert(
    ['充電器', 'モバイルバッテリー', '歩きやすい靴', '折りたたみ傘', '常備薬', 'USJのチケット'].map((label, i) => ({
      trip_id: trip.id,
      label,
      order_index: i,
      checked: i < 2,
    })),
  );

  await supabase.from('trip_budget_items').insert([
    { trip_id: trip.id, label: '新幹線（往復）', amount: 28000, category: '交通', order_index: 0 },
    { trip_id: trip.id, label: 'ホテル 2泊', amount: 24000, category: '宿泊', order_index: 1 },
    { trip_id: trip.id, label: 'USJ チケット', amount: 8600, category: '入場料', order_index: 2 },
    { trip_id: trip.id, label: '食事代（目安）', amount: 15000, category: '食事', order_index: 3 },
    { trip_id: trip.id, label: 'おみやげ', amount: 5000, category: 'おみやげ', order_index: 4 },
  ]);

  console.log('✓ サンプル旅行「大阪ぐるっと2泊3日」');
  console.log('');
  console.log('🎉 シード投入が完了しました。アプリを開いて「サンプル: 行きたい場所」グループを選んでください。');
}

main().catch((error) => {
  console.error('✗ シード投入に失敗しました:', error);
  process.exit(1);
});
