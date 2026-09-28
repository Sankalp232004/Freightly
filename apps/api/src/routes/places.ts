import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Pool } from 'pg';
import { searchPlaces } from '../services/placesService.js';

export const placesRouter = Router();

const placesLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

placesRouter.get('/', placesLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.string().min(2).max(100).parse(req.query.q);
    const pool = (req as any).pool as Pool;

    const data = await searchPlaces(q, pool);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

placesRouter.post('/', placesLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = z.string().min(2).max(100).parse(req.body.q ?? req.body.query);
    const pool = (req as any).pool as Pool;

    const data = await searchPlaces(q, pool);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
