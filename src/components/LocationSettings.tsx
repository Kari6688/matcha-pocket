import { REGIONS, type RegionId } from '../regions';
import type { GeoStatus } from '../geolocation';
import type { LocationMode } from '../locationSettings';
import { Close, PinOutline } from './icons';

interface Props {
  open: boolean;
  label: string;
  regionId: RegionId;
  mode: LocationMode;
  geoStatus: GeoStatus;
  /** True once we have a position for the device — live or remembered from last visit. */
  usingDevice: boolean;
  onEnableDevice: () => void;
  onSelectRegion: (id: RegionId) => void;
  onClose: () => void;
}

export function LocationSettings({
  open,
  label,
  regionId,
  mode,
  geoStatus,
  usingDevice,
  onEnableDevice,
  onSelectRegion,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="loc-panel" role="dialog" aria-label="Location settings">
      <div className="loc-panel-head">
        <div>
          <div className="loc-panel-title">Search area</div>
          <div className="loc-panel-sub">Current: {label}</div>
        </div>
        <button type="button" className="x-btn" onClick={onClose} aria-label="Close">
          <Close size={18} />
        </button>
      </div>

      <button
        type="button"
        className={`loc-device-btn${usingDevice ? ' active' : ''}`}
        onClick={onEnableDevice}
      >
        <PinOutline size={18} />
        <span>
          {geoStatus === 'loading' && mode === 'device'
            ? 'Getting your location…'
            : usingDevice
              ? 'Using your current location'
              : geoStatus === 'denied' && mode === 'device'
                ? 'Location blocked — enable in browser settings'
                : 'Use my current location'}
        </span>
      </button>

      <div className="loc-cities-label">Or pick a city</div>
      <div className="loc-cities">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`loc-city${mode === 'region' && regionId === r.id ? ' active' : ''}`}
            onClick={() => {
              onSelectRegion(r.id);
              onClose();
            }}
          >
            {r.name}
          </button>
        ))}
      </div>
    </div>
  );
}

interface PromptProps {
  onAllow: () => void;
  onChooseCity: () => void;
  onDismiss: () => void;
}

export function LocationPrompt({ onAllow, onChooseCity, onDismiss }: PromptProps) {
  return (
    <div className="loc-prompt" role="dialog" aria-label="Location permission">
      <div className="loc-prompt-icon">
        <PinOutline size={22} />
      </div>
      <div className="loc-prompt-body">
        <div className="loc-prompt-title">Find matcha near you?</div>
        <div className="loc-prompt-text">
          Share your location to center the map and prioritize nearby cafés — or pick a city like
          Toronto, Tokyo, Kyoto, or Montreal.
        </div>
        <div className="loc-prompt-actions">
          <button type="button" className="loc-prompt-primary" onClick={onAllow}>
            Use my location
          </button>
          <button type="button" className="loc-prompt-secondary" onClick={onChooseCity}>
            Choose a city
          </button>
        </div>
      </div>
      <button type="button" className="loc-prompt-dismiss" onClick={onDismiss} aria-label="Dismiss">
        <Close size={16} />
      </button>
    </div>
  );
}
