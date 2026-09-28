/* eslint-disable camelcase */
/**
 * Migration 002: seed default rate configuration
 *
 * This is CONFIGURATION data, not user data.
 * After a fresh migration, only these configuration rows will exist.
 * All rate constants are sourced from publicly available benchmarks:
 *   - Indian Roads: MoRTH Annual Report 2023-24
 *   - Indian Railways: IR Freight Tariff Schedules 2024
 *   - Air Cargo: IATA India Air Cargo Benchmarks 2023
 *   - GST: CGST Act rates for GTA services
 *   - CO2: IPCC AR6 transport emission factors
 */
exports.up = async (pgm) => {
  // Insert default rate version and activate it in one transaction
  await pgm.sql(`
    INSERT INTO rate_versions (created_by, is_active, note)
    VALUES ('system', true, 'Default rate configuration v1 — sourced from MoRTH, IR Tariff 2024, IATA India 2023');
  `);

  const versionResult = await pgm.sql(`SELECT id FROM rate_versions WHERE is_active = true LIMIT 1`);
  // node-pg-migrate does not give us query results inline; use a DO block instead
  await pgm.sql(`
    DO $$
    DECLARE v_id INTEGER;
    BEGIN
      SELECT id INTO v_id FROM rate_versions WHERE is_active = true;

      INSERT INTO rate_parameters (rate_version_id, key, value, unit, description, source_note) VALUES
        -- ═══ ROAD FTL ═══
        (v_id, 'road.mini_truck.capacity_kg',       1500,   'kg',        'Mini truck max payload', 'MoRTH 2024'),
        (v_id, 'road.mini_truck.rate_per_tonne_km', 6.50,   'INR/t·km',  'Mini truck base freight rate', 'Industry avg 2024'),
        (v_id, 'road.medium_truck.capacity_kg',     6000,   'kg',        'Medium truck (9T GVW) max payload', 'MoRTH 2024'),
        (v_id, 'road.medium_truck.rate_per_tonne_km',4.80,  'INR/t·km',  'Medium truck base freight rate', 'Industry avg 2024'),
        (v_id, 'road.large_truck.capacity_kg',      14000,  'kg',        'Large truck (25T GVW) max payload', 'MoRTH 2024'),
        (v_id, 'road.large_truck.rate_per_tonne_km',3.75,   'INR/t·km',  'Large truck base freight rate', 'Industry avg 2024'),
        (v_id, 'road.multi_axle.capacity_kg',       22000,  'kg',        'Multi-axle truck max payload', 'MoRTH 2024'),
        (v_id, 'road.multi_axle.rate_per_tonne_km', 3.20,   'INR/t·km',  'Multi-axle truck base freight rate', 'Industry avg 2024'),
        -- ═══ ROAD LTL ═══
        (v_id, 'road_ltl.rate_per_kg',              8.50,   'INR/kg',    'LTL base rate per kg', 'Industry avg 2024'),
        (v_id, 'road_ltl.minimum_charge',           2500,   'INR',       'LTL minimum shipment charge', 'Industry avg 2024'),
        (v_id, 'road_ltl.consolidation_multiplier', 1.60,   'multiplier','LTL consolidation overhead vs FTL', 'Industry avg 2024'),
        -- ═══ ROAD COMMON ═══
        (v_id, 'road.fuel_surcharge_pct',           0.18,   'fraction',  'Fuel surcharge as fraction of base freight', 'AITWA Q4 2024'),
        (v_id, 'road.toll_rate_per_km',             2.50,   'INR/km',    'Average national highway toll per km (one-way)', 'NHAI 2024'),
        (v_id, 'road.handling_per_tonne',           350,    'INR/t',     'Loading/unloading handling charge per tonne', 'Industry avg 2024'),
        (v_id, 'road.speed_km_per_day',             500,    'km/day',    'Average road transit speed', 'MoRTH 2024'),
        (v_id, 'road.transit_buffer_days',          1,      'days',      'Buffer days for transit variability', 'Industry avg'),
        -- ═══ RAIL ═══
        (v_id, 'rail.rate_per_tonne_km',            2.10,   'INR/t·km',  'Indian Railway freight rate for general merchandise', 'IR Tariff Schedule 2024'),
        (v_id, 'rail.terminal_handling_per_tonne',  800,    'INR/t',     'Rail terminal handling (loading + unloading)', 'IR 2024'),
        (v_id, 'rail.first_mile_rate_per_km',       5.50,   'INR/t·km',  'First-mile road leg rate (origin to rail yard)', 'Industry avg 2024'),
        (v_id, 'rail.last_mile_rate_per_km',        5.50,   'INR/t·km',  'Last-mile road leg rate (rail yard to destination)', 'Industry avg 2024'),
        (v_id, 'rail.first_mile_distance_km',       40,     'km',        'Assumed first-mile road distance to nearest rail yard', 'Avg Indian city'),
        (v_id, 'rail.last_mile_distance_km',        40,     'km',        'Assumed last-mile road distance from rail yard', 'Avg Indian city'),
        (v_id, 'rail.minimum_weight_kg',            500,    'kg',        'Minimum weight to book rail freight', 'IR 2024'),
        (v_id, 'rail.speed_km_per_day',             400,    'km/day',    'Average rail freight speed', 'IR 2024'),
        (v_id, 'rail.transit_buffer_days',          2,      'days',      'Buffer for rail scheduling and shunting', 'Industry avg'),
        -- ═══ AIR ═══
        (v_id, 'air.rate_per_kg',                   95,     'INR/kg',    'Air freight rate per chargeable kg', 'IATA India 2023'),
        (v_id, 'air.minimum_charge',                8500,   'INR',       'Air freight minimum charge per shipment', 'IATA India 2023'),
        (v_id, 'air.volumetric_divisor',            6000,   'cm³/kg',    'Volumetric weight divisor (IATA standard)', 'IATA'),
        (v_id, 'air.handling_flat',                 1500,   'INR',       'Air handling and documentation fee', 'Industry avg'),
        (v_id, 'air.max_practical_weight_kg',       5000,   'kg',        'Above this, air is typically not offered', 'Industry practice'),
        (v_id, 'air.transit_days_min',              1,      'days',      'Air minimum transit time', 'Avg metro-metro India'),
        (v_id, 'air.transit_days_max',              2,      'days',      'Air maximum transit time', 'Avg India'),
        -- ═══ COASTAL ═══
        (v_id, 'coastal.rate_per_tonne_km',         0.85,   'INR/t·km',  'Coastal/short-sea shipping rate', 'MoPSW 2024'),
        (v_id, 'coastal.port_proximity_km',         80,     'km',        'Max distance from port to qualify for coastal mode', 'MoPSW policy'),
        (v_id, 'coastal.handling_per_tonne',        1200,   'INR/t',     'Port handling charges per tonne', 'MoPSW 2024'),
        (v_id, 'coastal.transit_speed_kmh',         18,     'km/h',      'Average coastal vessel speed', 'MoPSW 2024'),
        (v_id, 'coastal.port_dwell_days',           1,      'days',      'Time at port for loading/unloading', 'Industry avg'),
        -- ═══ GST ═══
        (v_id, 'gst.gta_rcm_rate',                 0.05,   'fraction',  'GTA GST rate under Reverse Charge Mechanism (registered business)', 'CGST Act s.9(3)'),
        (v_id, 'gst.gta_fcm_rate',                 0.12,   'fraction',  'GTA GST rate under Forward Charge (unregistered recipient)', 'CGST Act'),
        (v_id, 'gst.air_freight_rate',              0.18,   'fraction',  'Air freight GST rate', 'CGST Schedule II'),
        -- ═══ E-WAY BILL ═══
        (v_id, 'compliance.eway_bill_threshold_inr',50000,  'INR',       'Goods value above which e-way bill is required', 'CGST Rule 138'),
        -- ═══ CO2 FACTORS (kg CO2 per tonne-km) ═══
        (v_id, 'co2.road_ftl_kg_per_tonne_km',     0.0621, 'kg CO2/t·km','Road FTL CO2 emission factor', 'IPCC AR6 / GLEC 2023'),
        (v_id, 'co2.road_ltl_kg_per_tonne_km',     0.0831, 'kg CO2/t·km','Road LTL CO2 (higher per tonne due to partial loads)', 'IPCC AR6 / GLEC 2023'),
        (v_id, 'co2.rail_kg_per_tonne_km',         0.0035, 'kg CO2/t·km','Rail freight CO2 emission factor (Indian grid mix)', 'IPCC AR6'),
        (v_id, 'co2.air_kg_per_tonne_km',          0.6020, 'kg CO2/t·km','Air freight CO2 emission factor', 'IPCC AR6'),
        (v_id, 'co2.coastal_kg_per_tonne_km',      0.0114, 'kg CO2/t·km','Coastal shipping CO2 emission factor', 'IPCC AR6');

      -- Coastal ports (configuration, not user data)
      INSERT INTO coastal_ports (name, lat, lng) VALUES
        ('Mumbai (JNPT)',          18.9500,  72.9500),
        ('Chennai',                13.0827,  80.2707),
        ('Kolkata (Haldia)',        22.0269,  88.0599),
        ('Visakhapatnam',          17.6868,  83.2185),
        ('Kochi',                  9.9312,   76.2673),
        ('Kandla',                 23.0045,  70.2167),
        ('Mundra',                 22.7393,  69.7067),
        ('Mangaluru',              12.9153,  74.8560),
        ('Tuticorin (Thoothukudi)',  8.7642,  78.1348),
        ('Paradip',                20.3167,  86.6167),
        ('New Mangalore',          12.9245,  74.8138),
        ('Mormugao (Goa)',         15.4086,  73.7960);
    END;
    $$;
  `);
};

exports.down = async (pgm) => {
  await pgm.sql(`DELETE FROM coastal_ports`);
  await pgm.sql(`
    DELETE FROM rate_parameters
    WHERE rate_version_id IN (SELECT id FROM rate_versions WHERE created_by = 'system');
  `);
  await pgm.sql(`DELETE FROM rate_versions WHERE created_by = 'system'`);
};
