import type { TinSkin } from '../types';

const SKINS: Record<
  TinSkin,
  { body: string; lid: string; band: string; label: string; text: string }
> = {
  rocky: { body: '#1e4f8c', lid: '#c8d4e0', band: '#e85d4c', label: '#f4f1ea', text: '#1a1a1a' },
  wako: { body: '#f7f5f0', lid: '#2d6b3a', band: '#1a1a1a', label: '#111', text: '#111' },
  jade: { body: '#1f4d3a', lid: '#c5d8c8', band: '#9ee06c', label: '#f4f1ea', text: '#163528' },
  ember: { body: '#5c3a28', lid: '#d4a574', band: '#e8c48a', label: '#fff8f0', text: '#3a2416' },
  ink: { body: '#1c1c1c', lid: '#3a3a3a', band: '#b8ff3c', label: '#f5f5f5', text: '#111' },
  cream: { body: '#ebe4d8', lid: '#8a9a7a', band: '#c4b8a4', label: '#fff', text: '#2a2a2a' },
};

export function TinArt({
  skin,
  brand,
  name,
  size = 140,
  photoUrl,
}: {
  skin: TinSkin;
  brand: string;
  name: string;
  size?: number;
  photoUrl?: string;
}) {
  const h = size * 1.2;

  if (photoUrl) {
    return (
      <div
        className="tin-photo-wrap"
        style={{ width: size, height: h }}
        aria-label={`${brand} ${name}`}
      >
        <img className="tin-photo" src={photoUrl} alt={`${brand} ${name}`} draggable={false} />
      </div>
    );
  }

  const c = SKINS[skin];

  return (
    <svg
      className="tin-art"
      width={size}
      height={h}
      viewBox="0 0 120 144"
      role="img"
      aria-label={`${brand} ${name}`}
    >
      <ellipse cx="60" cy="18" rx="38" ry="10" fill={c.lid} />
      <path d="M22 18 v88 a38 12 0 0 0 76 0 V18" fill={c.body} />
      <ellipse cx="60" cy="18" rx="38" ry="10" fill={c.lid} opacity="0.9" />
      <ellipse cx="60" cy="106" rx="38" ry="12" fill={c.body} />
      <ellipse cx="60" cy="106" rx="38" ry="12" fill="#000" opacity="0.08" />
      <rect x="28" y="42" width="64" height="36" rx="3" fill={c.band} />
      <rect x="32" y="46" width="56" height="28" rx="2" fill={c.label} />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fontSize="6"
        fontFamily="PP Neue Montreal Mono, PP Neue Montreal, monospace"
        fill={c.text}
      >
        {brand.slice(0, 16)}
      </text>
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="600"
        fontFamily="PP Neue Montreal Mono, PP Neue Montreal, monospace"
        fill={c.text}
      >
        {name.slice(0, 14)}
      </text>
    </svg>
  );
}
