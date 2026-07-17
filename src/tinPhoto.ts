/** Resize a photo before AI processing — keeps mobile devices responsive. */
export async function downscaleImage(file: File, maxEdge = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas unavailable');
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encode failed'))), 'image/jpeg', 0.9);
  });
  return blob;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Removes the photo background in-browser (no upload to our servers).
 * First run may download a small AI model.
 */
export async function removePhotoBackground(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  onProgress?.(5);
  const scaled = await downscaleImage(file);
  onProgress?.(20);

  const { removeBackground } = await import('@imgly/background-removal');
  onProgress?.(30);

  const cutout = await removeBackground(scaled, {
    progress: (_key, current, total) => {
      if (!total) return;
      const pct = 30 + Math.round((current / total) * 65);
      onProgress?.(Math.min(95, pct));
    },
    output: { format: 'image/png', quality: 0.9 },
  });

  onProgress?.(98);
  const dataUrl = await blobToDataUrl(cutout);
  onProgress?.(100);
  return dataUrl;
}
