import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Pool } from 'pg';
import { requireAdmin, type AuthRequest } from '../middleware/auth.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get('/rates', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pool = (req as any).pool as Pool;
    const { rows: versions } = await pool.query(
      'SELECT * FROM rate_versions ORDER BY created_at DESC',
    );
    const { rows: params } = await pool.query(
      `SELECT rp.* FROM rate_parameters rp
       JOIN rate_versions rv ON rv.id = rp.rate_version_id
       WHERE rv.is_active = true`,
    );
    res.json({ versions, activeParameters: params });
  } catch (err) {
    next(err);
  }
});

const RateParamSchema = z.object({
  key: z.string(),
  value: z.number(),
  unit: z.string(),
  description: z.string(),
  sourceNote: z.string().optional(),
});

const NewRateVersionSchema = z.object({
  note: z.string().max(500),
  parameters: z.array(RateParamSchema).min(1),
});

adminRouter.post('/rates', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { note, parameters } = NewRateVersionSchema.parse(req.body);
    const pool = (req as any).pool as Pool;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Deactivate current active version
      await client.query('UPDATE rate_versions SET is_active = false WHERE is_active = true');

      // Create new version
      const { rows } = await client.query(
        `INSERT INTO rate_versions (created_by, is_active, note) VALUES ($1, true, $2) RETURNING id`,
        [req.userEmail!, note],
      );
      const newVersionId = rows[0].id;

      // Insert all parameters
      for (const p of parameters) {
        await client.query(
          `INSERT INTO rate_parameters (rate_version_id, key, value, unit, description, source_note)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [newVersionId, p.key, p.value, p.unit, p.description, p.sourceNote ?? null],
        );
      }

      // Audit log
      await client.query(
        `INSERT INTO rate_audit_log (actor_email, action, rate_version_id, details) VALUES ($1, $2, $3, $4)`,
        [req.userEmail!, 'activate_rate_version', newVersionId, JSON.stringify({ note, parameterCount: parameters.length })],
      );

      await client.query('COMMIT');
      res.status(201).json({ versionId: newVersionId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});
