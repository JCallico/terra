export type LocationSource = 'network' | 'precise';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  accuracy?: number;
  source: LocationSource;
  placeName?: string;
}

export type LocationStatus = 'locating' | 'located' | 'unavailable';
export type JourneyStatus = 'waiting' | 'zooming' | 'arrived';
