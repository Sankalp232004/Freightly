import { defineConfig } from 'vitest/config';

try {
  process.loadEnvFile?.('.env');
} catch {
  // Ignore if .env is missing
}

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['verbose'],
    testTimeout: 30000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'postgres://freightly:freightly@localhost:5434/freightly',
      DATABASE_URL_TEST: process.env.DATABASE_URL_TEST || 'postgres://freightly:freightly@localhost:5434/freightly_test',
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret',
      ORS_API_KEY: process.env.ORS_API_KEY || 'test-key',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@test.com',
    },
  },
});
