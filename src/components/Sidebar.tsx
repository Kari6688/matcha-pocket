import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Spot } from '../types';
import { CardIcon, PinOutline } from './icons';
import { SpotCard } from './SpotCard';
import { AuthControls } from './AuthControls';

interface Props {
  spots: Spot[];
  onSelect: (id: string) => void;
  drawerOpen?: boolean;
  onDrawerOpenChange?: (open: boolean) => void;
  locationLabel?: string;
  onOpenLocation?: () => void;
}

const OPEN_THRESHOLD = 56;
const CLOSE_THRESHOLD = 56;
const VELOCITY_THRESHOLD = 0.45;

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

  const asideRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const startOpenRef = useRef(false);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const dragPxRef = useRef(0);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const [dragPx, setDragPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const totalPunches = spots.reduce((a, s) => a + s.punches, 0);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  const canStartDrag = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    if (target.closest('.drawer-handle, .sidebar-top, .divider')) return true;
    if (target.closest('.spot-list')) {
      const list = listRef.current;
      return !!list && list.scrollTop <= 0;
    }
    return false;
  };

  const isMobileDrawer = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!isMobileDrawer()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!canStartDrag(e.target)) return;

    pointerIdRef.current = e.pointerId;
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    lastTRef.current = e.timeStamp;
    startOpenRef.current = open;
    draggingRef.current = true;
    movedRef.current = false;
    dragPxRef.current = 0;
    setIsDragging(true);
    setDragPx(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;

    const delta = e.clientY - startYRef.current;
    let next = delta;
    if (!startOpenRef.current) next = Math.min(0, delta);
    else next = Math.max(0, delta);

    const maxTravel = asideRef.current?.offsetHeight
      ? asideRef.current.offsetHeight * 0.75
      : 320;
    next = Math.max(-maxTravel, Math.min(maxTravel, next));

    if (Math.abs(next) > 6) movedRef.current = true;

    dragPxRef.current = next;
    setDragPx(next);
    lastYRef.current = e.clientY;
    lastTRef.current = e.timeStamp;
  };

  const endDrag = (e: ReactPointerEvent) => {
    if (!draggingRef.current || pointerIdRef.current !== e.pointerId) return;
    draggingRef.current = false;
    pointerIdRef.current = null;

    const dt = Math.max(16, e.timeStamp - lastTRef.current);
    const velocity = (e.clientY - lastYRef.current) / dt;
    const delta = dragPxRef.current;

    let shouldOpen = startOpenRef.current;
    if (startOpenRef.current) {
      if (delta > CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD) shouldOpen = false;
    } else if (delta < -OPEN_THRESHOLD || velocity < -VELOCITY_THRESHOLD) {
      shouldOpen = true;
    }

    setOpen(shouldOpen);
    dragPxRef.current = 0;
    setDragPx(0);
    setIsDragging(false);
  };

  const dragStyle =
    isDragging && dragPx !== 0
      ? {
          transform: open
            ? `translateY(${dragPx}px)`
            : `translateY(calc(100% - var(--drawer-peek) + ${dragPx}px))`,
          transition: 'none',
        }
      : undefined;

  return (
    <aside
      ref={asideRef}
      className={`sidebar${open ? ' drawer-open' : ''}${isDragging ? ' drawer-dragging' : ''}`}
      style={dragStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <button
        type="button"
        className="drawer-handle"
        aria-label={open ? 'Swipe down to collapse spots' : 'Swipe up to expand spots'}
        onClick={() => {
          if (movedRef.current) return;
          setOpen(!open);
        }}
      >
        <span className="drawer-grabber" aria-hidden />
        <span className="drawer-hint">{open ? 'Swipe down' : 'Swipe up for spots'}</span>
      </button>
      <div className="sidebar-top">
        <div className="brand-row">
          <div className="brand">
            <span className="brand-dot" />
            <span className="brand-name">Matcha Pocket</span>
          </div>
          <AuthControls />
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
      <div className="spot-list" ref={listRef}>
        {spots.map((s) => (
          <SpotCard key={s.id} spot={s} onClick={() => handleSelect(s.id)} />
        ))}
      </div>
    </aside>
  );
}
