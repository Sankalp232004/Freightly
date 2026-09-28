import { Pool } from 'pg';

export interface DistanceResult {
  distanceKm: number;
  durationHours: number;
  source: 'ors' | 'estimate';
}

// Approximate city centre coordinates for Indian cities (fallback only)
const CITY_COORDS: Record<string, [number, number]> = {
  'mumbai': [19.0760, 72.8777],
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  'bengaluru': [12.9716, 77.5946],
  'bangalore': [12.9716, 77.5946],
  'chennai': [13.0827, 80.2707],
  'kolkata': [22.5726, 88.3639],
  'hyderabad': [17.3850, 78.4867],
  'pune': [18.5204, 73.8567],
  'ahmedabad': [23.0225, 72.5714],
  'jaipur': [26.9124, 75.7873],
  'surat': [21.1702, 72.8311],
  'lucknow': [26.8467, 80.9462],
  'kanpur': [26.4499, 80.3319],
  'nagpur': [21.1458, 79.0882],
  'indore': [22.7196, 75.8577],
  'bhopal': [23.2599, 77.4126],
  'visakhapatnam': [17.6868, 83.2185],
  'kochi': [9.9312, 76.2673],
  'agra': [27.1767, 78.0081],
  'varanasi': [25.3176, 82.9739],
  'guwahati': [26.1445, 91.7362],
  'amritsar': [31.6340, 74.8723],
  'chandigarh': [30.7333, 76.7794],
  'coimbatore': [11.0168, 76.9558],
  'patna': [25.5941, 85.1376],
  'ranchi': [23.3441, 85.3096],
  'bhubaneswar': [20.2961, 85.8245],
  'thiruvananthapuram': [8.5241, 76.9366],
  'mysuru': [12.2958, 76.6394],
  'mangaluru': [12.9153, 74.8560],
  'goa': [15.2993, 74.1240],
  'panaji': [15.4909, 73.8278],
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateRoadDistance(
  city1: string,
  city2: string,
  coords1?: [number, number] | null,
  coords2?: [number, number] | null,
): DistanceResult | null {
  const c1 = coords1 ?? CITY_COORDS[city1.toLowerCase().trim()];
  const c2 = coords2 ?? CITY_COORDS[city2.toLowerCase().trim()];
  if (!c1 || !c2) return null;

  const straightLine = haversineKm(c1[0], c1[1], c2[0], c2[1]);
  // Road distance is typically 1.25× great-circle for India
  const distanceKm = Math.round(straightLine * 1.25);
  // Average road speed 50 km/h
  const durationHours = Math.round((distanceKm / 50) * 10) / 10;

  return { distanceKm, durationHours, source: 'estimate' };
}

export async function geocodeCity(
  query: string,
  pool: Pool,
  apiKey?: string,
): Promise<[number, number] | null> {
  const norm = query.toLowerCase().trim().replace(/\s+/g, ' ');

  // 1. Check geocode_cache table
  try {
    const cached = await pool.query(
      'SELECT result FROM geocode_cache WHERE normalized_query = $1',
      [norm],
    );
    if (cached.rows.length) {
      const raw = cached.rows[0].result;
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const coords = data?.features?.[0]?.geometry?.coordinates;
      if (coords && coords.length >= 2) {
        return [coords[1], coords[0]]; // [lat, lng]
      }
    }
  } catch {
    // If DB check fails, continue to API
  }

  // 2. Fall back to hardcoded coordinates if no API key
  const key = apiKey || process.env.ORS_API_KEY;
  if (!key || key === 'your-ors-api-key-here' || key === 'test-key') {
    return CITY_COORDS[norm] ?? null;
  }

  // 3. Query ORS Geocode Search API
  try {
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(
      key,
    )}&text=${encodeURIComponent(query)}&boundary.country=IN&size=1`;

    const resp = await fetch(url, {
      headers: {
        Authorization: key,
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!resp.ok) {
      return CITY_COORDS[norm] ?? null;
    }

    const data = await resp.json();
    const coords = (data as any)?.features?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) {
      return CITY_COORDS[norm] ?? null;
    }

    // Cache the result in geocode_cache
    try {
      await pool.query(
        `INSERT INTO geocode_cache (normalized_query, result)
         VALUES ($1, $2)
         ON CONFLICT (normalized_query) DO UPDATE
         SET result = $2, created_at = now()`,
        [norm, JSON.stringify(data)],
      );
    } catch {
      // Non-fatal if caching fails
    }

    return [coords[1], coords[0]]; // [lat, lng]
  } catch {
    return CITY_COORDS[norm] ?? null;
  }
}

async function fetchOrsDistance(
  origin: string,
  destination: string,
  pool: Pool,
): Promise<{ result: DistanceResult | null; originCoords: [number, number] | null; destCoords: [number, number] | null }> {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey || apiKey === 'your-ors-api-key-here' || apiKey === 'test-key') {
    return { result: null, originCoords: null, destCoords: null };
  }

  try {
    const [originCoords, destCoords] = await Promise.all([
      geocodeCity(origin, pool, apiKey),
      geocodeCity(destination, pool, apiKey),
    ]);

    if (!originCoords || !destCoords) {
      return { result: null, originCoords, destCoords };
    }

    // Query ORS Directions (try HGV first, then driving-car if needed)
    const profiles = ['driving-hgv', 'driving-car'];
    for (const profile of profiles) {
      try {
        const routeUrl = `https://api.openrouteservice.org/v2/directions/${profile}`;
        const routeResp = await fetch(routeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: apiKey,
          },
          body: JSON.stringify({
            coordinates: [
              [originCoords[1], originCoords[0]], // [lng, lat]
              [destCoords[1], destCoords[0]],     // [lng, lat]
            ],
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (!routeResp.ok) continue;

        const routeData = await routeResp.json();
        const summary = (routeData as any)?.routes?.[0]?.summary;
        if (!summary) continue;

        return {
          result: {
            distanceKm: Math.round(summary.distance / 1000),
            durationHours: Math.round((summary.duration / 3600) * 10) / 10,
            source: 'ors',
          },
          originCoords,
          destCoords,
        };
      } catch {
        continue;
      }
    }

    return { result: null, originCoords, destCoords };
  } catch {
    return { result: null, originCoords: null, destCoords: null };
  }
}

