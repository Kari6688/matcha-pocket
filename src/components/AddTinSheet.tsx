import { useRef, useState, type ChangeEvent } from 'react';
import type { MatchaTin, TeaKind, TeaOrigin, TinSkin } from '../types';
import { removePhotoBackground } from '../tinPhoto';
import { Sheet } from './Sheet';
import { TasteQuadrant } from './TasteQuadrant';
import { Close, Check } from './icons';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (tin: Omit<MatchaTin, 'id'>) => void;
}

const ORIGINS: TeaOrigin[] = ['Japan', 'Uji', 'Nishio', 'Kagoshima', 'Shizuoka', 'Other'];
const SKINS: TinSkin[] = ['rocky', 'wako', 'jade', 'ember', 'ink', 'cream'];

export function AddTinSheet({ open, onClose, onSave }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<TeaKind>('matcha');
  const [origin, setOrigin] = useState<TeaOrigin>('Japan');
  const [description, setDescription] = useState('');
  const [sweetness, setSweetness] = useState(0.5);
  const [richness, setRichness] = useState(0.5);
  const [skin, setSkin] = useState<TinSkin>('jade');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const canSave = brand.trim() && name.trim() && !photoBusy;

  const reset = () => {
    setBrand('');
    setName('');
    setKind('matcha');
    setOrigin('Japan');
    setDescription('');
    setSweetness(0.5);
    setRichness(0.5);
    setSkin('jade');
    setPhotoUrl(undefined);
    setPhotoBusy(false);
    setPhotoProgress(0);
    setPhotoError(null);
  };

  const processFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    setPhotoError(null);
    setPhotoBusy(true);
    setPhotoProgress(0);
    try {
      const cutout = await removePhotoBackground(file, setPhotoProgress);
      setPhotoUrl(cutout);
    } catch (err) {
      console.error(err);
      setPhotoError('Couldn’t remove the background. Try another photo or better lighting.');
    } finally {
      setPhotoBusy(false);
      setPhotoProgress(0);
    }
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    await processFile(file);
  };

  const save = () => {
    if (!canSave) return;
    onSave({
      brand: brand.trim(),
      name: name.trim(),
      kind,
      origin,
      description: description.trim() || 'No notes yet.',
      taste: { sweetness, richness },
      skin,
      photoUrl,
    });
    reset();
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <div className="sheet-head">
        <div className="sheet-title">Add tin</div>
        <button
          className="x-btn"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          <Close size={20} />
        </button>
      </div>

      <div className="field">
        <div className="field-label">Tin photo</div>
        <div className="tin-photo-actions">
          <button
            type="button"
            className="photo-action-btn"
            disabled={photoBusy}
            onClick={() => cameraRef.current?.click()}
          >
            Take photo
          </button>
          <button
            type="button"
            className="photo-action-btn secondary"
            disabled={photoBusy}
            onClick={() => libraryRef.current?.click()}
          >
            Choose photo
          </button>
        </div>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={onPick}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={onPick}
        />

        {photoBusy && (
          <div className="photo-progress" role="status">
            <div className="photo-progress-bar" style={{ width: `${photoProgress}%` }} />
            <span>Removing background… {photoProgress}%</span>
          </div>
        )}

        {photoError && <p className="photo-error">{photoError}</p>}

        {photoUrl && !photoBusy && (
          <div className="tin-photo-preview">
            <img src={photoUrl} alt="Tin cutout preview" />
            <button type="button" className="photo-remove" onClick={() => setPhotoUrl(undefined)}>
              Remove photo
            </button>
          </div>
        )}

        <p className="photo-hint">We’ll cut out the tin background automatically before saving.</p>
      </div>

      <div className="field">
        <div className="field-label">Brand</div>
        <input
          className="input"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="e.g. Marukyu Koyamaen"
        />
      </div>
      <div className="field">
        <div className="field-label">Name / Blend</div>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Wako"
        />
      </div>
      <div className="field">
        <div className="field-label">Type</div>
        <div className="filter-row">
          {(['matcha', 'hojicha'] as TeaKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={`filter-chip${kind === k ? ' active' : ''}`}
              onClick={() => setKind(k)}
            >
              {k === 'matcha' ? 'Matcha' : 'Hojicha'}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-label">Origin</div>
        <div className="filter-row">
          {ORIGINS.map((o) => (
            <button
              key={o}
              type="button"
              className={`filter-chip${origin === o ? ' active' : ''}`}
              onClick={() => setOrigin(o)}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <div className="field-label">Notes</div>
        <textarea
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Flavor notes…"
        />
      </div>
      <div className="field">
        <div className="field-label">Taste</div>
        <p className="photo-hint">Drag the dot — rich/soft, umami/sweetness.</p>
        <TasteQuadrant
          taste={{ sweetness, richness }}
          onChange={(t) => {
            setSweetness(t.sweetness);
            setRichness(t.richness);
          }}
        />
      </div>

      {!photoUrl && (
        <div className="field">
          <div className="field-label">Fallback tin look</div>
          <div className="filter-row">
            {SKINS.map((s) => (
              <button
                key={s}
                type="button"
                className={`filter-chip${skin === s ? ' active' : ''}`}
                onClick={() => setSkin(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className={`save-btn${canSave ? ' active' : ''}`} onClick={save} disabled={!canSave}>
        <Check size={18} />
        Save tin
      </button>
    </Sheet>
  );
}
