import { useId } from 'react';

interface StarsProps {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
}

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

function starFill(value: number, index: number): 'empty' | 'half' | 'full' {
  if (value >= index) return 'full';
  if (value >= index - 0.5) return 'half';
  return 'empty';
}

function StarIcon({
  fill,
  size,
  clipId,
}: {
  fill: 'empty' | 'half' | 'full';
  size: number;
  clipId: string;
}) {
  const stroke = fill === 'empty' ? '#cdd6cf' : 'var(--brand)';
  const filled = fill === 'full';
  const half = fill === 'half';

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {half && (
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="12" height="24" />
          </clipPath>
        </defs>
      )}
      <path
        d={STAR_PATH}
        fill={filled ? 'var(--brand)' : 'none'}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {half && (
        <path
          d={STAR_PATH}
          fill="var(--brand)"
          stroke="var(--brand)"
          strokeWidth={1.6}
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        />
      )}
    </svg>
  );
}

export function Stars({ value, size = 14, onChange }: StarsProps) {
  const uid = useId();
  const gap = size > 18 ? 4 : 2;

  return (
    <div
      className={`stars${onChange ? ' stars-interactive' : ''}`}
      style={{ display: 'flex', gap }}
      role={onChange ? 'slider' : 'img'}
      aria-label={onChange ? `Rating ${value} out of 5` : `${value} out of 5 stars`}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={5}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = starFill(value, n);
        return (
          <div
            key={n}
            className="star-wrap"
            style={onChange ? undefined : { width: size, height: size }}
          >
            <StarIcon fill={fill} size={size} clipId={`${uid}-star-${n}`} />
            {onChange && (
              <>
                <button
                  type="button"
                  className="star-hit star-hit-left"
                  aria-label={`${n - 0.5} stars`}
                  onClick={() => onChange(value === n - 0.5 ? 0 : n - 0.5)}
                />
                <button
                  type="button"
                  className="star-hit star-hit-right"
                  aria-label={`${n} stars`}
                  onClick={() => onChange(value === n ? 0 : n)}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
