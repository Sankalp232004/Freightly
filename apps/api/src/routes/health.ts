import { Router, Request, Response } from 'express';
import type { Pool } from 'pg';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  const pool = (req as any).pool as Pool;
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});
