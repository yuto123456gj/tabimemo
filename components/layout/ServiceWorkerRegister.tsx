'use client';

import { useEffect } from 'react';

/** PWA（ホーム画面追加・オフラインシェル）のための Service Worker 登録 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 登録に失敗してもアプリは普通に使えるので無視する
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
