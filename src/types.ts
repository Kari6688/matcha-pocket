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
