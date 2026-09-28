import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rate benchmarks...');

  const benchmarks = [
    // Road FTL Constants
    { mode: 'ROAD_FTL', key: 'road_ftl_base_rate_per_tonne_km', value: 3.75, description: 'Base rate (₹) per tonne-km for FTL' },
    { mode: 'ROAD_FTL', key: 'road_fuel_surcharge_percent', value: 0.50, description: 'Fuel surcharge as a percentage of base road cost (50%)' },
    { mode: 'ROAD_FTL', key: 'road_toll_rate_per_km', value: 2.5, description: 'Estimated toll cost (₹) per km' },
    
    // Road LTL Constants
    { mode: 'ROAD_LTL', key: 'road_ltl_consolidation_multiplier', value: 1.6, description: 'Multiplier applied to FTL rate for LTL shipments' },

    // Rail Constants
    { mode: 'RAIL_BULK', key: 'rail_bulk_rate_per_tonne_km', value: 2.0, description: 'Base rate (₹) per tonne-km for Rail Bulk' },
    { mode: 'RAIL_PARCEL', key: 'rail_parcel_rate_per_tonne_km', value: 12.0, description: 'Base rate (₹) per tonne-km for Rail Parcel' },
    { mode: 'RAIL_ALL', key: 'rail_first_last_mile_fixed_cost', value: 5000, description: 'Fixed road leg cost (₹) for rail first/last mile' },

    // Air Constants
    { mode: 'AIR', key: 'air_base_rate_per_tonne_km', value: 72.5, description: 'Base rate (₹) per tonne-km for Air' },
    { mode: 'AIR', key: 'air_fixed_minimum_cost', value: 15000, description: 'Minimum fixed cost (₹) for air shipments regardless of distance/weight' },
    
    // Taxes
    { mode: 'GLOBAL', key: 'gst_rate_rcm', value: 0.05, description: 'GST rate (5%) applied if RCM registered' },
  ];

  for (const b of benchmarks) {
    await prisma.rateBenchmark.upsert({
      where: { key: b.key },
      update: b,
      create: b,
    });
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
