import { useLayoutEffect, useRef, useState } from 'react';
import type { AppTab } from '../types';

const TABS: { id: AppTab; label: string }[] = [
  { id: 'map', label: 'MAP' },
  { id: 'collection', label: 'COLLECTION' },
  { id: 'profile', label: 'PROFILE' },
];

interface Props {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

interface PillBox {
  left: number;
  width: number;
}

/** Capsule toggle matching the reference: white bar, brand pill, white active label. */
export function BottomNav({ active, onChange }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState<PillBox>({ left: 3, width: 64 });

  useLayoutEffect(() => {
    const measure = () => {
      const nav = navRef.current;
      const idx = TABS.findIndex((t) => t.id === active);
      const btn = btnRefs.current[idx];
      if (!nav || !btn) return;
      const navBox = nav.getBoundingClientRect();
      const btnBox = btn.getBoundingClientRect();
      setPill({
        left: btnBox.left - navBox.left,
        width: btnBox.width,
      });
    };

    measure();
    void document.fonts?.ready.then(measure);

    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [active]);

  return (
    <div className="app-nav-zone">
      <nav className="app-nav" aria-label="Main" ref={navRef}>
        <span
          className="app-nav-pill"
          aria-hidden
          style={{
            transform: `translateX(${pill.left}px)`,
            width: pill.width,
          }}
        />
        {TABS.map((tab, i) => {
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              className={`app-nav-btn${active === tab.id ? ' active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
