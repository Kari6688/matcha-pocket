import { useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { useLocationSettings } from './locationSettings';
import { loadSpots, loadTins, nextNumericId, saveSpots, saveTins } from './storage';
import type { AppTab, MatchaTin, Spot } from './types';
import { Sidebar } from './components/Sidebar';
import { MapView } from './components/MapView';
import { DetailSheet } from './components/DetailSheet';
import { AddSheet } from './components/AddSheet';
import { LocationPrompt, LocationSettings } from './components/LocationSettings';
import { BottomNav } from './components/BottomNav';
import { CollectionPage } from './components/CollectionPage';
import { TinDetail } from './components/TinDetail';
import { AddTinSheet } from './components/AddTinSheet';
import { ProfilePage } from './components/ProfilePage';
import { AuthWall, EmailSignInForm, GoogleSignInButton } from './components/AuthControls';
import { Sheet } from './components/Sheet';

export default function App() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const location = useLocationSettings();
  const [dataUserId, setDataUserId] = useState<string | null>(null);

  const [spots, setSpots] = useState<Spot[]>([]);
  const [collection, setCollection] = useState<MatchaTin[]>([]);
  const spotIdRef = useRef(1);
  const tinIdRef = useRef(1);

  const [tab, setTab] = useState<AppTab>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTinId, setSelectedTinId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTinOpen, setAddTinOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setSpots([]);
      setCollection([]);
      setDataUserId(null);
      setSelectedId(null);
      setSelectedTinId(null);
      setAddOpen(false);
      setAddTinOpen(false);
      return;
    }
    const nextSpots = loadSpots(userId);
    const nextTins = loadTins(userId);
    setSpots(nextSpots);
    setCollection(nextTins);
    spotIdRef.current = nextNumericId(nextSpots, 's', 1);
    tinIdRef.current = nextNumericId(nextTins, 't', 1);
    setDataUserId(userId);
  }, [userId, isLoaded]);

  useEffect(() => {
    if (!dataUserId || dataUserId !== userId) return;
    saveSpots(dataUserId, spots);
  }, [spots, dataUserId, userId]);

  useEffect(() => {
    if (!dataUserId || dataUserId !== userId) return;
    saveTins(dataUserId, collection);
  }, [collection, dataUserId, userId]);

  const selected = spots.find((s) => s.id === selectedId) ?? null;
  const selectedTin = collection.find((t) => t.id === selectedTinId) ?? null;

  const mapTarget = {
    lat: location.mapCenter.lat,
    lng: location.mapCenter.lng,
    zoom: location.mapZoom,
  };

  const requireAuth = (action: () => void) => {
    if (!isSignedIn) {
      setAuthPromptOpen(true);
      return;
    }
    action();
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

  const update = (id: string, patch: Partial<Spot>) => {
    if (!isSignedIn) return;
    setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const punch = (delta: number) => {
    if (!selected || !isSignedIn) return;
    const next = Math.max(0, Math.min(10, selected.punches + delta));
    update(selected.id, { punches: next });
  };

  const remove = () => {
    if (!selected || !isSignedIn) return;
    setSpots((prev) => prev.filter((s) => s.id !== selected.id));
    setSelectedId(null);
  };

  const addSpot = (spot: Omit<Spot, 'id'>) => {
    if (!isSignedIn) return;
    const id = `s${spotIdRef.current++}`;
    setSpots((prev) => [...prev, { ...spot, id }]);
    setAddOpen(false);
    if (spot.lat != null && spot.lng != null) setFocus({ lat: spot.lat, lng: spot.lng });
  };

  const addTin = (tin: Omit<MatchaTin, 'id'>) => {
    if (!isSignedIn) return;
    const id = `t${tinIdRef.current++}`;
    setCollection((prev) => [...prev, { ...tin, id }]);
    setAddTinOpen(false);
  };

  const changeTab = (next: AppTab) => {
    setTab(next);
    setSelectedTinId(null);
    if (next !== 'map') setDrawerOpen(false);
  };

  return (
    <div
      className={`app${drawerOpen ? ' drawer-expanded' : ''}${tab !== 'map' ? ' tab-page' : ''}`}
    >
      {tab === 'map' && (
        <>
          <MapView
            spots={isSignedIn ? spots : []}
            focus={focus}
            userLocation={location.deviceLocation}
            mapTarget={mapTarget}
            recenterKey={recenterKey}
            onAdd={() => requireAuth(() => setAddOpen(true))}
            onSelectSpot={select}
            layoutKey={drawerOpen ? 'open' : 'closed'}
          />
          <Sidebar
            spots={isSignedIn ? spots : []}
            onSelect={select}
            drawerOpen={drawerOpen}
            onDrawerOpenChange={setDrawerOpen}
            locationLabel={location.label}
            onOpenLocation={() => setLocOpen(true)}
          />
        </>
      )}

      {tab === 'collection' &&
        (isSignedIn ? (
          <CollectionPage
            items={collection}
            onSelect={setSelectedTinId}
            onAdd={() => setAddTinOpen(true)}
          />
        ) : (
          <div className="collection-page">
            <header className="collection-head">
              <h1 className="collection-title">Your collection</h1>
            </header>
            <AuthWall
              title="Sign up or log in with Google"
              body="Your matcha tins are private. Use Google to create an account or log back in, then add and browse your collection."
            />
          </div>
        ))}

      {tab === 'profile' && (
        <ProfilePage
          spotCount={isSignedIn ? spots.length : 0}
          tinCount={isSignedIn ? collection.length : 0}
        />
      )}

      <BottomNav active={tab} onChange={changeTab} />

      {location.showPrompt && tab === 'map' && (
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
        open={addOpen && !!isSignedIn}
        onClose={() => setAddOpen(false)}
        onSave={addSpot}
        spots={spots}
        searchCenter={location.searchCenter}
        regionId={location.regionId}
      />

      <TinDetail tin={selectedTin} onClose={() => setSelectedTinId(null)} />
      <AddTinSheet
        open={addTinOpen && !!isSignedIn}
        onClose={() => setAddTinOpen(false)}
        onSave={addTin}
      />

      <Sheet open={authPromptOpen} onClose={() => setAuthPromptOpen(false)}>
        <div className="auth-prompt">
          <div className="sheet-title">Sign up or log in</div>
          <p className="auth-prompt-body">
            Adding spots and saving your collection needs an account. Use Google (once enabled) or
            email — new users are created automatically.
          </p>
          <GoogleSignInButton onStarted={() => setAuthPromptOpen(false)} />
          <EmailSignInForm onStarted={() => setAuthPromptOpen(false)} />
        </div>
      </Sheet>
    </div>
  );
}
