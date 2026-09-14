import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint } from '../geolocation';
import { searchPlaces } from '../places';
import type { RegionId } from '../regions';
import { matchesSearchQuery } from '../searchText';
import type { PlaceResult, Spot } from '../types';
import { Filter, Heart, Locate, Plus, Search } from './icons';

export interface SpotFilters {
  minRating: number;
  punchedOnly: boolean;
}

interface Props {
  spots: Spot[];
  focus: { lat: number; lng: number } | null;
  userLocation: GeoPoint | null;
  mapTarget: { lat: number; lng: number; zoom: number } | null;
  recenterKey?: number;
  searchCenter: GeoPoint;
  regionId: RegionId;
  onAdd: () => void;
  onOpenFavorites: () => void;
  onLocate: () => void;
  onOpenFilters: () => void;
  onSelectSpot?: (id: string) => void;
  onPickPlace: (place: PlaceResult) => void;
  layoutKey?: string;
  filtersActive?: boolean;
}

const MATCHA_ICON = L.divIcon({
  className: 'matcha-marker',
  html: `<span class="neon-pin"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
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

function spotsWithCoords(spots: Spot[]) {
  return spots.filter((s): s is Spot & { lat: number; lng: number } => s.lat != null && s.lng != null);
}

export function MapView({
  spots,
  focus,
  userLocation,
  mapTarget,
  recenterKey = 0,
  searchCenter,
  regionId,
  onAdd,
  onOpenFavorites,
  onLocate,
  onOpenFilters,
  onSelectSpot,
  onPickPlace,
  layoutKey,
  filtersActive,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const appliedTargetRef = useRef<string | null>(null);
  const mapTargetRef = useRef(mapTarget);
  const onSelectRef = useRef(onSelectSpot);
  const fittedSpotsRef = useRef(false);
  mapTargetRef.current = mapTarget;
  onSelectRef.current = onSelectSpot;

  const [mapReady, setMapReady] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
        zoomControl: false,
        attributionControl: false,
        fadeAnimation: false,
        zoomAnimation: true,
        markerZoomAnimation: false,
        wheelDebounceTime: 50,
      }).setView([start.lat, start.lng], start.zoom);

      L.control
        .attribution({ prefix: false, position: 'bottomright' })
        .addTo(map)
        .setPrefix('')
        .addAttribution(
          '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>',
        );

      // CARTO's basemaps now stamp "API KEY REQUIRED" across unkeyed tiles, so the
      // default is OpenStreetMap's keyless service. Set VITE_MAP_TILE_URL to go
      // back to CARTO's lighter style (or any provider) once you have a key, e.g.
      // https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=…
      const tileUrl =
        (import.meta.env.VITE_MAP_TILE_URL as string | undefined) ||
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, {
        attribution: '',
        // Only CARTO-style URLs use {s}; harmless for providers that don't.
        subdomains: 'abcd',
        maxZoom: 19,
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 2,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      appliedTargetRef.current = `${start.lat.toFixed(4)},${start.lng.toFixed(4)},${start.zoom}:0`;
      setMapReady(true);

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
      setMapReady(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersLayerRef.current = null;
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
        color: '#111111',
        weight: 2,
        fillColor: '#035A32',
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('You are here');
    }
  }, [userLocation, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const node = containerRef.current;
    if (!map || !mapTarget || !mapReady) return;

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
  }, [mapTarget?.lat, mapTarget?.lng, mapTarget?.zoom, recenterKey, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!mapReady || !map || !layer) return;

    layer.clearLayers();
    const plotted = spotsWithCoords(spots);

    plotted.forEach((s) => {
      const marker = L.marker([s.lat, s.lng], { icon: MATCHA_ICON });
      marker.on('click', () => onSelectRef.current?.(s.id));
      marker.addTo(layer);
    });

    // First time we have pins, frame them so they're actually on screen
    if (!fittedSpotsRef.current && plotted.length > 0 && !focus) {
      fittedSpotsRef.current = true;
      const bounds = L.latLngBounds(plotted.map((s) => [s.lat, s.lng] as [number, number]));
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.35), { animate: false, maxZoom: 14 });
      }
    }
  }, [spots, mapReady, focus]);

  useEffect(() => {
    if (focus && mapRef.current) {
      mapRef.current.setView([focus.lat, focus.lng], 14, { animate: false });
    }
  }, [focus]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const saved = spots.filter(
            (s) => matchesSearchQuery(s.name, q) || matchesSearchQuery(s.addr, q),
          );
          const remote = await searchPlaces(q, searchCenter, undefined, regionId);
          if (cancelled) return;
          const seen = new Set<string>();
          const merged: PlaceResult[] = [];
          for (const s of saved) {
            const key = `${s.name}|${s.addr}`.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push({ name: s.name, addr: s.addr, lat: s.lat, lng: s.lng });
          }
          for (const p of remote) {
            const key = `${p.name}|${p.addr}`.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(p);
          }
          setResults(merged.slice(0, 10));
        } catch (err) {
          console.error(err);
          if (!cancelled) setResults([]);
        } finally {
          if (!cancelled) setSearching(false);
        }
      })();
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, searchCenter, regionId, spots]);

  const pickResult = (place: PlaceResult) => {
    setQuery(place.name);
    setSearchOpen(false);
    setResults([]);
    onPickPlace(place);
  };

  return (
    <div className="map-wrap" ref={wrapRef}>
      <div ref={containerRef} id="map" />

      <div className={`map-search${searchOpen || query ? ' open' : ''}`}>
        <Search size={18} className="map-search-icon" />
        <input
          className="map-search-input"
          type="search"
          placeholder="Search spots & places"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          enterKeyHint="search"
        />
        {(searchOpen || query.trim().length >= 2) && (
          <div className="map-search-results">
            {searching && <div className="map-search-status">Searching…</div>}
            {!searching &&
              results.map((r, i) => (
                <button
                  key={`${r.name}-${r.addr}-${i}`}
                  type="button"
                  className="map-search-item"
                  onClick={() => pickResult(r)}
                >
                  <span className="map-search-item-name">{r.name}</span>
                  <span className="map-search-item-addr">{r.addr}</span>
                </button>
              ))}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <div className="map-search-status">No places found</div>
            )}
            <button
              type="button"
              className="map-search-add"
              onClick={() => {
                setSearchOpen(false);
                onAdd();
              }}
            >
              + Add a new spot
            </button>
          </div>
        )}
      </div>

      <div className="map-fab-stack">
        <button type="button" className="fab" onClick={onAdd} title="Add spot">
          <Plus size={22} />
        </button>
        <button type="button" className="fab" onClick={onOpenFavorites} title="Favorites">
          <Heart size={20} />
        </button>
        <button type="button" className="fab" onClick={onLocate} title="My location">
          <Locate size={20} />
        </button>
        <button
          type="button"
          className={`fab${filtersActive ? ' active' : ''}`}
          onClick={onOpenFilters}
          title="Filters"
        >
          <Filter size={20} />
        </button>
      </div>
    </div>
  );
}
