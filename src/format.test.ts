import { describe, expect, it } from 'vitest';
import { formatAccuracy, formatCoordinate, formatPlace, toDms } from './format';
import type { GeoLocation } from './types';

const location: GeoLocation = {
  latitude: 40.7128,
  longitude: -74.006,
  city: 'New York',
  region: 'New York',
  country: 'United States',
  source: 'network',
};

describe('location formatting', () => {
  it('formats signed coordinates with their cardinal direction', () => {
    expect(formatCoordinate(location.latitude, 'lat')).toBe('40.71280° N');
    expect(formatCoordinate(location.longitude, 'lng')).toBe('74.00600° W');
  });

  it('removes duplicate place names', () => {
    expect(formatPlace(location)).toBe('New York, United States');
  });

  it('distinguishes network and precise accuracy', () => {
    expect(formatAccuracy(location)).toBe('Approximate · IP network');
    expect(formatAccuracy({ ...location, source: 'precise', accuracy: 18.2 })).toBe('Accurate to 18 m · GPS / Wi-Fi');
  });

  it('converts decimal coordinates to DMS', () => {
    expect(toDms(-74.006, 'lng')).toBe('74° 0′ 21.6″ W');
  });
});
