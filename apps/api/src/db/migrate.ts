import { runner as migrate } from 'node-pg-migrate';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import logger from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env if running standalone
try { process.loadEnvFile?.('.env'); } catch {}
try { process.loadEnvFile?.('apps/api/.env'); } catch {}
try { process.loadEnvFile?.(join(__dirname, '../../../.env')); } catch {}
try { process.loadEnvFile?.(join(__dirname, '../../.env')); } catch {}

export async function runMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const migrationsDir = join(__dirname, '../../migrations');

  logger.info({ migrationsDir }, 'Running migrations with advisory lock');

  await migrate({
    databaseUrl,
    dir: migrationsDir,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    verbose: false,
    // Advisory lock prevents concurrent migration runs on multiple instances
    singleTransaction: true,
  });
}

// Allow running directly via `node dist/db/migrate.js`
if (process.argv[1] === __filename) {
  runMigrations()
    .then(() => {
      console.log('Database migrations completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
