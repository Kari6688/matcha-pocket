import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '../geolocation';
import type { Spot } from '../types';
import { Plus } from './icons';

interface Props {
  spots: Spot[];
  focus: { lat: number; lng: number } | null;
  userLocation: GeoPoint | null;
  mapTarget: { lat: number; lng: number; zoom: number } | null;
  recenterKey?: number;
  onAdd: () => void;
  layoutKey?: string;
}

const MATCHA_ICON = L.divIcon({
  className: 'matcha-marker',
  html: `<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10 14 22 14 22s14-12 14-22C28 6.3 21.7 0 14 0z" fill="#2f6b4f"/>
    <circle cx="14" cy="14" r="5.5" fill="#fff"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -32],
});

function invalidate(map: L.Map) {
  map.invalidateSize({ animate: false, pan: false });
}

/** Re-measure until Leaflet's internal size matches the DOM container. */
function syncMapSize(map: L.Map, node: HTMLElement) {
  invalidate(map);
  const w = node.clientWidth;
  const h = node.clientHeight;
  if (w > 0 && h > 0) {
    const size = map.getSize();
    if (Math.abs(size.x - w) > 1 || Math.abs(size.y - h) > 1) {
      invalidate(map);
    }
  }
}

export function MapView({
  spots,
  focus,
  userLocation,
  mapTarget,
  recenterKey = 0,
  onAdd,
  layoutKey,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const appliedTargetRef = useRef<string | null>(null);
  const mapTargetRef = useRef(mapTarget);
  mapTargetRef.current = mapTarget;

  useEffect(() => {
    const wrap = wrapRef.current;
    const el = containerRef.current;
    if (!wrap || !el || mapRef.current) return;

    let cancelled = false;
    let stableFrames = 0;
    let lastW = 0;
    let lastH = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const pendingInvalidates: number[] = [];

    const scheduleSync = () => {
      const map = mapRef.current;
      const node = containerRef.current;
      if (!map || !node) return;
      syncMapSize(map, node);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mapRef.current && containerRef.current) {
          syncMapSize(mapRef.current, containerRef.current);
        }
      }, 100);
    };

    const init = () => {
      if (cancelled || mapRef.current || !containerRef.current || !wrapRef.current) return;

      const { clientWidth: w, clientHeight: h } = wrapRef.current;
      // Wait until the flex layout has a real map pane (not a transient tiny width)
      if (w < 200 || h < 200) {
        requestAnimationFrame(init);
        return;
      }

      if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
        lastW = w;
        lastH = h;
      }

      if (stableFrames < 2) {
        requestAnimationFrame(init);
        return;
      }

      const start = mapTargetRef.current ?? { lat: 40.728, lng: -73.998, zoom: 13 };
      const map = L.map(containerRef.current, {
        zoomControl: true,
        fadeAnimation: false,
        zoomAnimation: true,
        markerZoomAnimation: false,
        wheelDebounceTime: 50,
      }).setView([start.lat, start.lng], start.zoom);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 2,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      appliedTargetRef.current = `${start.lat.toFixed(4)},${start.lng.toFixed(4)},${start.zoom}:0`;

      // Leaflet often needs several passes after flex layout settles
      scheduleSync();
      pendingInvalidates.push(
        window.setTimeout(scheduleSync, 50),
        window.setTimeout(scheduleSync, 200),
        window.setTimeout(scheduleSync, 500),
      );
    };

    init();

    const fixSize = () => {
      const node = wrapRef.current;
      if (!node) return;
      const w = node.clientWidth;
      const h = node.clientHeight;
      if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 2 && mapRef.current) return;
      lastW = w;
      lastH = h;

      if (!mapRef.current) {
        requestAnimationFrame(init);
        return;
      }
      scheduleSync();
    };

    const ro = new ResizeObserver(fixSize);
    ro.observe(wrap);
    window.addEventListener('resize', fixSize, { passive: true });

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      pendingInvalidates.forEach((id) => clearTimeout(id));
      ro.disconnect();
      window.removeEventListener('resize', fixSize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const node = containerRef.current;
    if (!map || !node) return;
    const t = window.setTimeout(() => syncMapSize(map, node), 320);
    return () => window.clearTimeout(t);
  }, [layoutKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }

    if (userLocation) {
      userMarkerRef.current = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: '#2f6b4f',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('You are here');
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const node = containerRef.current;
    if (!map || !mapTarget) return;

    const key = `${mapTarget.lat.toFixed(4)},${mapTarget.lng.toFixed(4)},${mapTarget.zoom}:${recenterKey}`;
    if (appliedTargetRef.current === key) return;
    appliedTargetRef.current = key;

    map.flyTo([mapTarget.lat, mapTarget.lng], mapTarget.zoom, {
      animate: true,
      duration: 0.85,
    });
    if (node) {
      requestAnimationFrame(() => syncMapSize(map, node));
    }
  }, [mapTarget?.lat, mapTarget?.lng, mapTarget?.zoom, recenterKey]);

  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    spots.forEach((s) => {
      if (s.lat != null && s.lng != null) {
        L.marker([s.lat, s.lng], { icon: MATCHA_ICON })
          .bindPopup(`<b>${s.name}</b><br>${s.addr}`)
          .addTo(layer);
      }
    });
  }, [spots]);

  useEffect(() => {
    if (focus && mapRef.current) {
      mapRef.current.setView([focus.lat, focus.lng], 14, { animate: false });
    }
  }, [focus]);

  return (
    <div className="map-wrap" ref={wrapRef}>
      <div ref={containerRef} id="map" />
      <button className="fab" onClick={onAdd} title="Add spot">
        <Plus size={26} />
      </button>
    </div>
  );
}
