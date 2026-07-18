import { useEffect, useMemo, useState } from 'react';
import { isStreetLikePlace, searchPlaces } from '../places';
import { matchesSearchQuery } from '../searchText';
import type { GeoPoint } from '../geolocation';
import type { RegionId } from '../regions';
import type { PlaceResult, Spot } from '../types';
import { Sheet } from './Sheet';
import { Stars } from './Stars';
import { Close, Search, PinOutline, Image, Check } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (spot: Omit<Spot, 'id'>) => void;
  spots: Spot[];
  searchCenter: GeoPoint;
  regionId: RegionId;
  initialPlace?: PlaceResult | null;
}

function placeKey(p: Pick<PlaceResult, 'name' | 'addr'>) {
  return `${p.name.toLowerCase()}|${(p.addr ?? '').toLowerCase()}`;
}

function mergePlaces(...groups: PlaceResult[][]): PlaceResult[] {
  const seen = new Set<string>();
  const results: PlaceResult[] = [];
  for (const group of groups) {
    for (const p of group) {
      if (!p.name.trim()) continue;
      const key = placeKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(p);
    }
  }
  return results;
}

function previousPlaces(spots: Spot[]): PlaceResult[] {
  return spots
    .filter((s) => s.name.trim())
    .map((s) => ({ name: s.name, addr: s.addr, lat: s.lat, lng: s.lng }));
}

function filterPlaces(places: PlaceResult[], query: string, field: 'name' | 'addr') {
  if (!query.trim()) return [];
  return places.filter((p) => {
    const name = p.name ?? '';
    const addr = p.addr ?? '';
    if (field === 'name') {
      return matchesSearchQuery(name, query) || matchesSearchQuery(addr, query);
    }
    return matchesSearchQuery(addr, query) || matchesSearchQuery(name, query);
  });
}

