import type { PlaceResult } from './types';
import type { GeoPoint } from './geolocation';
import { curatedPlaces, DEFAULT_REGION, getRegion, type RegionId } from './regions';
import { matchesSearchQuery, normalizeSearchText, relevanceScore } from './searchText';

const RESULT_LIMIT = 12;

const FOOD_AMENITIES = new Set([
  'cafe',
  'restaurant',
  'fast_food',
  'bakery',
  'ice_cream',
  'bar',
  'food_court',
  'tea',
]);
const FOOD_SHOPS = new Set(['tea', 'coffee', 'bakery', 'confectionery', 'deli']);

interface PhotonProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  locality?: string;
  district?: string;
  city?: string;
  state?: string;
  country?: string;
  osm_key?: string;
  osm_value?: string;
}

interface PhotonFeature {
  properties: PhotonProperties;
  geometry: { coordinates: [number, number] };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

function distKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function isFoodPoi(p: PhotonProperties): boolean {
  if (p.osm_key === 'amenity' && FOOD_AMENITIES.has(p.osm_value ?? '')) return true;
  if (p.osm_key === 'shop' && FOOD_SHOPS.has(p.osm_value ?? '')) return true;
  return false;
}

function streetLine(p: PhotonProperties): string {
  return [p.housenumber, p.street].filter(Boolean).join(' ');
}

function formatAddress(p: PhotonProperties, fallback: string): string {
  const parts = [
    streetLine(p),
    p.locality || p.district,
    p.city,
    p.state,
    p.country,
  ].filter(Boolean);
  return parts.join(', ') || fallback;
}

function extractName(p: PhotonProperties): string {
  const name = p.name?.trim();
  if (name && isFoodPoi(p)) return name;
  if (name) return name;
  return p.city?.trim() || streetLine(p) || '';
}

function featureKey(f: PhotonFeature): string {
  const p = f.properties;
  const [lng, lat] = f.geometry.coordinates;
  return `${normalizeSearchText(p.name ?? '')}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
}

function toPlaceResult(f: PhotonFeature): PlaceResult | null {
  const p = f.properties;
  const name = extractName(p);
  if (!name) return null;
  const [lng, lat] = f.geometry.coordinates;
  return {
    name,
    addr: formatAddress(p, name),
    lat,
    lng,
  };
}

function scorePlace(
  f: PhotonFeature,
  place: PlaceResult,
  query: string,
  center: GeoPoint,
): number {
  let score = relevanceScore(place.name, place.addr, query);
  if (isFoodPoi(f.properties)) score += 50;
  score -= distKm(center, { lat: place.lat!, lng: place.lng! }) * 1.5;
  return score;
}

async function fetchPhoton(
  query: string,
  center: GeoPoint,
  signal: AbortSignal | undefined,
  osmTag?: string,
): Promise<PhotonFeature[]> {
  try {
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', query.trim());
    url.searchParams.set('limit', String(RESULT_LIMIT));
    url.searchParams.set('lang', 'en');
    url.searchParams.set('lat', String(center.lat));
    url.searchParams.set('lon', String(center.lng));
    if (osmTag) url.searchParams.append('osm_tag', osmTag);

    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = (await res.json()) as PhotonResponse;
    return data.features ?? [];
  } catch {
    return [];
  }
}

export function isStreetLikePlace(name: string, addr: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (normalizeSearchText(addr).startsWith(normalizeSearchText(trimmed))) return true;
  return /^\d+\s+[\w\s]+(street|st|avenue|ave|road|rd|boulevard|blvd|way|drive|dr|lane|ln)\.?$/i.test(
    trimmed,
  );
}

function curatedMatches(query: string, regionId: RegionId | null): PlaceResult[] {
  const places = regionId
    ? curatedPlaces[regionId]
    : Object.values(curatedPlaces).flat();
  return places
    .filter(
      (p) => matchesSearchQuery(p.name, query) || matchesSearchQuery(p.addr ?? '', query),
    )
    .map((p) => ({ ...p }));
}

export async function searchPlaces(
  query: string,
  searchCenter: GeoPoint | null = null,
  signal?: AbortSignal,
  regionId: RegionId | null = null,
): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const center = searchCenter ?? DEFAULT_REGION.center;
  const local = curatedMatches(q, regionId);
  const timeout = new AbortController();
  const timeoutId = setTimeout(() => timeout.abort(), 10000);
  const onAbort = () => timeout.abort();
  signal?.addEventListener('abort', onAbort);

  const runSignal = timeout.signal;
  const cityHint = regionId ? getRegion(regionId).searchHint : null;
  const biasedQuery =
    cityHint && !q.toLowerCase().includes(cityHint.toLowerCase()) ? `${q} ${cityHint}` : q;

  try {
    const [general, cafes, biased] = await Promise.all([
      fetchPhoton(q, center, runSignal),
      fetchPhoton(q, center, runSignal, 'amenity:cafe'),
      biasedQuery !== q ? fetchPhoton(biasedQuery, center, runSignal) : Promise.resolve([]),
    ]);

    const seen = new Set<string>();
    const scored: { place: PlaceResult; score: number }[] = [];

    for (const place of local) {
      const key = `${normalizeSearchText(place.name)}|${place.lat?.toFixed(4)}|${place.lng?.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let score = relevanceScore(place.name, place.addr, q) + 80;
      if (place.lat != null && place.lng != null) {
        score -= distKm(center, { lat: place.lat, lng: place.lng }) * 1.5;
      }
      scored.push({ place, score });
    }

    for (const feature of [...cafes, ...general, ...biased]) {
      const key = featureKey(feature);
      if (seen.has(key)) continue;
      seen.add(key);

      const place = toPlaceResult(feature);
      if (!place) continue;

      const score = scorePlace(feature, place, q, center);
      scored.push({ place, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, RESULT_LIMIT).map(({ place }) => place);
  } catch {
    return local.slice(0, RESULT_LIMIT);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', onAbort);
  }
}
