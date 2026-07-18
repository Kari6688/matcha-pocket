import type { TinSkin } from '../types';

export function TinArt({
  brand,
  name,
  size = 140,
  photoUrl,
}: {
  skin?: TinSkin;
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

  return (
    <div
      className="tin-placeholder"
      style={{ width: size, height: h }}
      aria-label={`${brand} ${name}`}
    >
      <span className="tin-placeholder-mark" aria-hidden />
      <span className="tin-placeholder-brand">{brand}</span>
      <span className="tin-placeholder-name">{name}</span>
    </div>
  );
}