function AcList({
  items,
  onPick,
  searching,
  emptyQuery,
}: {
  items: PlaceResult[];
  onPick: (r: PlaceResult) => void;
  searching?: boolean;
  emptyQuery?: boolean;
}) {
  if (!items.length && !searching && !emptyQuery) return null;
  return (
    <>
      {items.length > 0 && (
        <div className="autocomplete show">
          {items.map((r, i) => (
            <div key={`${r.name}-${r.addr}-${i}`} className="ac-item" onClick={() => onPick(r)}>
              <span className="ac-pin">
                <PinOutline size={18} />
              </span>
              <div>
                <div className="ac-name">{r.name}</div>
                <div className="ac-addr">{r.addr}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {searching && <div className="ac-status">Searching places…</div>}
      {!searching && emptyQuery && items.length === 0 && (
        <div className="ac-status">No places found — you can still save with the name above</div>
      )}
    </>
  );
}

export function AddSheet({
  open,
  onClose,
  onSave,
  spots,
  searchCenter,
  regionId,
  initialPlace,
}: Props) {
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('');
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [acField, setAcField] = useState<'name' | 'addr' | null>(null);
  const [remoteResults, setRemoteResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);

  const savedPlaces = useMemo(() => previousPlaces(spots), [spots]);
  const activeQuery = acField === 'name' ? name : acField === 'addr' ? addr : '';
  const localMatches =
    acField && activeQuery.trim() ? filterPlaces(savedPlaces, activeQuery, acField) : [];
  const matches = useMemo(
    () => mergePlaces(localMatches, remoteResults),
    [localMatches, remoteResults],
  );

  useEffect(() => {
    if (!open || !initialPlace) return;
    setName(initialPlace.name);
    setAddr(initialPlace.addr);
    setCoords(
      initialPlace.lat != null && initialPlace.lng != null
        ? [initialPlace.lat, initialPlace.lng]
        : null,
    );
    setAcField(null);
    setRemoteResults([]);
  }, [open, initialPlace]);

  useEffect(() => {
    const q = activeQuery.trim();
    if (!acField || q.length < 2) {
      setRemoteResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(q, searchCenter, controller.signal, regionId);
        if (!controller.signal.aborted) setRemoteResults(results);
      } catch {
        if (!controller.signal.aborted) setRemoteResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
      setSearching(false);
    };
  }, [activeQuery, acField, searchCenter, regionId]);

  const reset = () => {
    setName('');
    setAddr('');
    setRating(0);
    setNotes('');
    setCoords(null);
    setAcField(null);
    setRemoteResults([]);
    setSearching(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const onNameChange = (v: string) => {
    setName(v);
    setCoords(null);
    setAcField('name');
  };

  const onAddrChange = (v: string) => {
    setAddr(v);
    setCoords(null);
    setAcField('addr');
  };

  const pick = (r: PlaceResult, fromField: 'name' | 'addr') => {
    const userName = name.trim();
    const hasCafeName = !isStreetLikePlace(r.name, r.addr);

    if (fromField === 'addr' && userName) {
      setName(userName);
    } else if (fromField === 'addr' && hasCafeName) {
      setName(r.name);
    } else if (fromField === 'name' || !userName) {
      setName(hasCafeName ? r.name : userName || r.name);
    }

    setAddr(r.addr);
    setCoords(r.lat != null && r.lng != null ? [r.lat, r.lng] : null);
    setAcField(null);
    setRemoteResults([]);
  };

  const canSave = name.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    const [lat, lng] = coords ?? [null, null];
    onSave({
      name: name.trim(),
      addr: addr.trim() || '—',
      lat,
      lng,
      rating,
      punches: 0,
    });
    reset();
  };

  return (
    <Sheet open={open} onClose={close}>
      <div className="sheet-head">
        <div className="sheet-title">Add Matcha Spot</div>
        <button className="x-btn" onClick={close}>
          <Close size={20} />
        </button>
      </div>

      <div className="field">
        <div className="field-label">
          Café / Spot Name * <span className="hint">— type a name to save without searching</span>
        </div>
        <div className="input-wrap">
          <input
            className="input"
            placeholder="e.g. Cha Cha Matcha"
            value={name}
            autoComplete="off"
            onChange={(e) => onNameChange(e.target.value)}
            onFocus={() => setAcField('name')}
          />
          {name && (
            <span className="srch">
              <Search size={18} />
            </span>
          )}
        </div>
        <AcList
          items={acField === 'name' ? matches : []}
          onPick={(r) => pick(r, 'name')}
          searching={acField === 'name' && searching}
          emptyQuery={acField === 'name' && name.trim().length >= 2 && !searching}
        />
      </div>

      <div className="field">
        <div className="field-label">
          Address <span className="hint">— optional; search to find the café at an address</span>
        </div>
        <div className="input-wrap">
          <input
            className="input"
            placeholder="e.g. 373 Bleecker St, New York"
            value={addr}
            autoComplete="off"
            onChange={(e) => onAddrChange(e.target.value)}
            onFocus={() => setAcField('addr')}
          />
        </div>
        <AcList
          items={acField === 'addr' ? matches : []}
          onPick={(r) => pick(r, 'addr')}
          searching={acField === 'addr' && searching}
          emptyQuery={acField === 'addr' && addr.trim().length >= 2 && !searching}
        />
      </div>

      <div className="field">
        <div className="field-label">Rating</div>
        <div className="stars-row">
          <Stars value={rating} size={26} onChange={setRating} />
        </div>
      </div>

      <div className="field">
        <div className="field-label">Notes</div>
        <textarea
          className="textarea"
          placeholder="Your thoughts on this spot..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="field-label">Photo</div>
        <div className="photo-drop">
          <Image size={20} />
          Add photo
        </div>
      </div>

      <button className={`save-btn${canSave ? ' active' : ''}`} onClick={save}>
        <Check size={18} />
        Save Spot
      </button>
    </Sheet>
  );
}
