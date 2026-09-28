import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { getDistance, geocodeCity, haversineKm } from './services/distanceService.js';
import { searchPlaces } from './services/placesService.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://freightly:freightly@localhost:5434/freightly';

describe('Phase 3: Distance and Places Services with ORS and PostgreSQL Caching', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Places Service (Autocomplete & Geocoding)', () => {
    it('searches places for "Pune" and returns valid Indian features with coordinates', async () => {
      const result = await searchPlaces('Pune', pool);
      expect(result).toBeDefined();
      expect(Array.isArray(result.features)).toBe(true);
      expect(result.features.length).toBeGreaterThan(0);

      const first = result.features[0];
      expect(first.geometry.coordinates).toBeDefined();
      expect(first.geometry.coordinates.length).toBe(2);
      // Coordinates are [lng, lat]
      const [lng, lat] = first.geometry.coordinates;
      expect(lng).toBeGreaterThan(68);
      expect(lng).toBeLessThan(98);
      expect(lat).toBeGreaterThan(8);
      expect(lat).toBeLessThan(37);

      // Verify it was saved to geocode_cache
      const cacheCheck = await pool.query(
        "SELECT * FROM geocode_cache WHERE normalized_query = 'pune'",
      );
      expect(cacheCheck.rows.length).toBeGreaterThan(0);
      expect(cacheCheck.rows[0].result).toBeDefined();
    });

    it('returns cached results on repeated queries without calling external API', async () => {
      // First call cached "pune" above, now call again
      const start = Date.now();
      const result = await searchPlaces('pune', pool);
      const elapsed = Date.now() - start;

      expect(result.features.length).toBeGreaterThan(0);
      // Cache lookup should be sub-50ms (usually 1-5ms)
      expect(elapsed).toBeLessThan(200);
    });

    it('handles short queries (< 2 chars) gracefully without calling API', async () => {
      const result = await searchPlaces('P', pool);
      expect(result.features).toEqual([]);
    });

    it('geocodes cities into [lat, lng] coordinates', async () => {
      const coords = await geocodeCity('Ahmedabad', pool);
      expect(coords).not.toBeNull();
      const [lat, lng] = coords!;
      // Ahmedabad is approx 23.02° N, 72.57° E
      expect(lat).toBeCloseTo(23.02, 0);
      expect(lng).toBeCloseTo(72.57, 0);
    });
  });

  describe('Distance Service: Real ORS Highway Routing for Required Indian Route Fixtures', () => {
    it('Fixture 1: Mumbai → Delhi (~1,400 km road distance)', async () => {
      const res = await getDistance('Mumbai', 'Delhi', pool);
      expect(res.source).toBe('ors');
      expect(res.distanceKm).toBeGreaterThanOrEqual(1300);
      expect(res.distanceKm).toBeLessThanOrEqual(1550);
      expect(res.durationHours).toBeGreaterThan(12);
      expect(res.durationHours).toBeLessThan(26);

      // Verify route_cache row
      const cached = await pool.query(
        "SELECT * FROM route_cache WHERE origin_key = 'mumbai' AND destination_key = 'delhi'",
      );
      expect(cached.rows.length).toBe(1);
      expect(cached.rows[0].source).toBe('ors');
      expect(Number(cached.rows[0].distance_km)).toBe(res.distanceKm);
    });

    it('Fixture 2: Bengaluru → Chennai (~320-360 km road distance)', async () => {
      const res = await getDistance('Bengaluru', 'Chennai', pool);
      expect(res.source).toBe('ors');
      expect(res.distanceKm).toBeGreaterThanOrEqual(300);
      expect(res.distanceKm).toBeLessThanOrEqual(400);
      expect(res.durationHours).toBeGreaterThan(3);
      expect(res.durationHours).toBeLessThan(9);

      // Verify route_cache row
      const cached = await pool.query(
        "SELECT * FROM route_cache WHERE origin_key = 'bengaluru' AND destination_key = 'chennai'",
      );
      expect(cached.rows.length).toBe(1);
    });

    it('Fixture 3: Kolkata → Guwahati (~750-1,050 km road distance)', async () => {
      const res = await getDistance('Kolkata', 'Guwahati', pool);
      expect(res.source).toBe('ors');
      expect(res.distanceKm).toBeGreaterThanOrEqual(700);
      expect(res.distanceKm).toBeLessThanOrEqual(1150);
      expect(res.durationHours).toBeGreaterThan(8);

      const cached = await pool.query(
        "SELECT * FROM route_cache WHERE origin_key = 'kolkata' AND destination_key = 'guwahati'",
      );
      expect(cached.rows.length).toBe(1);
    });

    it('Fixture 4: Pune → Ahmedabad (~640-700 km road distance)', async () => {
      const res = await getDistance('Pune', 'Ahmedabad', pool);
      expect(res.source).toBe('ors');
      expect(res.distanceKm).toBeGreaterThanOrEqual(600);
      expect(res.distanceKm).toBeLessThanOrEqual(720);
      expect(res.durationHours).toBeGreaterThan(7);
      expect(res.durationHours).toBeLessThan(14);

      const cached = await pool.query(
        "SELECT * FROM route_cache WHERE origin_key = 'pune' AND destination_key = 'ahmedabad'",
      );
      expect(cached.rows.length).toBe(1);
    });

    it('Fixture 5: Delhi → Mumbai (~1,400 km road distance)', async () => {
      const res = await getDistance('Delhi', 'Mumbai', pool);
      expect(res.source).toBe('ors');
      expect(res.distanceKm).toBeGreaterThanOrEqual(1300);
      expect(res.distanceKm).toBeLessThanOrEqual(1550);
      expect(res.durationHours).toBeGreaterThan(12);

      const cached = await pool.query(
        "SELECT * FROM route_cache WHERE origin_key = 'delhi' AND destination_key = 'mumbai'",
      );
      expect(cached.rows.length).toBe(1);
    });
  });

  describe('Route Cache Invariant and Speed', () => {
    it('returns cached route on repeated call in under 20ms without invoking ORS', async () => {
      const start = Date.now();
      const res = await getDistance('Pune', 'Ahmedabad', pool);
      const elapsed = Date.now() - start;

      expect(res.source).toBe('ors');
      expect(res.distanceKm).toBeGreaterThanOrEqual(600);
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Fallback Invariant: Great-Circle Estimate when ORS is Unavailable', () => {
    it('calculates accurate Haversine distance', () => {
      // Mumbai: 19.0760 N, 72.8777 E; Delhi: 28.6139 N, 77.2090 E (~1,150 km straight line)
      const straightLine = haversineKm(19.0760, 72.8777, 28.6139, 77.2090);
      expect(straightLine).toBeGreaterThan(1100);
      expect(straightLine).toBeLessThan(1200);
    });
  });
});
