import type { GeoPoint } from './geolocation';
import type { PlaceResult } from './types';

export type RegionId = 'nyc' | 'toronto' | 'montreal' | 'tokyo' | 'kyoto';

export interface Region {
  id: RegionId;
  name: string;
  center: GeoPoint;
  zoom: number;
  searchHint: string;
}

export const REGIONS: Region[] = [
  {
    id: 'nyc',
    name: 'New York',
    center: { lat: 40.728, lng: -73.998 },
    zoom: 13,
    searchHint: 'New York',
  },
  {
    id: 'toronto',
    name: 'Toronto',
    center: { lat: 43.6532, lng: -79.3832 },
    zoom: 13,
    searchHint: 'Toronto',
  },
  {
    id: 'montreal',
    name: 'Montreal',
    center: { lat: 45.5017, lng: -73.5673 },
    zoom: 13,
    searchHint: 'Montreal',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    center: { lat: 35.6762, lng: 139.6503 },
    zoom: 12,
    searchHint: 'Tokyo',
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    center: { lat: 35.0116, lng: 135.7681 },
    zoom: 13,
    searchHint: 'Kyoto',
  },
];

export const DEFAULT_REGION = REGIONS[0];

export function getRegion(id: RegionId | string | null | undefined): Region {
  return REGIONS.find((r) => r.id === id) ?? DEFAULT_REGION;
}

/** Curated matcha / tea spots used as local search hints per city */
export const curatedPlaces: Record<RegionId, PlaceResult[]> = {
  nyc: [
    {
      name: 'Cha Cha Matcha',
      addr: '327 Lafayette Street, New York, New York',
      lat: 40.7242,
      lng: -73.9962,
    },
    {
      name: 'Cha Cha Matcha',
      addr: '1158 Broadway, New York, New York',
      lat: 40.7445,
      lng: -73.9886,
    },
    {
      name: 'Cha Cha Matcha',
      addr: '421 8th Avenue, New York, New York',
      lat: 40.7515,
      lng: -73.9955,
    },
    {
      name: 'Cha Cha Matcha',
      addr: '922 Broadway, New York, New York',
      lat: 40.739,
      lng: -73.9897,
    },
    {
      name: 'teabowl',
      addr: '77 Greenwich Avenue, New York',
      lat: 40.7357,
      lng: -74.0024,
    },
    {
      name: 'Choji',
      addr: '46 East 8th Street, New York',
      lat: 40.7308,
      lng: -73.9939,
    },
  ],
  toronto: [
    {
      name: 'Matcha Box',
      addr: '192 Dundas Street West, Toronto, Ontario',
      lat: 43.6545,
      lng: -79.3872,
    },
    {
      name: 'Tsujiri',
      addr: '143 Dundas Street West, Toronto, Ontario',
      lat: 43.6548,
      lng: -79.3855,
    },
    {
      name: 'Uncle Tetsu',
      addr: '598 Bay Street, Toronto, Ontario',
      lat: 43.6562,
      lng: -79.3835,
    },
    {
      name: 'Matcha Cafe Maiko',
      addr: '161 Dundas Street West, Toronto, Ontario',
      lat: 43.6546,
      lng: -79.386,
    },
    {
      name: 'Nest Coffee House',
      addr: '508 Queen Street West, Toronto, Ontario',
      lat: 43.6476,
      lng: -79.4021,
    },
  ],
  montreal: [
    {
      name: 'Café Olimpico',
      addr: '124 Rue Saint-Viateur Ouest, Montreal, Quebec',
      lat: 45.5235,
      lng: -73.5955,
    },
    {
      name: 'Dispatch Coffee',
      addr: '4021 Boulevard Saint-Laurent, Montreal, Quebec',
      lat: 45.5178,
      lng: -73.5812,
    },
    {
      name: 'Tommy Café',
      addr: '151 Rue Saint-Paul Ouest, Montreal, Quebec',
      lat: 45.5012,
      lng: -73.5568,
    },
    {
      name: 'Café Myriade',
      addr: '1432 Rue Mackay, Montreal, Quebec',
      lat: 45.4962,
      lng: -73.5795,
    },
    {
      name: 'Crew Collective & Café',
      addr: '360 Rue Saint-Jacques, Montreal, Quebec',
      lat: 45.5019,
      lng: -73.5605,
    },
  ],
  tokyo: [
    {
      name: 'Tsujiri',
      addr: '1-chōme-11-11 Ginza, Chuo City, Tokyo',
      lat: 35.6714,
      lng: 139.7646,
    },
    {
      name: 'nana’s green tea',
      addr: '2-chōme-24-1 Shibuya, Shibuya City, Tokyo',
      lat: 35.6595,
      lng: 139.7005,
    },
    {
      name: 'Matcha Stand Maruni',
      addr: '1-chōme-19-5 Jingūmae, Shibuya City, Tokyo',
      lat: 35.6685,
      lng: 139.7058,
    },
    {
      name: 'Saryo Tsujiri',
      addr: '4-chōme-1-15 Ginza, Chuo City, Tokyo',
      lat: 35.6719,
      lng: 139.7665,
    },
    {
      name: 'Ippodo Tea',
      addr: '3-chōme-1-1 Marunouchi, Chiyoda City, Tokyo',
      lat: 35.6812,
      lng: 139.7671,
    },
  ],
  kyoto: [
    {
      name: 'Ippodo Tea',
      addr: 'Teramachi-dori Nijo-agaru, Nakagyo-ku, Kyoto',
      lat: 35.0135,
      lng: 135.7668,
    },
    {
      name: 'Tsujiri Honke',
      addr: 'Gionmachi Kitagawa, Higashiyama-ku, Kyoto',
      lat: 35.0035,
      lng: 135.775,
    },
    {
      name: 'Nakamura Tokichi',
      addr: '10-1 Uji-Otsucho, Uji, Kyoto',
      lat: 34.8906,
      lng: 135.8005,
    },
    {
      name: 'Kyo matcha',
      addr: '570-122 Gionmachi Minamigawa, Higashiyama-ku, Kyoto',
      lat: 35.0032,
      lng: 135.7755,
    },
    {
      name: 'Maccha House',
      addr: 'Shijo-dori, Shimogyo-ku, Kyoto',
      lat: 35.0031,
      lng: 135.7635,
    },
  ],
};
