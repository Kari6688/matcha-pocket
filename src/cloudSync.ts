import type { MatchaTin, Spot } from './types';
import { supabase } from './supabase';
import { isSpotLike, isTinLike } from './storage';

export interface UserLibrary {
  spots: Spot[];
  tins: MatchaTin[];
  updatedAt: string | null;
}

function asSpots(value: unknown): Spot[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isSpotLike);
}

function asTins(value: unknown): MatchaTin[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isTinLike);
}

/** Merge by id: keep all unique items; when both sides have the same id, prefer the richer local/remote by punches+rating / tin fields. */
export function mergeSpots(local: Spot[], remote: Spot[]): Spot[] {
  const map = new Map<string, Spot>();
  for (const s of remote) map.set(s.id, s);
  for (const s of local) {
    const existing = map.get(s.id);
    if (!existing) {
      map.set(s.id, s);
      continue;
    }
    const localScore = (s.punches ?? 0) + (s.rating ?? 0);
    const remoteScore = (existing.punches ?? 0) + (existing.rating ?? 0);
    map.set(s.id, localScore >= remoteScore ? s : existing);
  }
  return [...map.values()];
}

export function mergeTins(local: MatchaTin[], remote: MatchaTin[]): MatchaTin[] {
  const map = new Map<string, MatchaTin>();
  for (const t of remote) map.set(t.id, t);
  for (const t of local) {
    const existing = map.get(t.id);
    if (!existing) {
      map.set(t.id, t);
      continue;
    }
    // Prefer the version that has a photo, else local
    if (!existing.photoUrl && t.photoUrl) map.set(t.id, t);
    else if (existing.photoUrl && !t.photoUrl) map.set(t.id, existing);
    else map.set(t.id, t);
  }
  return [...map.values()];
}

export async function fetchUserLibrary(userId: string): Promise<UserLibrary | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_library')
    .select('spots, tins, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // Table missing / RLS — surface for setup
    console.error('fetchUserLibrary', error);
    throw error;
  }
  if (!data) return { spots: [], tins: [], updatedAt: null };

  return {
    spots: asSpots(data.spots),
    tins: asTins(data.tins),
    updatedAt: data.updated_at ?? null,
  };
}

export async function saveUserLibrary(
  userId: string,
  spots: Spot[],
  tins: MatchaTin[],
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('user_library').upsert(
    {
      user_id: userId,
      spots,
      tins,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (error) {
    console.error('saveUserLibrary', error);
    throw error;
  }
}

export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === 'PGRST205' ||
    e.code === '42P01' ||
    /could not find the table|relation .* does not exist/i.test(e.message ?? '')
  );
}
