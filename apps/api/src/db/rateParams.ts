import { Pool } from 'pg';
import type { RateParameters } from '../services/costEngine.js';

export async function getRateParameters(pool: Pool): Promise<{ parameters: RateParameters; versionId: number }> {
  const { rows } = await pool.query(
    `SELECT rp.key, rp.value, rv.id AS version_id
     FROM rate_parameters rp
     JOIN rate_versions rv ON rv.id = rp.rate_version_id
     WHERE rv.is_active = true`,
  );

  if (!rows.length) throw new Error('No active rate version found in database');

  const parameters: RateParameters = {};
  for (const row of rows) {
    parameters[row.key] = Number(row.value);
  }

  return { parameters, versionId: rows[0].version_id };
}
