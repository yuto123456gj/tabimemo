'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type LngLatBoundsLike, type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, OSM_RASTER_STYLE } from './mapStyle';
import { cn } from '@/lib/utils/cn';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  /** ルートの順番（1始まり）。指定すると番号付きピンになる */
  order?: number;
  /** 行った！ のスポットは色を変える */
  visited?: boolean;
}

export interface MapViewProps {
  markers: MapMarker[];
  /** ルート線（経路順の座標列） */
  route?: Array<{ lat: number; lng: number }> | null;
  onMarkerClick?: (id: string) => void;
  selectedId?: string | null;
  className?: string;
  /** 現在地を表示する */
  showMyLocation?: { lat: number; lng: number } | null;
  interactive?: boolean;
  /** 地図をタップした座標を受け取る（手動で場所を指定する時に使う） */
  onMapClick?: (position: { lat: number; lng: number }) => void;
}

function markerElement(marker: MapMarker, selected: boolean): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('aria-label', marker.label ?? 'スポット');
  el.className = [
    'tabimemo-marker',
    'grid place-items-center rounded-full border-2 border-white font-bold text-white shadow-md transition',
    selected ? 'ring-4 ring-brand-300' : '',
  ].join(' ');

  const size = marker.order ? 28 : 22;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  el.style.fontSize = '12px';
  el.style.cursor = 'pointer';
  el.style.background = marker.order
    ? 'linear-gradient(135deg,#FF6134,#ED4517)'
    : marker.visited
      ? '#13AAA1'
      : '#FF6134';
  el.textContent = marker.order ? String(marker.order) : '';
  return el;
}

export default function MapView({
  markers,
  route,
  onMarkerClick,
  selectedId,
  className,
  showMyLocation,
  interactive = true,
  onMapClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);

  // 地図の初期化（1回だけ）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_RASTER_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
      interactive,
    });

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }),
        'top-right',
      );
    }

    map.on('load', () => setReady(true));
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // interactive は初期化時のみ使う
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markerKey = useMemo(
    () => markers.map((m) => `${m.id}:${m.lat},${m.lng}:${m.order ?? ''}:${m.visited ? 1 : 0}`).join('|'),
    [markers],
  );

  // ピンの描き直し
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const marker of markers) {
      if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) continue;
      const el = markerElement(marker, marker.id === selectedId);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        onMarkerClick?.(marker.id);
      });
      const instance = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
      markersRef.current.push(instance);
    }

    if (showMyLocation) {
      const el = document.createElement('div');
      el.className = 'rounded-full border-2 border-white bg-blue-500 shadow';
      el.style.width = '14px';
      el.style.height = '14px';
      const instance = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([showMyLocation.lng, showMyLocation.lat])
        .addTo(map);
      markersRef.current.push(instance);
    }
    // markerKey で変化を検知する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, ready, selectedId, showMyLocation?.lat, showMyLocation?.lng]);

  // 表示範囲を内容に合わせる
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || markers.length === 0) return;

    if (markers.length === 1) {
      map.easeTo({ center: [markers[0].lng, markers[0].lat], zoom: 14.5, duration: 400 });
      return;
    }

    const lats = markers.map((m) => m.lat);
    const lngs = markers.map((m) => m.lng);
    const bounds: LngLatBoundsLike = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];
    map.fitBounds(bounds, { padding: 56, maxZoom: 15, duration: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, ready]);

  // ルート線
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const coordinates = (route ?? []).map((p) => [p.lng, p.lat] as [number, number]);
    const data: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    };

    const source = map.getSource('tabimemo-route');
    if (source && 'setData' in source) {
      (source as maplibregl.GeoJSONSource).setData(data);
      return;
    }

    if (coordinates.length === 0) return;

    map.addSource('tabimemo-route', { type: 'geojson', data });
    map.addLayer({
      id: 'tabimemo-route-casing',
      type: 'line',
      source: 'tabimemo-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.9 },
    });
    map.addLayer({
      id: 'tabimemo-route-line',
      type: 'line',
      source: 'tabimemo-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#FF6134', 'line-width': 3.5, 'line-dasharray': [1.6, 1.2] },
    });
  }, [route, ready]);

  // 地図タップで座標を拾う
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !onMapClick) return;

    const handler = (event: maplibregl.MapMouseEvent) => {
      onMapClick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    };
    map.on('click', handler);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', handler);
      if (map.getCanvas()) map.getCanvas().style.cursor = '';
    };
  }, [onMapClick, ready]);

  return (
    <div className={cn('relative overflow-hidden rounded-card', className)}>
      <div
        ref={containerRef}
        className="h-full w-full [&_.maplibregl-canvas]:outline-none dark:[&_.maplibregl-canvas]:brightness-[0.82] dark:[&_.maplibregl-canvas]:contrast-[1.08] dark:[&_.maplibregl-canvas]:saturate-[0.85]"
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-ink-100 text-sm text-ink-500 dark:bg-ink-800 dark:text-ink-400">
          地図を読み込んでいます…
        </div>
      )}
    </div>
  );
}
