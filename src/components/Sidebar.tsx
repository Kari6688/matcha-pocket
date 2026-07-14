import { useState } from 'react';
import type { Spot } from '../types';
import { CardIcon, PinOutline } from './icons';
import { SpotCard } from './SpotCard';

interface Props {
  spots: Spot[];
  onSelect: (id: string) => void;
  drawerOpen?: boolean;
  onDrawerOpenChange?: (open: boolean) => void;
  locationLabel?: string;
  onOpenLocation?: () => void;
}

export function Sidebar({
  spots,
  onSelect,
  drawerOpen,
  onDrawerOpenChange,
  locationLabel = 'New York',
  onOpenLocation,
}: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = drawerOpen ?? localOpen;
  const setOpen = onDrawerOpenChange ?? setLocalOpen;

  const totalPunches = spots.reduce((a, s) => a + s.punches, 0);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <aside className={`sidebar${open ? ' drawer-open' : ''}`}>
      <button
        type="button"
        className="drawer-handle"
        aria-label={open ? 'Pull down to collapse spots' : 'Pull up to expand spots'}
        onClick={() => setOpen(!open)}
      >
        <span className="drawer-grabber" aria-hidden />
      </button>
      <div className="sidebar-top">
        <div className="brand-row">
          <div className="brand">
            <span className="brand-dot" />
            <span className="brand-name">Matcha Map</span>
          </div>
          <div className="signout">
            <span className="avatar" />
            <span>Sign out</span>
          </div>
        </div>
        <div className="stats">
          <span className="pill">
            <span className="dot" />
            {spots.length} spots
          </span>
          <span className="pill">
            <CardIcon size={15} />
            {totalPunches} punches
          </span>
        </div>
        {onOpenLocation && (
          <button type="button" className="loc-chip" onClick={onOpenLocation}>
            <PinOutline size={15} />
            <span>{locationLabel}</span>
            <span className="loc-chip-change">Change</span>
          </button>
        )}
      </div>
      <div className="divider" />
      <div className="spot-list">
        {spots.map((s) => (
          <SpotCard key={s.id} spot={s} onClick={() => handleSelect(s.id)} />
        ))}
      </div>
    </aside>
  );
}
