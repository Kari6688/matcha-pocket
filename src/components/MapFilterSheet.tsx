import type { SpotFilters } from './MapView';
import { Sheet } from './Sheet';
import { Close } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: SpotFilters;
  onChange: (next: SpotFilters) => void;
}

const RATINGS = [0, 3, 4, 4.5];

export function MapFilterSheet({ open, onClose, filters, onChange }: Props) {
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="sheet-head">
        <div className="sheet-title">Filters</div>
        <button type="button" className="x-btn" onClick={onClose}>
          <Close size={20} />
        </button>
      </div>
      <p className="auth-prompt-body">Narrow the spots shown on the map and in Favorites.</p>

      <div className="field">
        <div className="field-label">Minimum rating</div>
        <div className="filter-row">
          {RATINGS.map((r) => (
            <button
              key={r}
              type="button"
              className={`filter-chip${filters.minRating === r ? ' active' : ''}`}
              onClick={() => onChange({ ...filters, minRating: r })}
            >
              {r === 0 ? 'Any' : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <div className="field-label">Punch card</div>
        <div className="filter-row">
          <button
            type="button"
            className={`filter-chip${!filters.punchedOnly ? ' active' : ''}`}
            onClick={() => onChange({ ...filters, punchedOnly: false })}
          >
            All spots
          </button>
          <button
            type="button"
            className={`filter-chip${filters.punchedOnly ? ' active' : ''}`}
            onClick={() => onChange({ ...filters, punchedOnly: true })}
          >
            Started punches
          </button>
        </div>
      </div>

      <button
        type="button"
        className="filter-clear in-panel"
        onClick={() => onChange({ minRating: 0, punchedOnly: false })}
      >
        Clear filters
      </button>
    </Sheet>
  );
}
