import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Pool } from 'pg';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const savedRouter = Router();
savedRouter.use(requireAuth);

// GET /api/saved : get all saved comparisons for authenticated user
savedRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = (req as any).pool as Pool;
    const { rows } = await pool.query(
      `SELECT sc.id, sc.label, sc.created_at, c.id AS comparison_id, c.input, c.result
       FROM saved_comparisons sc
       JOIN comparisons c ON c.id = sc.comparison_id
       WHERE sc.user_id = $1
       ORDER BY sc.created_at DESC`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

const SaveSchema = z.object({
  comparisonId: z.string().uuid().optional(),
  label: z.string().max(200).optional(),
});

// Helper to save a comparison
async function saveComparison(
  userId: string,
  comparisonId: string,
  label: string | null,
  pool: Pool,
  next: NextFunction,
  res: Response,
) {
  // Verify the comparison exists
  const existing = await pool.query('SELECT id FROM comparisons WHERE id = $1', [comparisonId]);
  if (!existing.rows.length) {
    return next(createError('NOT_FOUND', 'Comparison not found', 404));
  }

  const { rows } = await pool.query(
    `INSERT INTO saved_comparisons (user_id, comparison_id, label)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, comparison_id) DO UPDATE SET label = $3
     RETURNING *`,
    [userId, comparisonId, label],
  );
  res.status(201).json(rows[0]);
}

// POST /api/saved/:comparisonId
savedRouter.post('/:comparisonId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = (req as any).pool as Pool;
    const comparisonId = String(Array.isArray(req.params.comparisonId) ? req.params.comparisonId[0] : req.params.comparisonId);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(comparisonId);
    if (!isUuid) {
      return next(createError('BAD_REQUEST', 'Invalid comparison ID format', 400));
    }

    const { label } = SaveSchema.parse(req.body || {});
    await saveComparison(req.userId!, comparisonId, label ?? null, pool, next, res);
  } catch (err) {
    next(err);
  }
});

// POST /api/saved (with body { comparisonId, label })
savedRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { comparisonId, label } = SaveSchema.parse(req.body);
    if (!comparisonId) {
      return next(createError('BAD_REQUEST', 'comparisonId is required', 400));
    }
    const pool = (req as any).pool as Pool;
    await saveComparison(req.userId!, comparisonId, label ?? null, pool, next, res);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/saved/:id (supports comparison_id UUID or saved_comparisons row id)
savedRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = (req as any).pool as Pool;
    const targetId = String(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    const query = isUuid
      ? 'DELETE FROM saved_comparisons WHERE comparison_id = $1 AND user_id = $2'
      : 'DELETE FROM saved_comparisons WHERE id = $1 AND user_id = $2';

    const { rowCount } = await pool.query(query, [targetId, req.userId]);
    if (!rowCount) return next(createError('NOT_FOUND', 'Saved comparison not found', 404));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
