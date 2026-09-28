import { Pool } from 'pg';
import type { RateParameters } from './costEngine.js';

/**
 * Haversine formula — great-circle distance between two lat/lng points in km.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Port {
  name: string;
  lat: number;
  lng: number;
}

/**
 * Returns [originNearPort, destinationNearPort].
 * Uses a very rough city-centre coordinate lookup; in production
 * the geocode_cache will provide real coords from ORS.
 */
export async function checkPortProximity(
  origin: string,
  destination: string,
  pool: Pool,
  rates: RateParameters,
): Promise<[boolean, boolean]> {
  const threshold = Number(rates['coastal.port_proximity_km'] ?? 80);

  const { rows: ports } = await pool.query<Port>(
    'SELECT name, lat::float, lng::float FROM coastal_ports',
  );

  const isNearPort = (city: string): boolean => {
    // Try to match from geocode_cache for real coordinates
    // For now, check if the city name matches or contains a port city name
    const cityLower = city.toLowerCase();
    return ports.some((port) => {
      const portCity = port.name.toLowerCase().split('(')[0].trim();
      return cityLower.includes(portCity) || portCity.includes(cityLower.split(',')[0].trim());
    });
  };

  return [isNearPort(origin), isNearPort(destination)];
}
