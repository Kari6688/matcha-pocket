import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Close, Check } from './icons';

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (cropped: Blob) => void;
}

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const scale = 1.5;
  const w = Math.max(1, Math.round(crop.width * scale));
  const h = Math.max(1, Math.round(crop.height * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, w, h);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Crop failed'))),
      'image/jpeg',
      0.92,
    );
  });
}

export function PhotoCrop({ imageSrc, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const confirm = async () => {
    if (!croppedArea || busy) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      onConfirm(blob);
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  };

  return (
    <div className="photo-crop-overlay" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="photo-crop-head">
        <button type="button" className="x-btn" onClick={onCancel} aria-label="Cancel crop">
          <Close size={20} />
        </button>
        <div className="photo-crop-title">Crop tin</div>
        <button
          type="button"
          className="photo-crop-done"
          onClick={() => void confirm()}
          disabled={busy || !croppedArea}
        >
          <Check size={16} />
          {busy ? '…' : 'Use'}
        </button>
      </div>

      <div className="photo-crop-stage">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={3 / 4}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          objectFit="contain"
          showGrid
        />
      </div>

      <div className="photo-crop-controls">
        <label className="photo-crop-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <p className="photo-hint">Drag to reframe, then tap Use.</p>
      </div>
    </div>
  );
}
