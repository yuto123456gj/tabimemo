import { NextResponse } from 'next/server';
import { env, isSupabaseConfigured } from '@/lib/env';

/** 設定状況の確認用。シークレットそのものは返さない。 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabase: isSupabaseConfigured(),
    placeSearch: env.googlePlacesKey ? 'google' : 'nominatim',
    extract: env.anthropicKey ? 'claude' : 'rule',
  });
}
