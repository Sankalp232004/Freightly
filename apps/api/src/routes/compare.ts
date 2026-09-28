import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Pool } from 'pg';
import { runCompare } from '../services/costEngine.js';
import { getDistance } from '../services/distanceService.js';
import { getRateParameters } from '../db/rateParams.js';
import { checkPortProximity } from '../services/portsService.js';
import { optionalAuth, type AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const compareRouter = Router();

const compareRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many compare requests; please wait a moment' } },
});

const CompareInputSchema = z.object({
  origin: z.string().min(2).max(200),
  destination: z.string().min(2).max(200),
  weightKg: z.number().positive().max(100000),
  cargoClass: z.enum(['general', 'fragile', 'temperature-controlled', 'hazmat', 'high-value']),
  gstRegistered: z.boolean(),
  goodsValueInr: z.number().positive().optional(),
  dimensionsCm: z.object({ l: z.number().positive(), w: z.number().positive(), h: z.number().positive() }).optional(),
  urgency: z.enum(['normal', 'express']).optional(),
});

// POST /api/compare : anonymous or authenticated, rate-limited
compareRouter.post('/', compareRateLimit, optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = CompareInputSchema.parse(req.body);
    const pool = (req as any).pool as Pool;

    // Get road distance (real ORS or fallback estimate)
    const { distanceKm, durationHours, source } = await getDistance(input.origin, input.destination, pool);

    // Get active rate parameters from DB
    const { parameters, versionId } = await getRateParameters(pool);

    // Check coastal eligibility
    const [originNearPort, destNearPort] = await checkPortProximity(
      input.origin,
      input.destination,
      pool,
      parameters,
    );

    // Run the pure cost engine
    const result = runCompare(input, distanceKm, source, parameters, versionId, originNearPort, destNearPort);

    // Persist the comparison (user_id if authenticated)
    const userId = req.userId ?? null;
    const { rows } = await pool.query(
      `INSERT INTO comparisons (user_id, input, result, rate_version_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [userId, JSON.stringify(input), JSON.stringify(result), versionId],
    );
    const comparisonId = rows[0].id;

    res.json({ ...result, comparisonId });
  } catch (err) {
    next(err);
  }
});

// GET /api/compare/:id : public, retrieve a past comparison by ID
compareRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = (req as any).pool as Pool;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      return next(createError('NOT_FOUND', 'Comparison not found', 404));
    }

    const { rows } = await pool.query(
      'SELECT id, input, result, rate_version_id, created_at FROM comparisons WHERE id = $1',
      [id],
    );
    if (!rows[0]) {
      return next(createError('NOT_FOUND', 'Comparison not found', 404));
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
