import { useCallback, useRef, type PointerEvent } from 'react';
import type { TasteProfile } from '../types';

interface Props {
  taste: TasteProfile;
  /** When set, the dot is draggable / tappable to set taste. */
  onChange?: (taste: TasteProfile) => void;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function TasteQuadrant({ taste, onChange }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const interactive = Boolean(onChange);

  const x = clamp01(taste.sweetness) * 100;
  const y = (1 - clamp01(taste.richness)) * 100;

  const setFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!onChange || !plotRef.current) return;
      const rect = plotRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const sweetness = clamp01((clientX - rect.left) / rect.width);
      const richness = clamp01(1 - (clientY - rect.top) / rect.height);
      onChange({ sweetness, richness });
    },
    [onChange],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromPoint(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setFromPoint(e.clientX, e.clientY);
  };

  return (
    <div
      className={`quadrant${interactive ? ' interactive' : ''}`}
      aria-label={interactive ? 'Set taste profile' : 'Taste profile'}
    >
      <span className="q-label q-top">RICH</span>
      <span className="q-label q-bottom">SOFT</span>
      <span className="q-label q-left">UMAMI</span>
      <span className="q-label q-right">SWEETNESS</span>
      <div
        ref={plotRef}
        className="q-plot"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        role={interactive ? 'slider' : undefined}
        aria-valuetext={
          interactive
            ? `Sweetness ${Math.round(taste.sweetness * 100)}%, richness ${Math.round(taste.richness * 100)}%`
            : undefined
        }
      >
        <div className="q-axis-h" />
        <div className="q-axis-v" />
        <div className="q-dot" style={{ left: `${x}%`, top: `${y}%` }} />
      </div>
    </div>
  );
}
