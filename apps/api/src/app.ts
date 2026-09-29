import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import logger from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { placesRouter } from './routes/places.js';
import { compareRouter } from './routes/compare.js';
import { comparisonsRouter } from './routes/comparisons.js';
import { authRouter } from './routes/auth.js';
import { savedRouter } from './routes/saved.js';
import { adminRouter } from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp(pool: Pool): Application {
  const app = express();

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  // CORS — in production on Render, the API and SPA are co-located on the
  // same origin so CORS is not strictly needed. We honour CORS_ORIGIN or
  // RENDER_EXTERNAL_URL when set, and fall back to true (reflect origin) so
  // the health endpoint is still reachable from Render's own health-checker.
  const corsOrigin =
    process.env.CORS_ORIGIN ??
    process.env.RENDER_EXTERNAL_URL ??
    (process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173');
  app.use(cors({
    origin: corsOrigin,
    credentials: true,
  }));

  // Request ID + structured logging
  app.use(pinoHttp({
    logger,
    genReqId: () => randomUUID(),
  }));

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // Inject pool into request context
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).pool = pool;
    next();
  });

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/places', placesRouter);
  app.use('/api/compare', compareRouter);
  app.use('/api/comparisons', comparisonsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/saved', savedRouter);
  app.use('/api/admin', adminRouter);

  // SPA fallback — serve built web app whenever built
  const webDist = join(__dirname, '../../web/dist');
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(join(webDist, 'index.html'));
      }
      next();
    });
  }

  // Centralized error handling (must be last)
  app.use(errorHandler);

  return app;
}
