import { useMemo, useState } from 'react';
import type { MatchaTin, TeaKind, TeaOrigin } from '../types';
import { TinArt } from './TinArt';

type KindFilter = 'all' | TeaKind;
type OriginFilter = 'all' | TeaOrigin;

interface Props {
  items: MatchaTin[];
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const ORIGINS: OriginFilter[] = [
  'all',
  'Japan',
  'Uji',
  'Nishio',
  'Kagoshima',
  'Shizuoka',
  'Yame',
  'Other',
];

export function CollectionPage({ items, onSelect, onAdd }: Props) {
  const [kind, setKind] = useState<KindFilter>('all');
  const [origin, setOrigin] = useState<OriginFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCount = (kind !== 'all' ? 1 : 0) + (origin !== 'all' ? 1 : 0);
  const hasFilters = activeCount > 0;

  const filtered = useMemo(
    () =>
      items.filter((t) => {
        if (kind !== 'all' && t.kind !== kind) return false;
        if (origin !== 'all' && t.origin !== origin) return false;
        return true;
      }),
    [items, kind, origin],
  );

  const clearFilters = () => {
    setKind('all');
    setOrigin('all');
  };

  return (
    <div className="collection-page">
      <header className="collection-head">
        <h1 className="collection-title">My collection</h1>
      </header>

      <div className="collection-toolbar">
        <div className="collection-toolbar-left">
          <button
            type="button"
            className={`filter-toggle${filtersOpen || hasFilters ? ' active' : ''}`}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            Filter{hasFilters ? ` · ${activeCount}` : ''}
            <span className="filter-toggle-chevron" aria-hidden>
              {filtersOpen ? '▴' : '▾'}
            </span>
          </button>
          {hasFilters && !filtersOpen && (
            <button type="button" className="filter-clear" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>
        <button type="button" className="collection-add" onClick={onAdd}>
          + Add tin
        </button>
      </div>

      {filtersOpen && (
        <div className="collection-filters">
          <div className="filter-section">
            <div className="filter-label">Type</div>
            <div className="filter-row" role="group" aria-label="Tea type">
              {(['all', 'matcha', 'hojicha'] as KindFilter[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`filter-chip${kind === k ? ' active' : ''}`}
                  onClick={() => setKind(k)}
                >
                  {k === 'all' ? 'All' : k === 'matcha' ? 'Matcha' : 'Hojicha'}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <div className="filter-label">Origin</div>
            <div className="filter-row" role="group" aria-label="Origin">
              {ORIGINS.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={`filter-chip${origin === o ? ' active' : ''}`}
                  onClick={() => setOrigin(o)}
                >
                  {o === 'all' ? 'All' : o}
                </button>
              ))}
            </div>
          </div>
          {hasFilters && (
            <button type="button" className="filter-clear in-panel" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="collection-grid">
        {filtered.map((tin) => (
          <button
            key={tin.id}
            type="button"
            className="tin-card"
            onClick={() => onSelect(tin.id)}
          >
            <TinArt brand={tin.brand} name={tin.name} size={144} photoUrl={tin.photoUrl} />
            <div className="tin-meta">
              <div className="tin-brand">{tin.brand}</div>
              <div className="tin-name">{tin.name}</div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="collection-empty">No tins match these filters.</p>
      )}
    </div>
  );
}
