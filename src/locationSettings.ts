import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGeolocation, type GeoPoint, type GeoStatus } from './geolocation';
import { DEFAULT_REGION, getRegion, type Region, type RegionId } from './regions';

const STORAGE_KEY = 'matcha-location-settings';

export type LocationMode = 'unset' | 'device' | 'region';

interface StoredSettings {
  mode: LocationMode;
  regionId: RegionId;
  dismissedPrompt?: boolean;
}

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: 'unset', regionId: DEFAULT_REGION.id };
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      mode: parsed.mode === 'device' || parsed.mode === 'region' ? parsed.mode : 'unset',
      regionId: getRegion(parsed.regionId).id,
      dismissedPrompt: Boolean(parsed.dismissedPrompt),
    };
  } catch {
    return { mode: 'unset', regionId: DEFAULT_REGION.id };
  }
}

function saveSettings(settings: StoredSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useLocationSettings() {
  const [settings, setSettings] = useState<StoredSettings>(() => loadSettings());
  const shouldRequestOnMount = settings.mode === 'device';
  const { location: deviceLocation, status: geoStatus, request } = useGeolocation(
    shouldRequestOnMount,
  );

  const persist = useCallback((next: StoredSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const region = useMemo(() => getRegion(settings.regionId), [settings.regionId]);

  const searchCenter: GeoPoint = useMemo(() => {
    if (settings.mode === 'device' && deviceLocation) return deviceLocation;
    return region.center;
  }, [settings.mode, deviceLocation, region]);

  const mapCenter: GeoPoint = searchCenter;
  const mapZoom = settings.mode === 'device' && deviceLocation ? 13 : region.zoom;

  const showPrompt = settings.mode === 'unset' && !settings.dismissedPrompt;

  const enableDeviceLocation = useCallback(() => {
    persist({ ...settings, mode: 'device', dismissedPrompt: true });
    request();
  }, [persist, request, settings]);

  const selectRegion = useCallback(
    (regionId: RegionId) => {
      persist({ mode: 'region', regionId, dismissedPrompt: true });
    },
    [persist],
  );

  const dismissPrompt = useCallback(() => {
    persist({
      mode: 'region',
      regionId: settings.regionId,
      dismissedPrompt: true,
    });
  }, [persist, settings.regionId]);

  // If device mode but permission denied, fall back to region center visually
  useEffect(() => {
    if (settings.mode === 'device' && geoStatus === 'denied') {
      // keep mode as device so user can retry; search still uses region center via searchCenter
    }
  }, [settings.mode, geoStatus]);

  const label =
    settings.mode === 'device' && geoStatus === 'granted'
      ? 'Near you'
      : settings.mode === 'device' && geoStatus === 'loading'
        ? 'Locating…'
        : settings.mode === 'device' && geoStatus === 'denied'
          ? `${region.name} (location denied)`
          : region.name;

  return {
    mode: settings.mode as LocationMode,
    region,
    regionId: settings.regionId as RegionId,
    searchCenter,
    mapCenter,
    mapZoom,
    deviceLocation,
    geoStatus: geoStatus as GeoStatus,
    showPrompt,
    label,
    enableDeviceLocation,
    selectRegion,
    dismissPrompt,
    requestDeviceLocation: request,
  };
}

export type LocationSettingsApi = ReturnType<typeof useLocationSettings>;
export type { Region, RegionId };
