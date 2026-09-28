import { describe, it, expect, beforeAll } from 'vitest';
import { calculateCosts, ShipmentDetails } from '../costEngine';

describe('Cost Engine Verification', () => {
  // Using the exact mock values seeded in the DB
  const mockRates = {
    'road_ftl_base_rate_per_tonne_km': 3.75,
    'road_fuel_surcharge_percent': 0.50,
    'road_toll_rate_per_km': 2.5,
    'road_ltl_consolidation_multiplier': 1.6,
    'rail_bulk_rate_per_tonne_km': 2.0,
    'rail_parcel_rate_per_tonne_km': 12.0,
    'rail_first_last_mile_fixed_cost': 5000,
    'air_base_rate_per_tonne_km': 72.5,
    'air_fixed_minimum_cost': 15000,
    'gst_rate_rcm': 0.05
  };

  it('Scenario 1: Mumbai → Delhi (1400km), 500kg general, GST registered', () => {
    const shipment: ShipmentDetails = {
      origin: 'Mumbai',
      destination: 'Delhi',
      distanceKm: 1400,
      weightKg: 500, // 0.5 tonnes
      category: 'general',
      isRegisteredBusiness: true
    };

    const results = calculateCosts(shipment, mockRates);
    
    console.log('\n--- Scenario 1: Mumbai → Delhi (1400km, 500kg) ---');
    console.table(results.map(r => ({
      Mode: r.mode,
      Base: r.costBreakdown.baseFreight,
      Fuel: r.costBreakdown.fuelSurcharge,
      GST: r.costBreakdown.gst,
      TotalCost: r.costBreakdown.totalCost,
      Days: `${r.transitTimeDays[0]}-${r.transitTimeDays[1]}`
    })));

    expect(results.length).toBeGreaterThan(0);
    // At 500kg, LTL should be viable but FTL might be overkill.
    // LTL Base = 3.75 * 1.6 * 1400 * 0.5 = 4200
    const ltl = results.find(r => r.mode === 'LTL');
    expect(ltl?.costBreakdown.baseFreight).toBeCloseTo(4200);
  });

  it('Scenario 2: Bangalore → Chennai (350km), 2000kg FMCG, GST registered', () => {
    const shipment: ShipmentDetails = {
      origin: 'Bangalore',
      destination: 'Chennai',
      distanceKm: 350,
      weightKg: 2000, // 2 tonnes
      category: 'general', // FMCG
      isRegisteredBusiness: true
    };

    const results = calculateCosts(shipment, mockRates);
    
    console.log('\n--- Scenario 2: Bangalore → Chennai (350km, 2000kg) ---');
    console.table(results.map(r => ({
      Mode: r.mode,
      Base: r.costBreakdown.baseFreight,
      TotalCost: r.costBreakdown.totalCost,
      Days: `${r.transitTimeDays[0]}-${r.transitTimeDays[1]}`
    })));

    // FTL Base = 3.75 * 350 * 2 = 2625
    const ftl = results.find(r => r.mode === 'FTL');
    expect(ftl?.costBreakdown.baseFreight).toBeCloseTo(2625);
    
    // Rail first/last mile (5000) makes rail uncompetitive for 350km
    const rail = results.find(r => r.mode === 'Rail');
    if (rail && ftl) {
      expect(ftl.costBreakdown.totalCost).toBeLessThan(rail.costBreakdown.totalCost);
    }
  });

  it('Scenario 3: Kolkata → Guwahati (1000km), 800kg general, Unregistered', () => {
    const shipment: ShipmentDetails = {
      origin: 'Kolkata',
      destination: 'Guwahati',
      distanceKm: 1000,
      weightKg: 800, // 0.8 tonnes
      category: 'general',
      isRegisteredBusiness: false // Should trigger 12% FCM GST
    };

    const results = calculateCosts(shipment, mockRates);
    
    console.log('\n--- Scenario 3: Kolkata → Guwahati (1000km, 800kg, Unregistered) ---');
    console.table(results.map(r => ({
      Mode: r.mode,
      Base: r.costBreakdown.baseFreight,
      GST: r.costBreakdown.gst,
      TotalCost: r.costBreakdown.totalCost,
    })));

    const ftl = results.find(r => r.mode === 'FTL')!;
    // GST = 12% of (Base + Fuel + Handling)
    const taxableAmount = ftl.costBreakdown.baseFreight + ftl.costBreakdown.fuelSurcharge + ftl.costBreakdown.handling;
    expect(ftl.costBreakdown.gst).toBeCloseTo(taxableAmount * 0.12);
  });

  it('Scenario 4: Pune → Ahmedabad (660km), 5000kg, GST registered', () => {
    const shipment: ShipmentDetails = {
      origin: 'Pune',
      destination: 'Ahmedabad',
      distanceKm: 660,
      weightKg: 5000, // 5 tonnes
      category: 'general',
      isRegisteredBusiness: true
    };

    const results = calculateCosts(shipment, mockRates);
    
    console.log('\n--- Scenario 4: Pune → Ahmedabad (660km, 5000kg) ---');
    console.table(results.map(r => ({
      Mode: r.mode,
      TotalCost: r.costBreakdown.totalCost,
    })));

    // At 5000kg, FTL should beat LTL
    const ftl = results.find(r => r.mode === 'FTL')!;
    const ltl = results.find(r => r.mode === 'LTL')!;
    expect(ftl.costBreakdown.totalCost).toBeLessThan(ltl.costBreakdown.totalCost);
  });

  it('Scenario 5: Delhi → Mumbai (1400km), 50kg high-value, GST registered', () => {
    const shipment: ShipmentDetails = {
      origin: 'Delhi',
      destination: 'Mumbai',
      distanceKm: 1400,
      weightKg: 50, // 0.05 tonnes
      category: 'high-value',
      isRegisteredBusiness: true
    };

    const results = calculateCosts(shipment, mockRates);
    
    console.log('\n--- Scenario 5: Delhi → Mumbai (1400km, 50kg, Urgent) ---');
    console.table(results.map(r => ({
      Mode: r.mode,
      Base: r.costBreakdown.baseFreight,
      TotalCost: r.costBreakdown.totalCost,
      Days: `${r.transitTimeDays[0]}-${r.transitTimeDays[1]}`
    })));

    const air = results.find(r => r.mode === 'Air')!;
    // Air should trigger the fixed minimum cost of 15000
    expect(air.costBreakdown.baseFreight).toBe(15000);
    // Air should be the fastest
    expect(air.transitTimeDays[1]).toBe(2);
  });
});
