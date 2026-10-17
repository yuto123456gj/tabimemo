'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/env';
import { cn } from '@/lib/utils/cn';

export interface RealtimeChannel {
  table: string;
  /** 例: `group_id=eq.xxxx` */
  filter?: string;
}

/**
 * 他のメンバーの変更を即時反映する。
 * Supabase Realtime の変更通知を受けて Server Component を再取得する。
 */
export function RealtimeRefresh({
  channels,
  label = '更新がありました',
}: {
  channels: RealtimeChannel[];
  label?: string;
}) {
  const router = useRouter();
  const [flash, setFlash] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || channels.length === 0) return;

    const supabase = createClient();
    const channelName = `tabimemo-${channels.map((c) => `${c.table}:${c.filter ?? 'all'}`).join('-')}`;
    const channel = supabase.channel(channelName);

    for (const c of channels) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: c.table, ...(c.filter ? { filter: c.filter } : {}) },
        () => {
          setFlash(true);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setFlash(false), 2200);
          router.refresh();
        },
      );
    }

    channel.subscribe();

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
    // channels は毎レンダリングで新しい配列になるため、内容を文字列化して比較する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(channels), router]);

  return (
    <div
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-pill bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-lift transition-all duration-300',
        flash ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0',
      )}
    >
      {label}
    </div>
  );
}
