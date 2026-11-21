import type { GeoLocation } from './types';

interface IpWhoResponse {
  success?: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
}

interface IpApiResponse {
  error?: boolean;
  latitude?: number;
  longitude?: number;
  city?: string;
  region?: string;
  country_name?: string;
  country_code?: string;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Location service returned ${response.status}`);
  return response.json() as Promise<T>;
}

export async function getNetworkLocation(signal: AbortSignal): Promise<GeoLocation> {
  try {
    const data = await fetchJson<IpWhoResponse>('https://ipwho.is/', signal);
    if (!data.success || data.latitude == null || data.longitude == null) {
      throw new Error('Network location unavailable');
    }
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      region: data.region,
      country: data.country,
      countryCode: data.country_code,
      source: 'network',
    };
  } catch (error) {
    if (signal.aborted) throw error;
    const data = await fetchJson<IpApiResponse>('https://ipapi.co/json/', signal);
    if (data.error || data.latitude == null || data.longitude == null) {
      throw new Error('Network location unavailable');
    }
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      region: data.region,
      country: data.country_name,
      countryCode: data.country_code,
      source: 'network',
    };
  }
}

export function getPreciseLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 60_000,
    });
  });
}

interface ReverseGeocodeResponse {
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

export async function refineLocationName(
  location: GeoLocation,
  signal: AbortSignal,
): Promise<GeoLocation> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(location.latitude),
    lon: String(location.longitude),
    zoom: '18',
    'accept-language': 'en',
  });
  try {
    const data = await fetchJson<ReverseGeocodeResponse>(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      signal,
    );
    const address = data.address;
    if (!address) return location;
    const street = [address.house_number, address.road].filter(Boolean).join(' ');
    const neighborhood = address.neighbourhood || address.suburb;
    return {
      ...location,
      placeName: street || neighborhood || data.display_name?.split(',')[0],
      city: address.city || address.town || address.village || address.county || location.city,
      region: address.state || location.region,
      country: address.country || location.country,
      countryCode: address.country_code?.toUpperCase() || location.countryCode,
    };
  } catch (error) {
    if (signal.aborted) throw error;
    return location;
  }
}
