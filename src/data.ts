import type { Spot } from './types';
import { curatedPlaces } from './regions';

/** Default spots used when this device has nothing saved yet. */
export const initialSpots: Spot[] = [
  { id: 's1', name: 'teabowl', addr: '77 Greenwich Ave', lat: 40.7359, lng: -74.0027, rating: 0, punches: 0 },
  { id: 's2', name: 'test', addr: '77 Greenwich Ave', lat: 40.7361, lng: -74.0031, rating: 0, punches: 0 },
  { id: 's3', name: 'test', addr: 'test', lat: null, lng: null, rating: 0, punches: 0 },
  { id: 's4', name: 'teabowl', addr: '77 Greenwich Avenue, New York', lat: 40.7357, lng: -74.0024, rating: 0, punches: 0 },
  { id: 's5', name: 'Choji', addr: '46 East 8th Street, New York', lat: 40.7308, lng: -73.9939, rating: 1, punches: 0 },
];

/** @deprecated Prefer curatedPlaces from regions — kept for compatibility */
export const placeResults = curatedPlaces.nyc;
