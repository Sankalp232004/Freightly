import { Pool } from 'pg';

export interface PlaceFeature {
  properties: {
    label: string;
    name: string;
    region?: string;
    country?: string;
  };
  geometry: {
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface PlacesResult {
  features: PlaceFeature[];
}

export const normalizeQuery = (q: string): string =>
  q.toLowerCase().trim().replace(/\s+/g, ' ');

export async function searchPlaces(query: string, pool: Pool): Promise<PlacesResult> {
  const norm = normalizeQuery(query);
  if (norm.length < 2) {
    return { features: [] };
  }

  // 1. Check geocode_cache
  const cached = await pool.query(
    'SELECT result FROM geocode_cache WHERE normalized_query = $1',
    [norm],
  );

  if (cached.rows.length) {
    const raw = cached.rows[0].result;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }

  // 2. Call ORS autocomplete
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey || apiKey === 'your-ors-api-key-here' || apiKey === 'test-key') {
    return { features: [] };
  }

  try {
    const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${encodeURIComponent(
      apiKey,
    )}&text=${encodeURIComponent(query)}&boundary.country=IN&size=5`;

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { features: [] };
    }

    const data = (await response.json()) as PlacesResult;

    // Cache the result
    await pool.query(
      `INSERT INTO geocode_cache (normalized_query, result)
       VALUES ($1, $2)
       ON CONFLICT (normalized_query) DO UPDATE
       SET result = $2, created_at = now()`,
      [norm, JSON.stringify(data)],
    );

    return data;
  } catch (err) {
    // If ORS fails or times out, return empty features without crashing
    return { features: [] };
  }
}
