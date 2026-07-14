import type { Spot } from '../types';
import { PinFilled, CardIcon, Chevron } from './icons';
import { Stars } from './Stars';

interface Props {
  spot: Spot;
  onClick: () => void;
}

export function SpotCard({ spot, onClick }: Props) {
  return (
    <div className="spot-card" onClick={onClick}>
      <div className="spot-pin">
        <PinFilled size={22} />
      </div>
      <div className="spot-body">
        <div className="spot-name">{spot.name}</div>
        <div className="spot-addr">{spot.addr}</div>
        {spot.rating > 0 && (
          <div className="spot-stars">
            <Stars value={spot.rating} size={13} />
          </div>
        )}
      </div>
      <div className="spot-right">
        <span className="punch-badge">
          <CardIcon size={14} />
          {spot.punches}
        </span>
        <span className="chev">
          <Chevron size={18} />
        </span>
      </div>
    </div>
  );
}
