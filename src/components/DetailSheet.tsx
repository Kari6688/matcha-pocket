import type { Spot } from '../types';
import { Sheet } from './Sheet';
import { Stars } from './Stars';
import { PinFilled, PinOutline, CardIcon, Close, Trash, Plus } from './icons';

interface Props {
  spot: Spot | null;
  onClose: () => void;
  onRate: (rating: number) => void;
  onPunch: (delta: number) => void;
  onRemove: () => void;
}

export function DetailSheet({ spot, onClose, onRate, onPunch, onRemove }: Props) {
  return (
    <Sheet open={!!spot} onClose={onClose}>
      {spot && (
        <>
          <div className="sheet-head">
            <div>
              <div className="sheet-title">{spot.name}</div>
              <div className="detail-addr">
                <PinOutline size={16} />
                <span>{spot.addr}</span>
              </div>
              <div className="stars-row">
                <Stars value={spot.rating} size={26} onChange={onRate} />
              </div>
            </div>
            <button className="x-btn" onClick={onClose}>
              <Close size={20} />
            </button>
          </div>

          <div className="sheet-divider" />

          <div className="punch-head">
            <div className="punch-head-left">
              <span className="pc-icon">
                <CardIcon size={22} />
              </span>
              <span className="pc-title">Punch Card</span>
              <span className="pc-visits">{spot.punches} visits</span>
            </div>
            <div className="punch-actions">
              <button className="round-btn" onClick={() => onPunch(-1)}>
                &minus;
              </button>
              <button className="punch-btn" onClick={() => onPunch(1)}>
                <Plus size={16} />
                Punch
              </button>
            </div>
          </div>

          <div className="punch-grid">
            {Array.from({ length: 10 }).map((_, n) => (
              <div key={n} className={`punch-slot${n < spot.punches ? ' filled' : ''}`}>
                {n < spot.punches && <PinFilled size={26} />}
              </div>
            ))}
          </div>

          <div className="sheet-divider" />

          <button className="remove-btn" onClick={onRemove}>
            <Trash size={18} />
            Remove spot
          </button>
        </>
      )}
    </Sheet>
  );
}
