import { useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import {
  fetchUserLibrary,
  isMissingTableError,
  mergeSpots,
  mergeTins,
  saveUserLibrary,
} from './cloudSync';
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
import { WelcomeScreen } from './components/WelcomeScreen';
import { Sheet } from './components/Sheet';
import { MapFilterSheet } from './components/MapFilterSheet';
import type { SpotFilters } from './components/MapView';
import type { PlaceResult } from './types';

export default function App() {
  const { isLoaded, isSignedIn, isGuest, canEnterApp, userId, continueAsGuest } = useAuth();
  const location = useLocationSettings();
  const [dataUserId, setDataUserId] = useState<string | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

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
  const [filterOpen, setFilterOpen] = useState(false);
  const [spotFilters, setSpotFilters] = useState<SpotFilters>({
    minRating: 0,
    punchedOnly: false,
  });
  const [addPrefill, setAddPrefill] = useState<PlaceResult | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setSpots([]);
      setCollection([]);
      setDataUserId(null);
      setLibraryReady(false);
      setSyncNote(null);
      setSelectedId(null);
      setSelectedTinId(null);
      setAddOpen(false);
      setAddTinOpen(false);
      return;
    }

    let cancelled = false;
    setLibraryReady(false);
    setSyncNote(null);

    const localSpots = loadSpots(userId);
    const localTins = loadTins(userId);
    setSpots(localSpots);
    setCollection(localTins);
    spotIdRef.current = nextNumericId(localSpots, 's', 1);
    tinIdRef.current = nextNumericId(localTins, 't', 1);

    (async () => {
      try {
        const remote = await fetchUserLibrary(userId);
        if (cancelled) return;
        const mergedSpots = mergeSpots(localSpots, remote?.spots ?? []);
        const mergedTins = mergeTins(localTins, remote?.tins ?? []);
        setSpots(mergedSpots);
        setCollection(mergedTins);
        spotIdRef.current = nextNumericId(mergedSpots, 's', 1);
        tinIdRef.current = nextNumericId(mergedTins, 't', 1);
        saveSpots(userId, mergedSpots);
        saveTins(userId, mergedTins);

        const remoteEmpty = !(remote?.spots.length || remote?.tins.length);
        const hasData = mergedSpots.length > 0 || mergedTins.length > 0;
        const changed =
          mergedSpots.length !== (remote?.spots.length ?? 0) ||
          mergedTins.length !== (remote?.tins.length ?? 0);
        if (hasData && (remoteEmpty || changed)) {
          await saveUserLibrary(userId, mergedSpots, mergedTins);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          if (isMissingTableError(err)) {
            setSyncNote(
              'Cloud sync isn’t set up yet — run supabase/user_library.sql in the Supabase SQL Editor.',
            );
          } else {
            setSyncNote('Couldn’t reach cloud sync. Spots still save on this device.');
          }
        }
      } finally {
        if (!cancelled) {
          setDataUserId(userId);
          setLibraryReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, isLoaded]);

  useEffect(() => {
    if (!libraryReady || !dataUserId || dataUserId !== userId) return;
    saveSpots(dataUserId, spots);
    saveTins(dataUserId, collection);

    const handle = window.setTimeout(() => {
      void saveUserLibrary(dataUserId, spots, collection).catch((err) => {
        console.error(err);
        if (isMissingTableError(err)) {
          setSyncNote(
            'Cloud sync isn’t set up yet — run supabase/user_library.sql in the Supabase SQL Editor.',
          );
        }
      });
    }, 700);

    return () => window.clearTimeout(handle);
  }, [spots, collection, libraryReady, dataUserId, userId]);

  const selected = spots.find((s) => s.id === selectedId) ?? null;
  const selectedTin = collection.find((t) => t.id === selectedTinId) ?? null;

  const filteredSpots = spots.filter((s) => {
    if (spotFilters.minRating > 0 && s.rating < spotFilters.minRating) return false;
    if (spotFilters.punchedOnly && s.punches <= 0) return false;
    return true;
  });
  const filtersActive = spotFilters.minRating > 0 || spotFilters.punchedOnly;

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

  const locateUser = () => {
    if (location.deviceLocation) {
      // Recenter on what we have now, then refresh in the background — the
      // position may be remembered from a previous visit.
      setFocus({ lat: location.deviceLocation.lat, lng: location.deviceLocation.lng });
      setRecenterKey((n) => n + 1);
      location.requestDeviceLocation();
      return;
    }
    location.enableDeviceLocation();
    goToArea();
  };

  const select = (id: string) => {
    setSelectedId(id);
    const s = spots.find((x) => x.id === id);
    if (s && s.lat != null && s.lng != null) setFocus({ lat: s.lat, lng: s.lng });
  };

  const pickPlace = (place: PlaceResult) => {
    const existing = spots.find(
      (s) =>
        s.name.toLowerCase() === place.name.toLowerCase() &&
        (s.addr || '').toLowerCase() === (place.addr || '').toLowerCase(),
    );
    if (existing) {
      select(existing.id);
      setDrawerOpen(true);
      return;
    }
    if (place.lat != null && place.lng != null) {
      setFocus({ lat: place.lat, lng: place.lng });
    }
    requireAuth(() => {
      setAddPrefill(place);
      setAddOpen(true);
    });
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

  if (!isLoaded) {
    return <div className="app-loading" aria-busy="true" />;
  }

  if (!canEnterApp) {
    return <WelcomeScreen onGuest={continueAsGuest} />;
  }

  return (
    <div
      className={`app${drawerOpen ? ' drawer-expanded' : ''}${tab !== 'map' ? ' tab-page' : ''}`}
    >
      {tab === 'map' && (
        <>
          <MapView
            spots={isSignedIn ? filteredSpots : []}
            focus={focus}
            userLocation={location.deviceLocation}
            mapTarget={mapTarget}
            recenterKey={recenterKey}
            searchCenter={location.searchCenter}
            regionId={location.regionId}
            onAdd={() => requireAuth(() => {
              setAddPrefill(null);
              setAddOpen(true);
            })}
            onOpenFavorites={() => setDrawerOpen(true)}
            onLocate={locateUser}
            onOpenFilters={() => setFilterOpen(true)}
            onSelectSpot={select}
            onPickPlace={pickPlace}
            layoutKey={drawerOpen ? 'open' : 'closed'}
            filtersActive={filtersActive}
          />
          <Sidebar
            spots={isSignedIn ? filteredSpots : []}
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
              <h1 className="collection-title">My collection</h1>
            </header>
            <AuthWall
              title="Sign up to build your matcha library"
              body="Guests can explore the map. Create an account to save tins, track taste notes, and grow your collection."
            />
          </div>
        ))}

      {tab === 'profile' && (
        <ProfilePage
          spotCount={isSignedIn ? spots.length : 0}
          tinCount={isSignedIn ? collection.length : 0}
          isGuest={isGuest}
          onRequestSignUp={() => setAuthPromptOpen(true)}
          syncNote={syncNote}
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
        usingDevice={location.usingDevice}
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
        onClose={() => {
          setAddPrefill(null);
          setAddOpen(false);
        }}
        onSave={addSpot}
        spots={spots}
        searchCenter={location.searchCenter}
        regionId={location.regionId}
        initialPlace={addPrefill}
      />

      <MapFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={spotFilters}
        onChange={setSpotFilters}
      />

      <TinDetail tin={selectedTin} onClose={() => setSelectedTinId(null)} />
      <AddTinSheet
        open={addTinOpen && !!isSignedIn}
        onClose={() => setAddTinOpen(false)}
        onSave={addTin}
      />

      <Sheet open={authPromptOpen} onClose={() => setAuthPromptOpen(false)}>
        <div className="auth-prompt welcome-sheet">
          <div className="sheet-title">Sign up to continue</div>
          <p className="auth-prompt-body">
            Saving spots and your matcha library needs an account. Guests can keep exploring the
            map anytime.
          </p>
          <div className="welcome-sheet-auth">
            <GoogleSignInButton label="Continue with Google" />
            <EmailSignInForm label="Email" />
          </div>
        </div>
      </Sheet>
    </div>
  );
}
