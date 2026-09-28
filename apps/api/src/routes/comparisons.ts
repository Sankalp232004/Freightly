import { Router, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

export const comparisonsRouter = Router();

// Public shareable comparison by ID
comparisonsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = (req as any).pool as Pool;
    const { rows } = await pool.query(
      'SELECT id, input, result, rate_version_id, created_at FROM comparisons WHERE id = $1',
      [req.params.id],
    );
    if (!rows[0]) return next(createError('NOT_FOUND', 'Comparison not found', 404));
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
