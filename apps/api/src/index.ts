import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from multiple possible working directories
try { process.loadEnvFile?.('.env'); } catch {}
try { process.loadEnvFile?.('apps/api/.env'); } catch {}
try { process.loadEnvFile?.(join(__dirname, '../../.env')); } catch {}

import { createApp } from './app.js';
import { getPool } from './db/pool.js';
import { runMigrations } from './db/migrate.js';
import logger from './lib/logger.js';
import { startCacheCleanup } from './jobs/cacheCleanup.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function main() {
  const pool = getPool();

  // Run migrations with advisory lock so concurrent instances don't race
  await runMigrations();
  logger.info('Database migrations complete');

  const app = createApp(pool);

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, 'Server started');
  });

  // Cache cleanup job
  const cleanup = startCacheCleanup(pool);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(async () => {
      cleanup();
      await pool.end();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
