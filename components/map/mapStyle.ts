import type { StyleSpecification } from 'maplibre-gl';

/**
 * APIキー不要のラスタータイル（OpenStreetMap標準タイル）。
 * 利用規約: https://operations.osmfoundation.org/policies/tiles/
 * 本番で大量アクセスする場合は、タイル配信元を自前またはCDN契約に差し替えること。
 */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#eef2f4' } },
    { id: 'osm', type: 'raster', source: 'osm' },
  ],
};

/** 日本の中心あたり（地点が1つも無い時の初期表示） */
export const DEFAULT_CENTER: [number, number] = [137.0, 36.5];
export const DEFAULT_ZOOM = 4.6;
