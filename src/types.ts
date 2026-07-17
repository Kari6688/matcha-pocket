export interface Spot {
  id: string;
  name: string;
  addr: string;
  lat: number | null;
  lng: number | null;
  rating: number;
  punches: number;
}

export interface PlaceResult {
  name: string;
  addr: string;
  lat: number | null;
  lng: number | null;
}

export type TeaKind = 'matcha' | 'hojicha';

export type TeaOrigin =
  | 'Japan'
  | 'Uji'
  | 'Nishio'
  | 'Kagoshima'
  | 'Shizuoka'
  | 'Other';

/** Taste axes for the quadrant chart (0–1). */
export interface TasteProfile {
  /** 0 = umami, 1 = sweetness */
  sweetness: number;
  /** 0 = soft, 1 = rich */
  richness: number;
}

export type TinSkin = 'rocky' | 'wako' | 'jade' | 'ember' | 'ink' | 'cream';

export interface MatchaTin {
  id: string;
  brand: string;
  name: string;
  kind: TeaKind;
  origin: TeaOrigin;
  description: string;
  productUrl?: string;
  taste: TasteProfile;
  skin: TinSkin;
  /** Optional cutout photo (data URL, usually PNG with transparent background). */
  photoUrl?: string;
}

export type AppTab = 'map' | 'collection' | 'profile';
