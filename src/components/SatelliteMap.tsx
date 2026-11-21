import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { GeoLocation, JourneyStatus } from '../types';

export interface MapHandle {
  recenter: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface SatelliteMapProps {
  location: GeoLocation | null;
  onJourneyChange: (status: JourneyStatus) => void;
}

const SatelliteMap = forwardRef<MapHandle, SatelliteMapProps>(function SatelliteMap(
  { location, onJourneyChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const callbackRef = useRef(onJourneyChange);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbackRef.current = onJourneyChange;
  }, [onJourneyChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: {
        version: 8,
        projection: {
          type: [
            'interpolate',
            ['linear'],
            ['zoom'],
            5,
            'vertical-perspective',
            7,
            'mercator',
          ],
        },
        sky: { 'atmosphere-blend': 0.8 },
        sources: {
          satellite: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
          },
          places: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
          },
        },
        layers: [
          { id: 'satellite', type: 'raster', source: 'satellite' },
          {
            id: 'places',
            type: 'raster',
            source: 'places',
            paint: { 'raster-opacity': 0.85 },
          },
        ],
      },
      center: [12, 22],
      zoom: 1.15,
      minZoom: 0.5,
      maxZoom: 19,
      renderWorldCopies: false,
      attributionControl: { compact: true },
      fadeDuration: 350,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.on('load', () => setReady(true));
    map.on('dragstart', () => callbackRef.current('arrived'));
    map.on('error', (event) => {
      // Individual third-party tile failures should not interrupt the journey.
      console.warn('Map resource unavailable:', event.error?.message || 'Unknown map error');
    });

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !location) return;

    callbackRef.current('zooming');
    markerRef.current?.remove();
    const markerElement = document.createElement('div');
    markerElement.className = 'location-marker';
    markerElement.innerHTML = '<span class="marker-core"></span><span class="marker-pulse"></span>';
    markerElement.setAttribute('aria-label', 'Your detected location');
    markerRef.current = new Marker({ element: markerElement, anchor: 'center' })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);

    map.stop();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.flyTo({
      center: [location.longitude, location.latitude],
      zoom: location.source === 'precise' ? 18.25 : 14.25,
      duration: reducedMotion ? 800 : 18_000,
      curve: 1.15,
      essential: true,
    });
    map.once('moveend', () => callbackRef.current('arrived'));
  }, [location?.latitude, location?.longitude, location?.source, ready]);

  useImperativeHandle(ref, () => ({
    recenter() {
      if (!location || !mapRef.current) return;
      callbackRef.current('zooming');
      mapRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: location.source === 'precise' ? 18.25 : 14.25,
        duration: 2200,
        essential: true,
      });
      mapRef.current.once('moveend', () => callbackRef.current('arrived'));
    },
    zoomIn() {
      mapRef.current?.zoomIn({ duration: 500 });
    },
    zoomOut() {
      mapRef.current?.zoomOut({ duration: 500 });
    },
    resetView() {
      if (!mapRef.current) return;
      callbackRef.current('zooming');
      mapRef.current.flyTo({ center: [12, 22], zoom: 1.15, duration: 2600, essential: true });
      mapRef.current.once('moveend', () => callbackRef.current('arrived'));
    },
  }), [location]);

  return <div ref={containerRef} className="satellite-map" aria-label="Interactive satellite map" />;
});

export default SatelliteMap;
