import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGeolocation, type GeoPoint, type GeoStatus } from './geolocation';
import { DEFAULT_REGION, getRegion, type Region, type RegionId } from './regions';

const STORAGE_KEY = 'matcha-location-settings';

/** A remembered fix older than this is ignored — stale enough to be misleading. */
const LOCATION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export type LocationMode = 'unset' | 'device' | 'region';

interface StoredLocation extends GeoPoint {
  /** Epoch ms the fix was taken. */
  at: number;
}

interface StoredSettings {
  mode: LocationMode;
  regionId: RegionId;
  dismissedPrompt?: boolean;
  /** Last known device position, so returning visitors land on their map right away. */
  lastDeviceLocation?: StoredLocation;
}

function isFreshLocation(value: unknown): value is StoredLocation {
  if (!value || typeof value !== 'object') return false;
  const { lat, lng, at } = value as Partial<StoredLocation>;
  if (typeof lat !== 'number' || typeof lng !== 'number' || typeof at !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return Date.now() - at < LOCATION_MAX_AGE;
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
      lastDeviceLocation: isFreshLocation(parsed.lastDeviceLocation)
        ? parsed.lastDeviceLocation
        : undefined,
    };
  } catch {
    return { mode: 'unset', regionId: DEFAULT_REGION.id };
  }
}

function saveSettings(settings: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    // Private browsing or a full quota — keep the choice for this session at least.
    console.warn('Could not save location settings on this device', err);
  }
}

export function useLocationSettings() {
  const [settings, setSettings] = useState<StoredSettings>(() => loadSettings());

  // Only ask the browser on mount when it costs the user nothing: either permission
  // is already granted (no dialog), or we have no remembered fix to fall back on.
  // Otherwise a returning visitor would meet the permission sheet on every visit.
  const [autoRequest, setAutoRequest] = useState(false);
  const remembered = settings.mode === 'device' ? settings.lastDeviceLocation : undefined;

  useEffect(() => {
    if (settings.mode !== 'device') {
      setAutoRequest(false);
      return;
    }
    if (!remembered) {
      setAutoRequest(true);
      return;
    }

    let cancelled = false;
    const permissions = navigator.permissions;
    if (!permissions?.query) {
      // No Permissions API to consult — lean on the remembered fix rather than prompt.
      setAutoRequest(false);
      return;
    }
    permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        if (!cancelled) setAutoRequest(result.state === 'granted');
      })
      .catch(() => {
        if (!cancelled) setAutoRequest(false);
      });

    return () => {
      cancelled = true;
    };
  }, [settings.mode, remembered]);

  const { location: freshLocation, status: geoStatus, request } = useGeolocation(autoRequest);

  const persist = useCallback((next: StoredSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  // A live fix wins over the remembered one, and replaces it for next time.
  const deviceLocation: GeoPoint | null = freshLocation ?? remembered ?? null;

  const savedFixRef = useRef<string | null>(null);
  useEffect(() => {
    if (!freshLocation) return;
    const key = `${freshLocation.lat},${freshLocation.lng}`;
    if (savedFixRef.current === key) return;
    savedFixRef.current = key;
    setSettings((prev) => {
      const next: StoredSettings = {
        ...prev,
        lastDeviceLocation: { ...freshLocation, at: Date.now() },
      };
      saveSettings(next);
      return next;
    });
  }, [freshLocation]);

  const region = useMemo(() => getRegion(settings.regionId), [settings.regionId]);

  const searchCenter: GeoPoint = useMemo(() => {
    if (settings.mode === 'device' && deviceLocation) {
      return { lat: deviceLocation.lat, lng: deviceLocation.lng };
    }
    return region.center;
  }, [settings.mode, deviceLocation, region]);

  const mapCenter: GeoPoint = searchCenter;
  const usingDevice = settings.mode === 'device' && Boolean(deviceLocation);
  const mapZoom = usingDevice ? 13 : region.zoom;

  const showPrompt = settings.mode === 'unset' && !settings.dismissedPrompt;

  const enableDeviceLocation = useCallback(() => {
    persist({ ...settings, mode: 'device', dismissedPrompt: true });
    request();
  }, [persist, request, settings]);

  const selectRegion = useCallback(
    (regionId: RegionId) => {
      persist({ ...settings, mode: 'region', regionId, dismissedPrompt: true });
    },
    [persist, settings],
  );

  const dismissPrompt = useCallback(() => {
    persist({
      ...settings,
      mode: 'region',
      regionId: settings.regionId,
      dismissedPrompt: true,
    });
  }, [persist, settings]);

  const label = usingDevice
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
    usingDevice,
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
