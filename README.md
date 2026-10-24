# タビメモ（Tabimemo）

> 行きたい場所を貯めて、そのまま旅のしおりに。

気になったお店や景色を保存して、日程（しおり）に組み込み、**1日の立ち寄り順を最短ルートに自動で並べ替える**ところまでを1つのアプリで完結させる、スマホ優先の旅行メモアプリです。カップル・友だち・家族で、ひとつのリストを一緒に育てられます。

アプリ名は `lib/constants.ts` の `APP_NAME` / `APP_NAME_JA` の2か所だけで管理しているので、あとから自由に変えられます。

---

## 目次

1. [できること](#できること)
2. [技術スタック](#技術スタック)
3. [セットアップ（最短手順）](#セットアップ最短手順)
4. [Supabaseプロジェクトの作り方](#supabaseプロジェクトの作り方)
5. [マイグレーションの流し方](#マイグレーションの流し方)
6. [Googleログインの設定手順](#googleログインの設定手順)
7. [ローカル起動手順](#ローカル起動手順)
8. [シードデータの投入](#シードデータの投入)
9. [Vercelへのデプロイ手順](#vercelへのデプロイ手順)
10. [任意APIキーを入れると何が良くなるか](#任意apiキーを入れると何が良くなるか)
11. [ディレクトリ構成](#ディレクトリ構成)
12. [テスト](#テスト)
13. [設計メモ](#設計メモ)

---

## できること

### スポットを貯める
- 店名・地名で検索して保存（名前・住所・緯度経度・カテゴリ・写真）
- メモ、予定日、元の投稿URL、タグを付けられる
- 保存時に、元の投稿URL（Instagram / TikTok / 食べログ など何でも）を一緒に残せます。
  詳細画面の「元の投稿を見る」からいつでも開けます

> SNSの投稿ページを自動で取得して店名を抜き出すことはしません。各サービスの規約に反するうえ、
> 仕様変更で頻繁に壊れるためです。
- ステータスは「行きたい／行った！」。評価・感想・「また行きたい」は**メンバーごとに個別**に記録
- 1つのスポットを複数のリストに入れられます

### 一覧と地図
- リスト表示 ⇄ 地図表示をワンタップで切り替え
- 絞り込み: カテゴリ / ステータス / タグ / リスト / また行きたい
- 並び替え: 現在地から近い順 / 予定日順 / 追加日順 / 評価順
- 地図のピンをタップすると詳細カードが出ます

### グループで共有
- グループを作って、招待リンク（有効期限つき・無効化可）で招待
- 誰かが追加・編集すると、Supabase Realtime で相手の画面にすぐ反映
- 「誰が追加したか」を表示

### しおり（旅程）
- タイトル・期間・カバー画像で旅行を作成
- **保存済みスポットから選んで日程に追加**。旅行先エリアを設定しておくと、近くのスポットを「おすすめ候補」として上に出します
- 日ごとのタイムライン: 到着時刻・滞在時間・メモ・移動手段
- 並べ替えはドラッグ&ドロップ（PC）と、↑↓ボタン・「◯日目へ」セレクト（スマホ）の両対応。日をまたぐ移動もできます
- 宿泊先・集合場所などスポット以外のフリー項目も追加可能
- 持ち物チェックリスト、予算メモ（合計と1人あたりを自動計算）
- **共有用の閲覧ページ**: ログイン不要の読み取り専用URL（ON/OFF切替）。印刷用CSS付きで紙のしおりにもできます
- 旅行が終わったら、しおりのスポットを一括で「行った！」に

### ルート自動最適化
- 1日分の「最短ルートに並べ替え」ボタン。**確定前にプレビュー**を見せ、元に戻せます
- 出発地・到着地を固定できます（ホテル発→空港着など）
- 距離行列は OSRM（道路距離）、失敗時はハーバサイン（直線距離 × 迂回係数）に自動フォールバック
- 最近傍法で初期解 → 2-opt で改善。15地点で実測 1〜10ms（1秒以内の要件を十分に満たします）
- 徒歩／車を選択でき、区間ごとの距離・所要時間と1日の合計を表示
- 地図に番号付きピンとルート線を描画
- 「Googleマップで開く」でその順番の経路URLを開けます

---

## 技術スタック

| 領域 | 採用 |
| --- | --- |
| フレームワーク | Next.js 15（App Router）+ TypeScript（strict） |
| UI | Tailwind CSS（自前コンポーネント。デザイントークンは `tailwind.config.ts`） |
| 認証・DB・Realtime・Storage | Supabase |
| 地図 | MapLibre GL JS + OpenStreetMap ラスタータイル（APIキー不要） |
| 場所検索 | Nominatim（既定）/ Google Places API (New)（キーがあれば自動切替） |
| SNS抽出 | ルールベース（既定）/ Claude API（キーがあれば自動切替） |
| ルート計算 | 自前実装（最近傍法 + 2-opt）、距離行列は OSRM → ハーバサイン |
| テスト | Vitest（ロジックの単体テスト 86件） |
| PWA | manifest + Service Worker（ホーム画面に追加できます） |

**APIキーが未設定でもアプリは落ちません。** 外部サービスは `lib/providers/` 以下にインターフェースを切ってあり、実装を差し替えられます。

---

## セットアップ（最短手順）

```bash
# 1. 依存をインストール
npm install

# 2. 環境変数を用意
cp .env.example .env.local
#    → NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を埋める

# 3. Supabase の SQL Editor で supabase/migrations/*.sql を順番に実行

# 4. 起動
npm run dev
```

http://localhost:3000 を開いてください。

> Supabase を設定しなくても `npm run dev` は動き、画面と案内は表示されます（保存機能は使えません）。

---

## Supabaseプロジェクトの作り方

1. https://supabase.com にサインアップし、**New project** を作成します
   - Region は `Northeast Asia (Tokyo)` が日本からは速いです
   - Database Password は控えておいてください
2. プロジェクトができたら、左メニューの **Project Settings → API**（新UIでは **Data API**）を開きます
3. 次の2つを `.env.local` に設定します
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - 公開用キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **Project Settings → API Keys** の `Publishable key`（`sb_publishable_...`）を推奨
     - 同じ画面の **Legacy API Keys** タブにある `anon public`（`eyJhbGci...`）でも動きます
       （こちらは2026年末に廃止予定）
   - ダッシュボード上部の **Connect** ボタンから、URLとキーをまとめてコピーするのが最速です
4. シードを使う場合のみ、秘密キーを `SUPABASE_SERVICE_ROLE_KEY` に設定します
   - **Project Settings → API Keys → Secret keys** で発行する `sb_secret_...` を推奨
     （作成時に1度しか表示されません）
   - **Legacy anon, service_role API keys** タブの `service_role` でも動きます（2026年末に廃止予定）
   - **本番環境には置かないでください**。RLSを迂回できるキーです

### メールログイン（Magic Link）の設定

既定で有効です。**Authentication → URL Configuration** で次を設定してください。

- **Site URL**: `http://localhost:3000`（本番では `https://あなたのドメイン`）
- **Redirect URLs** に追加:
  - `http://localhost:3000/auth/callback`
  - `https://あなたのドメイン/auth/callback`

> 無料プランの組み込みメール送信には送信数の上限があります。本番運用では **Authentication → Emails → SMTP Settings** で独自のSMTP（Resend / SendGrid など）を設定してください。

---

## マイグレーションの流し方

`supabase/migrations/` の3ファイルを **番号順に** 実行します。

### 方法A: ダッシュボードから（手軽）

1. Supabase の **SQL Editor** を開く
2. 次の順にファイルの中身を貼り付けて **Run**
   1. `supabase/migrations/0001_init.sql` … テーブル・インデックス・トリガー・Realtime設定
   2. `supabase/migrations/0002_rls.sql` … Row Level Security と RPC
   3. `supabase/migrations/0003_storage.sql` … 写真用のStorageバケット
3. エラーが出ないことを確認します（何度流しても安全なように書いてあります）

### 方法B: Supabase CLI から

```bash
npm install -g supabase       # まだの場合
supabase login
supabase link --project-ref <あなたのproject-ref>
supabase db push
```

### 何が作られるか

| テーブル | 役割 |
| --- | --- |
| `profiles` | 表示名・アバター（`auth.users` と1:1） |
| `groups` / `group_members` / `group_invites` | グループと招待 |
| `places` | 保存したスポット |
| `place_reviews` | 「行った」記録（**メンバーごと**） |
| `lists` / `list_places` | リスト（多対多） |
| `tags` / `place_tags` | タグ（多対多） |
| `trips` / `trip_items` | しおり本体と日程の項目 |
| `trip_checklist` / `trip_budget_items` | 持ち物・予算 |

**全テーブルで RLS を有効化**し、「そのグループのメンバーだけが読み書きできる」ポリシーを設定しています。`group_members` を直接参照すると再帰するため、`is_group_member()` などの `security definer` 関数を経由しています。

共有閲覧ページは **RLSを緩めず**、`get_public_trip(share_token)` という `security definer` 関数経由で `is_public = true` のしおりだけを匿名公開します。招待の受け入れも同様に `accept_group_invite(token)` 経由です。

サインアップ時のトリガー（`handle_new_user`）が、プロフィールと「わたしの行きたい場所」グループを自動作成します。

---

## Googleログインの設定手順

1. **Google Cloud Console** でOAuthクライアントを作る
   1. https://console.cloud.google.com でプロジェクトを作成
   2. **APIとサービス → OAuth同意画面** を設定（External / アプリ名 / サポートメール）
   3. **認証情報 → 認証情報を作成 → OAuth クライアント ID**
      - アプリケーションの種類: **ウェブ アプリケーション**
      - **承認済みの JavaScript 生成元**: `http://localhost:3000`、`https://あなたのドメイン`
      - **承認済みのリダイレクト URI**: `https://<project-ref>.supabase.co/auth/v1/callback`
        （↑ Supabaseの **Authentication → Providers → Google** に表示されるCallback URLをそのまま貼ります）
   4. 発行された **クライアントID** と **クライアントシークレット** を控える
2. **Supabase** 側を設定する
   1. **Authentication → Providers → Google** を開く
   2. **Enable Sign in with Google** をON
   3. クライアントID・クライアントシークレットを貼って保存
3. **Authentication → URL Configuration** のRedirect URLsに `/auth/callback` を含むURLが入っていることを確認

これで、ログイン画面の「Googleでログイン」が使えるようになります。

---

## ローカル起動手順

```bash
npm install          # 依存のインストール
npm run dev          # 開発サーバー（http://localhost:3000）

npm run build        # 本番ビルド
npm start            # ビルド結果を起動
npm run lint         # ESLint
npm test             # Vitest（ロジックの単体テスト）
npm run typecheck    # tsc --noEmit
```

- **PWAのService Workerは本番ビルド時のみ有効**です（開発中のキャッシュ事故を避けるため）。ホーム画面追加や共有メニューを試すときは `npm run build && npm start` してください。
- アイコンPNGを作り直したいときは `node scripts/generate-icons.mjs` を実行します（外部依存なしで生成されます）。

---

## シードデータの投入

東京・大阪のスポット22件と、サンプル旅行「大阪ぐるっと2泊3日」（3日分の日程・持ち物6件・予算5件）を投入します。

```bash
# 1. 先にアプリでログイン（サインアップ）しておく
# 2. .env.local に SUPABASE_SERVICE_ROLE_KEY を設定
# 3. 実行
npm run seed -- you@example.com
```

「サンプル: 行きたい場所」グループが作られます。再実行すると同じグループの中身を入れ替えます（他のデータには触れません）。

---

## Vercelへのデプロイ手順

1. このリポジトリをGitHubにpushします
2. https://vercel.com で **Add New → Project** からリポジトリをインポート
   - Framework Preset は **Next.js** が自動検出されます（ビルドコマンドの変更は不要）
3. **Environment Variables** に以下を設定します

   | 変数 | 必須 | 備考 |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase の Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon public キー |
   | `NEXT_PUBLIC_SITE_URL` | 推奨 | `https://あなたのドメイン`（招待・共有リンクの生成に使用） |
   | `GOOGLE_PLACES_API_KEY` | 任意 | 入れると場所検索が強化されます |
   | `ANTHROPIC_API_KEY` | 任意 | 入れるとSNS抽出が賢くなります |
   | `NOMINATIM_USER_AGENT` | 推奨 | 連絡先入りに書き換えてください |
   | `SUPABASE_SERVICE_ROLE_KEY` | ❌ | **設定しないでください**（ローカルのシード専用） |

4. **Deploy** を押します
5. デプロイ後、Supabase 側の設定を本番URLに合わせます
   - **Authentication → URL Configuration → Site URL**: `https://あなたのドメイン`
   - **Redirect URLs** に `https://あなたのドメイン/auth/callback` を追加
   - Googleログインを使う場合は、Google Cloud Console の「承認済みの JavaScript 生成元」にも本番ドメインを追加

---

## 任意APIキーを入れると何が良くなるか

| キー | 未設定のとき | 設定したとき |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | OpenStreetMap（Nominatim）で検索。個人店や古い施設には強いが、チェーン店・新しい店・正式名称でない呼び方には弱い。写真は基本つかない | Google Places API (New) に自動切替。**日本の店舗検索の精度が大きく向上**し、**お店の写真が自動で付く**。Googleが失敗した場合はNominatimへ自動フォールバック |
| `ANTHROPIC_API_KEY` | ルールベース抽出。「📍店名」「「店名」」などの定型パターン＋地名辞書で店名とエリアを推定。短いキャプションには十分 | Claude（`claude-opus-5-5`）が抽出。**長い・崩れた・絵文字だらけのキャプションからでも店名／エリア／カテゴリを読み取れる**。失敗時はルールベースへ自動フォールバック |

どちらも**従量課金**です。未設定でもアプリの全機能が動くので、まずはキーなしで試して、精度が物足りなければ追加するのがおすすめです。

現在どちらで動いているかは **設定画面の「連携状況」** か `GET /api/health` で確認できます。

---

## ディレクトリ構成

```
app/
  (app)/                    ログイン必須の画面（上部バー＋下部タブ付き）
    places/                 一覧・地図 / 追加 / 詳細
    trips/                  しおり一覧 / 作成 / 編集
    groups/  settings/
  api/                      外部API呼び出しはすべてここ（サーバー側）
    places/search           場所検索（Nominatim / Google）
    places/photo            Google写真の中継（キーを隠すため）
    extract                 テキストからの場所抽出（現在は画面から未使用）
    route/matrix            距離行列＋ルート最適化
    health                  設定状況の確認
  auth/callback             OAuth / マジックリンクの着地点
  s/[token]                 しおりの共有閲覧ページ（ログイン不要・印刷対応）
  invite/[token]            招待の受け入れ
  login/  layout.tsx  page.tsx（LP or ホーム）

components/
  ui/        Button, Card, EmptyState, Icons, StarRating, Feedback
  layout/    TopBar, BottomNav, AppShell, Landing, GroupSwitcher, RealtimeRefresh …
  places/    PlaceCard, PlacesExplorer, AddPlaceTabs, SearchTab, SnsTab, ImportTab …
  trips/     TripEditor, TripItemRow, AddToDayPanel, RoutePanel, Checklist, Budget …
  map/       MapView（MapLibre）, MapContainer（遅延読み込み）, mapStyle

lib/
  constants.ts              アプリ名・カテゴリ・移動手段などの定義
  env.ts                    環境変数の読み取り（未設定でも落ちない）
  supabase/                 client / server / admin / middleware
  providers/
    places/                 nominatim.ts, google.ts, index.ts（自動切替）
    extract/                rule.ts, claude.ts, index.ts（自動切替）
    routing/                osrm.ts, haversine.ts, index.ts（フォールバック）
  route/                    optimize.ts（最近傍法＋2-opt）, geo.ts, googleMaps.ts
  trips/reorder.ts          日程の並べ替えロジック（純粋関数）
  utils/                    date, cn, ratelimit
  data/                     Server Component用のデータ取得
  actions/                  Server Actions（places / trips / groups / auth）

supabase/migrations/        0001_init.sql, 0002_rls.sql, 0003_storage.sql
scripts/                    seed.ts, generate-icons.mjs
tests/                      route / trips / utils の単体テスト
public/                     manifest.webmanifest, sw.js, offline.html, icons/
```

---

## テスト

```bash
npm test
```

外部通信を伴わない純粋関数を対象にしています（66件）。

| ファイル | 内容 |
| --- | --- |
| `tests/route/optimize.test.ts` | **総距離が単純な入力順より短くなること**、**開始・終了の固定が守られること**、全地点をちょうど1回ずつ通ること、15地点が1秒以内に終わること、提案が元より悪化しないこと |
| `tests/trips/reorder.test.ts` | 上下移動 / 日をまたぐ移動 / ドラッグ&ドロップ / 最適化結果の適用 / 保存すべき差分の抽出 |
| `tests/utils/extract.test.ts` | SNSキャプションからの店名・エリア・カテゴリ・タグの抽出 |
| `tests/utils/date.test.ts` | 日本語の日付表記、旅程の日付計算、タイムゾーンずれの防止 |

---

## 設計メモ

### セキュリティ
- **APIキーはクライアントに出しません。** 外部API（Nominatim / Google Places / OSRM / Anthropic）の呼び出しはすべて Route Handler か Server Action で行います。Google の写真も `/api/places/photo` で中継し、キーを隠しています
- `NEXT_PUBLIC_` が付くのは Supabase の URL と anon キーのみです（どちらも公開前提で、保護はRLSが担います）
- 共有閲覧ページは RLS を緩めず、`security definer` のRPC経由で公開対象だけを返します
- APIルートには簡易レートリミット（トークンバケット）を入れています

### 外部サービスへの配慮
- Nominatim には連絡先入りのUser-Agentを付け、**1リクエスト/秒に直列化**（`lib/utils/ratelimit.ts` の `throttle`）、同じ検索語は1時間キャッシュします
- InstagramやTikTokのページは**スクレイピングしません**。ユーザーが貼り付けたテキストとURLだけを使います
- OSRM の公開デモサーバーは一度に25地点までに制限しています

### ルート最適化
`lib/route/optimize.ts` は副作用のない純粋関数です。距離行列を受け取り、最近傍法で初期解を作って 2-opt で改善します。固定された出発地・到着地は2-optの対象範囲から外すことで守られます。地点数が15程度と小さいため、各入れ替えで総コストを素直に数え直す実装にしています（可読性優先。実測で十分高速）。

---

地図データ © OpenStreetMap contributors / 経路計算 OSRM
