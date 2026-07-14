import { useCallback, useEffect, useState } from 'react';

export type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export function useGeolocation(requestOnMount = false) {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [location, setLocation] = useState<GeoPoint | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('denied');
      setLocation(null);
      return;
    }

    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('granted');
      },
      () => {
        setStatus('denied');
        setLocation(null);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
    if (requestOnMount) request();
  }, [requestOnMount, request]);

  return { location, status, request };
}