export async function getDistance(
  origin: string,
  destination: string,
  pool: Pool,
): Promise<DistanceResult> {
  // Normalize keys for cache
  const originKey = origin.toLowerCase().trim().replace(/\s+/g, ' ');
  const destKey = destination.toLowerCase().trim().replace(/\s+/g, ' ');

  // 1. Check route cache
  const cached = await pool.query(
    'SELECT distance_km, duration_hours, source FROM route_cache WHERE origin_key = $1 AND destination_key = $2',
    [originKey, destKey],
  );
  if (cached.rows.length) {
    return {
      distanceKm: Number(cached.rows[0].distance_km),
      durationHours: Number(cached.rows[0].duration_hours),
      source: cached.rows[0].source,
    };
  }

  // 2. Try ORS with real routing
  const { result: orsResult, originCoords, destCoords } = await fetchOrsDistance(origin, destination, pool);
  let result = orsResult;

  // 3. Fall back to estimate using coordinates if ORS directions failed
  if (!result) {
    result = estimateRoadDistance(origin, destination, originCoords, destCoords);
  }

  // 4. Last resort: country-average estimate
  if (!result) {
    result = { distanceKm: 800, durationHours: 16, source: 'estimate' };
  }

  // 5. Cache the result in route_cache
  await pool.query(
    `INSERT INTO route_cache (origin_key, destination_key, distance_km, duration_hours, source)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (origin_key, destination_key) DO UPDATE
     SET distance_km = $3, duration_hours = $4, source = $5, created_at = now()`,
    [originKey, destKey, result.distanceKm, result.durationHours, result.source],
  );

  return result;
}
