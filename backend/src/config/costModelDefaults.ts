export const costModelDefaults = {
  road: {
    ftlBaseRatePerTonneKm: 3.8, // ₹ per tonne-km
    ltlMultiplier: 1.4, // Consolidation adds cost
    fuelSurchargePercentage: 0.15, // 15% of base freight
    tollRatePerKm: 2.0, // Avg ₹2 per km (rough estimate)
    gstFcmRate: 0.12, // 12% Forward Charge
    gstRcmRate: 0.05, // 5% Reverse Charge (default for registered)
  },
  rail: {
    bulkRatePerTonneKm: 2.0,
    parcelRatePerTonneKm: 12.0,
    terminalHandlingPerTonne: 500, // ₹500 per tonne at origin and destination
    firstLastMileRoadCostPerTonne: 1000, // Fixed assumption for rail legs
  },
  air: {
    baseRatePerTonneKm: 72.0,
    fixedMinimumCharge: 2000,
    handlingFee: 500,
  },
  coastal: {
    baseRatePerTonneKm: 1.2,
    handlingPerTonne: 800,
    firstLastMileRoadCostPerTonne: 1200,
  }
};
