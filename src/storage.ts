import type { MatchaTin, Spot } from './types';

const LEGACY_SPOTS_KEY = 'matcha-spots-v2';
const LEGACY_TINS_KEY = 'matcha-tins-v1';

function spotsKey(userId: string) {
  return `matcha-spots:${userId}`;
}

function tinsKey(userId: string) {
  return `matcha-tins:${userId}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('Could not save to this device', err);
  }
}

function isSpot(s: unknown): s is Spot {
  return (
    !!s &&
    typeof s === 'object' &&
    typeof (s as Spot).id === 'string' &&
    typeof (s as Spot).name === 'string' &&
    typeof (s as Spot).addr === 'string'
  );
}

function isTin(t: unknown): t is MatchaTin {
  return (
    !!t &&
    typeof t === 'object' &&
    typeof (t as MatchaTin).id === 'string' &&
    typeof (t as MatchaTin).brand === 'string'
  );
}

/** Load spots for a signed-in user. Migrates older device-only data once. */
export function loadSpots(userId: string): Spot[] {
  const stored = readJson<Spot[]>(spotsKey(userId));
  if (Array.isArray(stored)) return stored.filter(isSpot);

  const legacy = readJson<Spot[]>(LEGACY_SPOTS_KEY);
  if (Array.isArray(legacy) && legacy.length > 0) {
    const migrated = legacy.filter(isSpot);
    writeJson(spotsKey(userId), migrated);
    return migrated;
  }
  return [];
}

export function saveSpots(userId: string, spots: Spot[]) {
  writeJson(spotsKey(userId), spots);
}

export function loadTins(userId: string): MatchaTin[] {
  const stored = readJson<MatchaTin[]>(tinsKey(userId));
  if (Array.isArray(stored)) return stored.filter(isTin);

  const legacy = readJson<MatchaTin[]>(LEGACY_TINS_KEY);
  if (Array.isArray(legacy) && legacy.length > 0) {
    const migrated = legacy.filter(isTin);
    writeJson(tinsKey(userId), migrated);
    return migrated;
  }
  return [];
}

export function saveTins(userId: string, tins: MatchaTin[]) {
  writeJson(tinsKey(userId), tins);
}

export function nextNumericId(items: { id: string }[], prefix: string, fallback: number) {
  let max = fallback - 1;
  for (const item of items) {
    if (!item.id.startsWith(prefix)) continue;
    const n = Number(item.id.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}
