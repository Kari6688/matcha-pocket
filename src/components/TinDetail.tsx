import { useEffect, useState } from 'react';
import type { MatchaTin } from '../types';
import { TinArt } from './TinArt';
import { TasteQuadrant } from './TasteQuadrant';
import { Close } from './icons';

interface Props {
  tin: MatchaTin | null;
  onClose: () => void;
}

export function TinDetail({ tin, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (tin) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 320);
    return () => window.clearTimeout(t);
  }, [tin]);

  if (!mounted || !tin) return null;

  return (
    <div className={`tin-detail-overlay${visible ? ' open' : ''}`}>
      <div className={`tin-detail${visible ? ' open' : ''}`}>
        <button type="button" className="tin-detail-close" onClick={onClose} aria-label="Close">
          <Close size={20} />
        </button>

        <div className="tin-detail-hero">
          <TinArt brand={tin.brand} name={tin.name} size={216} photoUrl={tin.photoUrl} />
        </div>

        <div className="tin-detail-body">
          <div className="tin-detail-brand">{tin.brand}</div>
          <h2 className="tin-detail-name">{tin.name}</h2>
          <p className="tin-detail-desc">{tin.description}</p>
          {tin.productUrl && (
            <a
              className="tin-detail-link"
              href={tin.productUrl}
              target="_blank"
              rel="noreferrer"
            >
              View product <span aria-hidden>↗</span>
            </a>
          )}

          <TasteQuadrant taste={tin.taste} />
        </div>
      </div>
    </div>
  );
}
