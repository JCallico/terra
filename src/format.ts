import type { GeoLocation } from './types';

export function formatCoordinate(value: number, axis: 'lat' | 'lng'): string {
  const direction = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${Math.abs(value).toFixed(5)}° ${direction}`;
}

export function formatAccuracy(location: GeoLocation): string {
  if (location.source === 'network') return 'Approximate · IP network';
  if (location.accuracy == null) return 'Precise · Device location';
  const accuracy = location.accuracy >= 1000
    ? `${(location.accuracy / 1000).toFixed(1)} km`
    : `${Math.round(location.accuracy)} m`;
  return `Accurate to ${accuracy} · GPS / Wi-Fi`;
}

export function formatPlace(location: GeoLocation): string {
  return [location.city, location.region, location.country]
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join(', ') || 'Your corner of the Earth';
}

export function toDms(value: number, axis: 'lat' | 'lng'): string {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
  const direction = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${degrees}° ${minutes}′ ${seconds}″ ${direction}`;
}
