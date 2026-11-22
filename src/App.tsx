import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  Crosshair,
  Expand,
  Globe2,
  Info,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Minimize,
  Minus,
  MousePointer2,
  Navigation,
  Plus,
  RefreshCw,
  Satellite,
  ShieldCheck,
  X,
} from 'lucide-react';
import SatelliteMap, { type MapHandle } from './components/SatelliteMap';
import { formatAccuracy, formatCoordinate, formatPlace } from './format';
import { getNetworkLocation, getPreciseLocation, refineLocationName } from './location';
import type { GeoLocation, JourneyStatus, LocationStatus } from './types';

type PermissionState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

function App() {
  const mapRef = useRef<MapHandle>(null);
  const locationRef = useRef<GeoLocation | null>(null);
  const networkPendingRef = useRef(false);
  const precisePendingRef = useRef(false);
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('locating');
  const [journey, setJourney] = useState<JourneyStatus>('waiting');
  const [permission, setPermission] = useState<PermissionState>('idle');
  const [copied, setCopied] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const applyLocation = useCallback((next: GeoLocation) => {
    locationRef.current = next;
    setLocation(next);
    setLocationStatus('located');
  }, []);

  const requestPreciseLocation = useCallback(async (signal?: AbortSignal) => {
    precisePendingRef.current = true;
    setPermission('requesting');
    if (!locationRef.current) setLocationStatus('locating');
    try {
      const position = await getPreciseLocation();
      if (signal?.aborted) return;
      setPermission('granted');
      const precise: GeoLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'precise',
      };
      applyLocation(precise);
      const refined = await refineLocationName(precise, signal ?? new AbortController().signal);
      if (!signal?.aborted && locationRef.current?.source === 'precise') applyLocation(refined);
    } catch (error) {
      if (signal?.aborted) return;
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? Number(error.code)
        : 0;
      setPermission(code === 1 ? 'denied' : 'unavailable');
      if (!locationRef.current) {
        setLocationStatus(networkPendingRef.current ? 'locating' : 'unavailable');
      }
    } finally {
      if (!signal?.aborted) {
        precisePendingRef.current = false;
        if (!locationRef.current && !networkPendingRef.current) setLocationStatus('unavailable');
      }
    }
  }, [applyLocation]);

  const acquireNetworkLocation = useCallback(async (signal?: AbortSignal) => {
    networkPendingRef.current = true;
    if (!locationRef.current) setLocationStatus('locating');
    try {
      const networkLocation = await getNetworkLocation(signal ?? new AbortController().signal);
      if (signal?.aborted || locationRef.current?.source === 'precise') return;
      applyLocation(networkLocation);
    } catch (error) {
      if (signal?.aborted) return;
      if (!locationRef.current && !precisePendingRef.current) setLocationStatus('unavailable');
    } finally {
      if (!signal?.aborted) {
        networkPendingRef.current = false;
        if (!locationRef.current && !precisePendingRef.current) setLocationStatus('unavailable');
      }
    }
  }, [applyLocation]);

  useEffect(() => {
    const controller = new AbortController();
    void acquireNetworkLocation(controller.signal);
    void requestPreciseLocation(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!aboutOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAboutOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aboutOpen]);

  const copyCoordinates = async () => {
    if (!location) return;
    const text = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copy your coordinates', text);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen may be unavailable in embedded browsers; the map remains usable.
    }
  };

  const retry = () => {
    void acquireNetworkLocation();
    void requestPreciseLocation();
  };

  const place = location ? formatPlace(location) : '';
  const locationTitle = location?.placeName || location?.city || 'Your location';
  const isLocated = locationStatus === 'located' && location;

  return (
    <main className={`experience journey-${journey}`}>
      <div className="space-backdrop" aria-hidden="true" />
      <SatelliteMap ref={mapRef} location={location} onJourneyChange={setJourney} />
      <div className="map-shade" aria-hidden="true" />
      <div className="noise" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="/" aria-label="Terra home">
          <span className="brand-orbit"><Globe2 size={24} strokeWidth={1.4} /><i /></span>
          <span className="brand-name">terra<span className="brand-period">.</span></span>
          <span className="brand-tagline">A PERSONAL<br />PLANET</span>
        </a>

        <div className="mission-status" aria-live="polite">
          <span className={`status-light ${isLocated ? 'acquired' : locationStatus === 'unavailable' ? 'lost' : ''}`} />
          <span>{locationStatus === 'unavailable' ? 'SIGNAL UNAVAILABLE' : journey === 'zooming' ? 'DESCENDING TO EARTH' : isLocated ? 'SIGNAL ACQUIRED' : 'TRIANGULATING POSITION'}</span>
          <span className="mission-index">{isLocated ? '03' : journey === 'zooming' ? '02' : '01'} / 03</span>
        </div>

        <button className="about-button" onClick={() => setAboutOpen(true)}>
          <Info size={16} />
          <span>About this experience</span>
        </button>
      </header>

      <section className={`hero ${journey === 'arrived' ? 'hero-arrived' : ''}`} aria-labelledby="hero-title">
        <div className="eyebrow"><span /> YOUR PLACE IN THE UNIVERSE</div>
        <h1 id="hero-title">You are<br /><em>here.</em></h1>
        <p>
          {locationStatus === 'unavailable'
            ? 'We couldn’t find your signal. The Earth is still yours to explore.'
            : journey === 'arrived'
              ? <>One small point on an extraordinary planet.<br /><strong>Welcome to your corner of it.</strong></>
              : <>From a world of infinite places to the one<br className="desktop-break" /> that is uniquely yours. Right now.</>}
        </p>
        {locationStatus === 'unavailable' && (
          <button className="primary-button retry-button" onClick={retry}>
            <RefreshCw size={16} /> Try locating me again
          </button>
        )}
      </section>

      <aside className="map-tools" aria-label="Map controls">
        <button onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in" title="Zoom in"><Plus size={19} /></button>
        <button onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out" title="Zoom out"><Minus size={19} /></button>
        <span className="tool-divider" />
        <button onClick={() => mapRef.current?.recenter()} disabled={!location} aria-label="Recenter on my location" title="Recenter"><Crosshair size={18} /></button>
        <button onClick={() => mapRef.current?.resetView()} aria-label="View the whole Earth" title="Whole Earth"><Globe2 size={18} /></button>
        <button onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen">
          {isFullscreen ? <Minimize size={17} /> : <Expand size={17} />}
        </button>
      </aside>

      <div className="explore-hint"><MousePointer2 size={13} /><span>DRAG TO EXPLORE</span><i /> <span>SCROLL TO ZOOM</span></div>

      <section className={`location-card ${isLocated ? 'card-located' : ''}`} aria-label="Your detected location" aria-live="polite">
        {locationStatus === 'unavailable' ? (
          <div className="card-empty">
            <Navigation size={24} />
            <div><h2>Signal not found</h2><p>Check location permissions and your connection.</p></div>
            <button onClick={retry} aria-label="Retry location"><RefreshCw size={18} /></button>
          </div>
        ) : !location ? (
          <div className="card-loading">
            <div className="loading-symbol"><LoaderCircle size={24} /></div>
            <div><span className="card-overline">SEARCHING FOR YOUR SIGNAL</span><h2>Finding your place…</h2></div>
            <div className="loading-lines"><i /><i /><i /></div>
          </div>
        ) : (
          <>
            <div className="card-heading">
              <div className="location-icon"><MapPin size={19} fill="currentColor" /></div>
              <div className="place-heading">
                <span className="card-overline">
                  {journey === 'zooming'
                    ? location.source === 'precise' ? 'DESTINATION LOCKED' : 'APPROXIMATE AREA FOUND'
                    : location.source === 'precise' ? 'YOUR CURRENT COORDINATES' : 'APPROXIMATE AREA REFERENCE'}
                </span>
                <h2>{locationTitle}</h2>
                <p>{location.placeName ? place : place || 'Planet Earth'}</p>
              </div>
              <span className={`source-badge ${location.source}`} title={location.source === 'network' ? 'Approximate location from your IP address' : 'High-accuracy location from your device'}>
                {location.source === 'precise' ? <LocateFixed size={13} /> : <Satellite size={13} />}
                {location.source === 'precise' ? 'PRECISE' : 'APPROXIMATE'}
              </span>
            </div>

            <div className="coordinate-grid">
              <div><span>{location.source === 'precise' ? 'LATITUDE' : 'AREA LATITUDE'}</span><strong>{formatCoordinate(location.latitude, 'lat')}</strong></div>
              <div><span>{location.source === 'precise' ? 'LONGITUDE' : 'AREA LONGITUDE'}</span><strong>{formatCoordinate(location.longitude, 'lng')}</strong></div>
              <button className={copied ? 'copied' : ''} onClick={copyCoordinates} aria-label="Copy decimal coordinates" title="Copy coordinates">
                {copied ? <Check size={17} /> : <Copy size={16} />}<span>{copied ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>

            <div className="card-footer">
              <span className="accuracy"><ShieldCheck size={14} />{formatAccuracy(location)}</span>
              {location.source === 'network' ? (
                <button className="refine-button" onClick={() => void requestPreciseLocation()} disabled={permission === 'requesting'}>
                  {permission === 'requesting' ? <LoaderCircle className="spin" size={14} /> : <LocateFixed size={14} />}
                  {permission === 'requesting' ? 'Refining…' : permission === 'denied' ? 'Enable GPS' : 'Refine with GPS'}
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button className="recenter-button" onClick={() => mapRef.current?.recenter()}><Crosshair size={14} /> Recenter</button>
              )}
            </div>
          </>
        )}
      </section>

      <footer className="experience-footer">
        <span><i /> LIVE SATELLITE EXPERIENCE</span>
        <span className="privacy-note"><ShieldCheck size={12} /> YOUR LOCATION IS NEVER STORED</span>
      </footer>

      {copied && <div className="toast" role="status"><Check size={15} /> Coordinates copied to clipboard</div>}

      {aboutOpen && (
        <div className="modal-backdrop" onClick={() => setAboutOpen(false)}>
          <section className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" autoFocus onClick={() => setAboutOpen(false)} aria-label="Close about dialog"><X size={20} /></button>
            <span className="modal-icon"><Globe2 size={30} strokeWidth={1.3} /></span>
            <div className="eyebrow"><span /> THE IDEA BEHIND TERRA</div>
            <h2 id="about-title">A little perspective.<br />A precise place.</h2>
            <p>Terra turns something technical into something human: a journey from the whole of our planet to the exact point where you are.</p>
            <div className="about-steps">
              <div><span>01</span><section><h3>First, a network fix</h3><p>Your IP address provides an approximate city-level starting point, so the journey can begin immediately.</p></section></div>
              <div><span>02</span><section><h3>Then, a precise signal</h3><p>With your permission, your browser uses GPS, Wi-Fi, and other device signals to refine your location.</p></section></div>
              <div><span>03</span><section><h3>Finally, your place</h3><p>High-resolution satellite imagery carries you down to street level. Drag, zoom, and make the view your own.</p></section></div>
            </div>
            <div className="privacy-panel"><ShieldCheck size={22} /><div><h3>Private by design</h3><p>Your coordinates stay in this tab and are never stored by Terra. Location, reverse-geocoding, and imagery requests are handled by your browser and their respective providers.</p></div></div>
            <button className="primary-button modal-action" onClick={() => setAboutOpen(false)}>Back to Earth <ChevronRight size={16} /></button>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
