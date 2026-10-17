'use client';

import dynamic from 'next/dynamic';
import type { MapViewProps } from './MapView';

/**
 * 地図はバンドルが大きいので、必要になった時だけ読み込む。
 * （MapLibre は window に依存するため SSR しない）
 */
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center rounded-card bg-ink-100 text-sm text-ink-500 dark:bg-ink-800 dark:text-ink-400">
      地図を準備しています…
    </div>
  ),
});

export function MapContainer(props: MapViewProps) {
  return <MapView {...props} />;
}
