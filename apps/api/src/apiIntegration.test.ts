import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import type { Server } from 'http';
import { createApp } from './app.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://freightly:freightly@localhost:5434/freightly';

describe('Phase 4: API Endpoints and Auth Integration Tests', () => {
  let pool: Pool;
  let server: Server;
  let baseUrl: string;

  // Test state
  let testComparisonId: string;
  let shipperToken: string;
  let shipperCookie: string;
  let adminToken: string;
  let adminCookie: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });

    // Clean any leftover test users or test comparisons
    await pool.query("DELETE FROM users WHERE email IN ('shipper@test.com', 'admin@example.com', 'attacker@test.com')");

    const app = createApp(pool);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Teardown: clean up test data and reset rate versions
    try {
      await pool.query("DELETE FROM users WHERE email IN ('shipper@test.com', 'admin@example.com', 'attacker@test.com')");
      await pool.query('DELETE FROM saved_comparisons');
      await pool.query('DELETE FROM comparisons');
      await pool.query('DELETE FROM rate_audit_log WHERE actor_email = $1', ['admin@example.com']);
      await pool.query('DELETE FROM rate_parameters WHERE rate_version_id > 1');
      await pool.query('DELETE FROM rate_versions WHERE id > 1');
      await pool.query('UPDATE rate_versions SET is_active = true WHERE id = 1');
    } catch {}

    server.close();
    await pool.end();
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /api/health returns 200 with DB status', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.db).toBe('connected');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('2. Places Autocomplete Endpoint', () => {
    it('GET /api/places?q=Delhi returns suggestions from cache/ORS', async () => {
      const res = await fetch(`${baseUrl}/api/places?q=Delhi`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.features)).toBe(true);
      expect(data.features.length).toBeGreaterThan(0);
    });

    it('POST /api/places with body { q: "Mumbai" } works identically', async () => {
      const res = await fetch(`${baseUrl}/api/places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: 'Mumbai' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.features)).toBe(true);
      expect(data.features.length).toBeGreaterThan(0);
    });

    it('GET /api/places with invalid short query returns 400 validation error', async () => {
      const res = await fetch(`${baseUrl}/api/places?q=a`);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Comparison Endpoints (Anonymous & Shareable)', () => {
    it('POST /api/compare calculates ranked options and persists comparison', async () => {
      const payload = {
        origin: 'Pune',
        destination: 'Ahmedabad',
        weightKg: 5000,
        cargoClass: 'general',
        gstRegistered: true,
        goodsValueInr: 150000,
      };

      const res = await fetch(`${baseUrl}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.comparisonId).toBeDefined();
      testComparisonId = data.comparisonId;

      expect(data.distanceKm).toBeGreaterThanOrEqual(600);
      expect(data.distanceSource).toBe('ors');
      expect(Array.isArray(data.rankedOptions)).toBe(true);
      expect(data.rankedOptions.length).toBeGreaterThanOrEqual(2);

      // Verify line items and totals
      for (const opt of data.rankedOptions) {
        const sum = opt.lineItems.reduce((acc: number, li: any) => acc + li.amountPaise, 0);
        expect(opt.totalPaise).toBe(sum);
        expect(opt.transit.minDays).toBeLessThan(opt.transit.maxDays);
      }

      // E-way bill notice required because ₹1,50,000 > ₹50,000 threshold
      expect(data.ewayBillNotice).toBeDefined();
      expect(data.ewayBillNotice).toContain('E-way bill required');
    });

    it('GET /api/compare/:id retrieves the saved comparison by UUID', async () => {
      const res = await fetch(`${baseUrl}/api/compare/${testComparisonId}`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe(testComparisonId);
      expect(data.input.origin).toBe('Pune');
      expect(data.input.destination).toBe('Ahmedabad');
      expect(data.result.distanceKm).toBeGreaterThanOrEqual(600);
    });

    it('GET /api/compare/:id returns 404 for non-existent UUID', async () => {
      const res = await fetch(`${baseUrl}/api/compare/00000000-0000-0000-0000-000000000000`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('4. Authentication Flow (Register, Login, Me, Logout)', () => {
    it('POST /api/auth/register creates user account and returns token + cookie', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'shipper@test.com',
          password: 'SecurePassword123!',
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.user.email).toBe('shipper@test.com');
      expect(data.user.role).toBe('user');
      expect(data.token).toBeDefined();

      shipperToken = data.token;
      const rawCookie = res.headers.get('set-cookie');
      expect(rawCookie).toBeDefined();
      expect(rawCookie).toContain('token=');
      expect(rawCookie).toContain('HttpOnly');
      shipperCookie = rawCookie!.split(';')[0];
    });

    it('POST /api/auth/register rejects duplicate email with 409', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'shipper@test.com',
          password: 'AnotherPassword123!',
        }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error.code).toBe('EMAIL_IN_USE');
    });

    it('POST /api/auth/login succeeds with valid credentials', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'shipper@test.com',
          password: 'SecurePassword123!',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.email).toBe('shipper@test.com');
      expect(data.token).toBeDefined();
    });

    it('POST /api/auth/login rejects invalid password with 401', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'shipper@test.com',
          password: 'WrongPassword!',
        }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('GET /api/auth/me verifies current user session via cookie', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: shipperCookie },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.email).toBe('shipper@test.com');
      expect(data.user.role).toBe('user');
    });

    it('GET /api/auth/me verifies current user session via Bearer header', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${shipperToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.user.email).toBe('shipper@test.com');
    });

    it('GET /api/auth/me returns 401 when no auth is provided', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      expect(res.status).toBe(401);
    });

    it('POST /api/auth/logout clears token cookie', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const rawCookie = res.headers.get('set-cookie');
      expect(rawCookie).toBeDefined();
      expect(rawCookie).toContain('token=;');
    });
  });

  describe('5. Saved Comparisons (Authenticated Bookmarks)', () => {
    it('POST /api/saved/:comparisonId saves comparison with label', async () => {
      const res = await fetch(`${baseUrl}/api/saved/${testComparisonId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${shipperToken}`,
        },
        body: JSON.stringify({ label: 'Pune to Ahmedabad 5T Monthly' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.comparison_id).toBe(testComparisonId);
      expect(data.label).toBe('Pune to Ahmedabad 5T Monthly');
    });

    it('GET /api/saved returns user list of saved lanes', async () => {
      const res = await fetch(`${baseUrl}/api/saved`, {
        headers: { Authorization: `Bearer ${shipperToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].comparison_id).toBe(testComparisonId);
      expect(data[0].input.origin).toBe('Pune');
      expect(data[0].label).toBe('Pune to Ahmedabad 5T Monthly');
    });

    it('GET /api/saved returns 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/saved`);
      expect(res.status).toBe(401);
    });

    it('DELETE /api/saved/:id deletes saved lane by comparison ID', async () => {
      const res = await fetch(`${baseUrl}/api/saved/${testComparisonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${shipperToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);

      // Verify list is now empty
      const listRes = await fetch(`${baseUrl}/api/saved`, {
        headers: { Authorization: `Bearer ${shipperToken}` },
      });
      const listData = await listRes.json();
      expect(listData.length).toBe(0);
    });
  });

  describe('6. Admin Rate Configuration & Audit Log', () => {
    beforeAll(async () => {
      // Register the configured admin user (ADMIN_EMAIL = admin@example.com)
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'AdminPassword123!',
        }),
      });
      const data = await res.json();
      adminToken = data.token;
      adminCookie = res.headers.get('set-cookie')!.split(';')[0];
    });

    it('admin user has role: "admin"', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      expect(data.user.role).toBe('admin');
    });

    it('GET /api/admin/rates returns 403 for non-admin user', async () => {
      const res = await fetch(`${baseUrl}/api/admin/rates`, {
        headers: { Authorization: `Bearer ${shipperToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('GET /api/admin/rates returns rate versions and active parameters for admin', async () => {
      const res = await fetch(`${baseUrl}/api/admin/rates`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.versions)).toBe(true);
      expect(data.versions.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(data.activeParameters)).toBe(true);
      expect(data.activeParameters.length).toBe(46);
    });

    it('POST /api/admin/rates creates and activates a new rate set in one transaction with audit log', async () => {
      const payload = {
        note: 'Q4 2026 Diesel Price Adjustment (+5% fuel surcharge)',
        parameters: [
          {
            key: 'road.fuel_surcharge_pct',
            value: 0.23, // Increased from 0.18
            unit: 'fraction',
            description: 'Fuel surcharge as fraction of base freight',
            sourceNote: 'IOCL bulk diesel revision Sept 2026',
          },
          {
            key: 'road.toll_rate_per_km',
            value: 2.75, // Increased from 2.50
            unit: 'INR/km',
            description: 'Average NHAI toll rate per km',
          },
        ],
      };

      const res = await fetch(`${baseUrl}/api/admin/rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.versionId).toBeDefined();
      const newVersionId = data.versionId;

      // Verify DB state: exactly 1 active version exists
      const activeCheck = await pool.query('SELECT id, is_active, note FROM rate_versions WHERE is_active = true');
      expect(activeCheck.rows.length).toBe(1);
      expect(activeCheck.rows[0].id).toBe(newVersionId);
      expect(activeCheck.rows[0].note).toBe('Q4 2026 Diesel Price Adjustment (+5% fuel surcharge)');

      // Verify audit log row
      const auditCheck = await pool.query('SELECT * FROM rate_audit_log WHERE rate_version_id = $1', [newVersionId]);
      expect(auditCheck.rows.length).toBe(1);
      expect(auditCheck.rows[0].actor_email).toBe('admin@example.com');
      expect(auditCheck.rows[0].action).toBe('activate_rate_version');

      // Verify parameters inserted
      const paramCheck = await pool.query(
        'SELECT key, value FROM rate_parameters WHERE rate_version_id = $1',
        [newVersionId],
      );
      expect(paramCheck.rows.length).toBe(2);
      const fuelParam = paramCheck.rows.find((p) => p.key === 'road.fuel_surcharge_pct');
      expect(Number(fuelParam.value)).toBe(0.23);
    });
  });
});
