import { useState } from 'react';
import { initialSpots } from './data';
import { useLocationSettings } from './locationSettings';
import type { Spot } from './types';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { DetailSheet } from './components/DetailSheet';
import { AddSheet } from './components/AddSheet';
import { LocationPrompt, LocationSettings } from './components/LocationSettings';

let nextId = 100;

export default function App() {
  const location = useLocationSettings();
  const [spots, setSpots] = useState<Spot[]>(initialSpots);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);

  const selected = spots.find((s) => s.id === selectedId) ?? null;

  const mapTarget = {
    lat: location.mapCenter.lat,
    lng: location.mapCenter.lng,
    zoom: location.mapZoom,
  };

  const goToArea = () => {
    setFocus(null);
    setSelectedId(null);
    setRecenterKey((n) => n + 1);
  };

  const select = (id: string) => {
    setSelectedId(id);
    const s = spots.find((x) => x.id === id);
    if (s && s.lat != null && s.lng != null) setFocus({ lat: s.lat, lng: s.lng });
  };

  const update = (id: string, patch: Partial<Spot>) =>
    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const punch = (delta: number) => {
    if (!selected) return;
    const next = Math.max(0, Math.min(10, selected.punches + delta));
    update(selected.id, { punches: next });
  };

  const remove = () => {
    if (!selected) return;
    setSpots((prev) => prev.filter((s) => s.id !== selected.id));
    setSelectedId(null);
  };

  const addSpot = (spot: Omit<Spot, 'id'>) => {
    setSpots((prev) => [...prev, { ...spot, id: `s${nextId++}` }]);
    setAddOpen(false);
    if (spot.lat != null && spot.lng != null) setFocus({ lat: spot.lat, lng: spot.lng });
  };

  return (
    <div className={`app${drawerOpen ? ' drawer-expanded' : ''}`}>
      <MapView
        spots={spots}
        focus={focus}
        userLocation={location.deviceLocation}
        mapTarget={mapTarget}
        recenterKey={recenterKey}
        onAdd={() => setAddOpen(true)}
        layoutKey={drawerOpen ? 'open' : 'closed'}
      />
      <Sidebar
        spots={spots}
        onSelect={select}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        locationLabel={location.label}
        onOpenLocation={() => setLocOpen(true)}
      />

      {location.showPrompt && (
        <LocationPrompt
          onAllow={() => location.enableDeviceLocation()}
          onChooseCity={() => {
            location.dismissPrompt();
            setLocOpen(true);
          }}
          onDismiss={() => location.dismissPrompt()}
        />
      )}

      <LocationSettings
        open={locOpen}
        label={location.label}
        regionId={location.regionId}
        mode={location.mode}
        geoStatus={location.geoStatus}
        onEnableDevice={() => {
          location.enableDeviceLocation();
          goToArea();
          setLocOpen(false);
        }}
        onSelectRegion={(id) => {
          location.selectRegion(id);
          goToArea();
        }}
        onClose={() => setLocOpen(false)}
      />

      <DetailSheet
        spot={selected}
        onClose={() => setSelectedId(null)}
        onRate={(r) => selected && update(selected.id, { rating: r })}
        onPunch={punch}
        onRemove={remove}
      />

      <AddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={addSpot}
        spots={spots}
        searchCenter={location.searchCenter}
        regionId={location.regionId}
      />
    </div>
  );
}
