/**
 * 環境変数の読み取り。
 * 重要: キーが未設定でもアプリが落ちないようにし、画面側で「未設定」案内を出す。
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  /** サーバー専用。クライアントに渡さない。 */
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  googlePlacesKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
  nominatimUserAgent:
    process.env.NOMINATIM_USER_AGENT ?? 'Tabimemo/0.1 (https://github.com/; contact: set NOMINATIM_USER_AGENT)',
  /** Webプッシュ通知の公開鍵。ブラウザの購読時に必要なので NEXT_PUBLIC_。 */
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  /** Webプッシュ通知の秘密鍵。サーバー専用。 */
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
  /** プッシュサービスへの連絡先（mailto: か https: のURL）。 */
  vapidSubject: process.env.VAPID_SUBJECT ?? 'mailto:noreply@example.com',
  /** 定期実行（/api/cron/*）の合言葉。Vercel Cron が Authorization ヘッダーで送ってくる。 */
  cronSecret: process.env.CRON_SECRET ?? '',
  /**
   * 招待リンク・共有リンクの組み立てに使う「このサイトのURL」。
   * 優先順位:
   *   1. NEXT_PUBLIC_SITE_URL          … 独自ドメインなど、明示指定があればそれ
   *   2. VERCEL_PROJECT_PRODUCTION_URL … Vercelの安定した本番ドメイン
   *   3. VERCEL_URL                    … デプロイごとに変わる一時URL（保険）
   *   4. localhost
   */
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'),
};

/** Supabase の接続情報が揃っているか（揃っていなければDB機能をスキップする） */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseUrl.startsWith('http'));
}

/** プッシュ通知の鍵が揃っているか（揃っていなければ通知機能を出さない） */
export function isPushConfigured(): boolean {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey);
}

/** ビルド時・未設定時に @supabase/ssr が例外を投げないためのダミー値 */
export const SUPABASE_FALLBACK_URL = 'http://localhost:54321';
export const SUPABASE_FALLBACK_KEY = 'public-anon-key-not-configured';

export function supabaseCredentials() {
  return {
    url: env.supabaseUrl || SUPABASE_FALLBACK_URL,
    key: env.supabaseAnonKey || SUPABASE_FALLBACK_KEY,
  };
}
