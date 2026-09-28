import { Pool } from 'pg';
import logger from '../lib/logger.js';

/**
 * Cleanup job: removes geocode and route cache rows older than 30 days.
 * Returns a cleanup function to stop the interval.
 */
export function startCacheCleanup(pool: Pool): () => void {
  const run = async () => {
    try {
      const { rowCount: geocodeDeleted } = await pool.query(
        "DELETE FROM geocode_cache WHERE created_at < now() - interval '30 days'",
      );
      const { rowCount: routeDeleted } = await pool.query(
        "DELETE FROM route_cache WHERE created_at < now() - interval '30 days'",
      );
      if ((geocodeDeleted ?? 0) > 0 || (routeDeleted ?? 0) > 0) {
        logger.info({ geocodeDeleted, routeDeleted }, 'Cache cleanup complete');
      }
    } catch (err) {
      logger.error({ err }, 'Cache cleanup failed');
    }
  };

  // Run once at startup, then every 6 hours
  run();
  const interval = setInterval(run, 6 * 60 * 60 * 1000);
  return () => clearInterval(interval);
}
