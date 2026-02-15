/**
 * Shared IP geolocation utility.
 *
 * Strategy:
 * 1. Try /api/geo first (Vercel's built-in geo headers — same domain, ~50ms)
 * 2. If that fails, race all external endpoints in parallel
 *
 * Includes module-level cache + request deduplication so multiple callers
 * (ServerCrowdCounter, LocationService) share one result.
 */

export interface IPGeoResult {
  lat: number;
  lng: number;
  city: string | null;
}

interface EndpointConfig {
  url: string;
  parse: (data: any) => IPGeoResult | null;
}

const VERCEL_TIMEOUT_MS = 3000;
const FALLBACK_TIMEOUT_MS = 6000;
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

// Module-level cache shared across all callers
let cachedResult: IPGeoResult | null = null;
let cachedAt = 0;

// Deduplication: if a request is in-flight, reuse the same promise
let inflight: Promise<IPGeoResult | null> | null = null;

const fallbackEndpoints: EndpointConfig[] = [
  {
    url: 'https://get.geojs.io/v1/ip/geo.json',
    parse: (d) => {
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0) return null;
      return { lat, lng, city: d.city || null };
    },
  },
  {
    url: 'https://freeipapi.com/api/json',
    parse: (d) => {
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0) return null;
      return { lat, lng, city: d.cityName || null };
    },
  },
  {
    url: 'https://ipwhois.app/json/',
    parse: (d) => {
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0) return null;
      return { lat, lng, city: d.city || null };
    },
  },
  {
    url: 'https://ipwho.is/',
    parse: (d) => {
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0) return null;
      return { lat, lng, city: d.city || null };
    },
  },
  {
    url: 'https://ipinfo.io/json',
    parse: (d) => {
      if (typeof d.loc === 'string' && d.loc.includes(',')) {
        const [la, lo] = d.loc.split(',');
        const lat = Number(la);
        const lng = Number(lo);
        if (isNaN(lat) || isNaN(lng) || lat === 0) return null;
        return { lat, lng, city: d.city || null };
      }
      return null;
    },
  },
];

/**
 * Try Vercel's built-in geo endpoint first.
 * Same-origin request — no CORS, no external dependency, ~50ms.
 */
async function fetchVercelGeo(): Promise<IPGeoResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VERCEL_TIMEOUT_MS);
    const res = await fetch('/api/geo', { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (isNaN(lat) || isNaN(lng) || !lat) return null;
    return { lat, lng, city: data.city || null };
  } catch {
    return null;
  }
}

/**
 * Fallback: race all external endpoints in parallel.
 */
async function fetchExternalGeo(): Promise<IPGeoResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FALLBACK_TIMEOUT_MS);

  try {
    const result = await Promise.any(
      fallbackEndpoints.map(async ({ url, parse }) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const parsed = parse(data);
        if (!parsed) throw new Error('Parse failed');
        return parsed;
      })
    );
    return result;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

async function fetchGeo(): Promise<IPGeoResult | null> {
  // Try Vercel endpoint first (fastest)
  const vercelResult = await fetchVercelGeo();
  if (vercelResult) return vercelResult;

  // Fallback to external APIs
  return fetchExternalGeo();
}

/**
 * Get IP geolocation with caching and deduplication.
 * Multiple concurrent callers share one request + one cached result.
 */
export async function ipGeolocate(): Promise<IPGeoResult | null> {
  // Return cached result if fresh
  if (cachedResult && Date.now() - cachedAt < CACHE_MAX_AGE_MS) {
    return cachedResult;
  }

  // Deduplicate: reuse in-flight request
  if (inflight) return inflight;

  inflight = fetchGeo().then((result) => {
    if (result) {
      cachedResult = result;
      cachedAt = Date.now();
    }
    inflight = null;
    return result;
  });

  return inflight;
}
