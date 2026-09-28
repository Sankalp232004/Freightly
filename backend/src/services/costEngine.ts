import { PrismaClient, RateBenchmark } from '@prisma/client';

export type CargoCategory = 'general' | 'fragile' | 'temperature-controlled' | 'hazmat' | 'high-value';
export type Mode = 'FTL' | 'LTL' | 'Rail' | 'Air' | 'Coastal';

export interface ShipmentDetails {
  origin: string;
  destination: string;
  distanceKm: number;
  weightKg: number;
  volumeCbm?: number;
  category: CargoCategory;
  isRegisteredBusiness: boolean;
}

export interface CostBreakdown {
  baseFreight: number;
  fuelSurcharge: number;
  tolls: number;
  handling: number;
  firstLastMile: number;
  gst: number;
  totalCost: number;
}

export interface ModeOption {
  mode: Mode;
  costBreakdown: CostBreakdown;
  transitTimeDays: [number, number];
  reliabilityScore: number;
  co2EstimateKg: number;
  complianceNotes: string[];
  isOptimal?: boolean;
}

// Convert DB array to a lookup map
const buildRatesMap = (rates: RateBenchmark[]) => {
  return rates.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {} as Record<string, number>);
};

export const calculateCosts = (shipment: ShipmentDetails, ratesMap: Record<string, number>): ModeOption[] => {
  const options: ModeOption[] = [];
  const weightTonne = shipment.weightKg / 1000;
  const isEwayBillRequired = true; 

  const ftlGstRate = shipment.isRegisteredBusiness ? ratesMap['gst_rate_rcm'] : 0.12;

  // 1. Road (FTL)
  const ftlBase = ratesMap['road_ftl_base_rate_per_tonne_km'] * shipment.distanceKm * weightTonne;
  const ftlFuel = ftlBase * ratesMap['road_fuel_surcharge_percent'];
  const ftlTolls = ratesMap['road_toll_rate_per_km'] * shipment.distanceKm;
  const ftlHandling = 500;
  const ftlGst = (ftlBase + ftlFuel + ftlHandling) * ftlGstRate;
  
  options.push({
    mode: 'FTL',
    costBreakdown: {
      baseFreight: ftlBase,
      fuelSurcharge: ftlFuel,
      tolls: ftlTolls,
      handling: ftlHandling,
      firstLastMile: 0,
      gst: ftlGst,
      totalCost: ftlBase + ftlFuel + ftlTolls + ftlHandling + ftlGst,
    },
    transitTimeDays: [
      Math.ceil(shipment.distanceKm / 400),
      Math.max(Math.ceil(shipment.distanceKm / 400) + 1, Math.ceil(shipment.distanceKm / 300))
    ],
    reliabilityScore: 8,
    co2EstimateKg: weightTonne * shipment.distanceKm * 0.1,
    complianceNotes: [
      shipment.isRegisteredBusiness ? 'GST 5% (Reverse Charge Mechanism)' : 'GST 12% (Forward Charge)',
      isEwayBillRequired ? 'E-way bill required' : ''
    ].filter(Boolean)
  });

  // 2. Road (LTL)
  const ltlBase = ratesMap['road_ftl_base_rate_per_tonne_km'] * ratesMap['road_ltl_consolidation_multiplier'] * shipment.distanceKm * weightTonne;
  const ltlFuel = ltlBase * ratesMap['road_fuel_surcharge_percent'];
  const ltlTolls = 0; 
  const ltlHandling = 800; 
  const ltlGst = (ltlBase + ltlFuel + ltlHandling) * ftlGstRate;

  options.push({
    mode: 'LTL',
    costBreakdown: {
      baseFreight: ltlBase,
      fuelSurcharge: ltlFuel,
      tolls: ltlTolls,
      handling: ltlHandling,
      firstLastMile: 0,
      gst: ltlGst,
      totalCost: ltlBase + ltlFuel + ltlTolls + ltlHandling + ltlGst,
    },
    transitTimeDays: [
      Math.ceil(shipment.distanceKm / 300) + 1,
      Math.max(Math.ceil(shipment.distanceKm / 300) + 2, Math.ceil(shipment.distanceKm / 200) + 2)
    ],
    reliabilityScore: 7,
    co2EstimateKg: weightTonne * shipment.distanceKm * 0.08,
    complianceNotes: [
      shipment.isRegisteredBusiness ? 'GST 5% (Reverse Charge Mechanism)' : 'GST 12% (Forward Charge)',
      isEwayBillRequired ? 'E-way bill required' : ''
    ].filter(Boolean)
  });

  // 3. Rail (Bulk)
  if (weightTonne > 0.5) { // Assuming bulk is only viable for > 500kg
    const railBase = ratesMap['rail_bulk_rate_per_tonne_km'] * shipment.distanceKm * weightTonne;
    const railHandling = 1000;
    const railFirstLast = ratesMap['rail_first_last_mile_fixed_cost'];
    const railGst = (railBase + railHandling + railFirstLast) * 0.05;

    options.push({
      mode: 'Rail',
      costBreakdown: {
        baseFreight: railBase,
        fuelSurcharge: 0,
        tolls: 0,
        handling: railHandling,
        firstLastMile: railFirstLast,
        gst: railGst,
        totalCost: railBase + railHandling + railFirstLast + railGst,
      },
      transitTimeDays: [
        Math.ceil(shipment.distanceKm / 600) + 2,
        Math.max(Math.ceil(shipment.distanceKm / 600) + 3, Math.ceil(shipment.distanceKm / 400) + 4)
      ],
      reliabilityScore: 6,
      co2EstimateKg: weightTonne * shipment.distanceKm * 0.02,
      complianceNotes: ['Railway receipt (RR) generated', isEwayBillRequired ? 'E-way bill required' : '']
    });
  }

  // 4. Air
  const airBase = Math.max(ratesMap['air_fixed_minimum_cost'], ratesMap['air_base_rate_per_tonne_km'] * shipment.distanceKm * weightTonne);
  const airHandling = 2000;
  const airFirstLast = 2000; // Airport transfer
  const airGst = (airBase + airHandling + airFirstLast) * 0.18; // Air freight usually 18% GST

  options.push({
    mode: 'Air',
    costBreakdown: {
      baseFreight: airBase,
      fuelSurcharge: 0,
      tolls: 0,
      handling: airHandling,
      firstLastMile: airFirstLast,
      gst: airGst,
      totalCost: airBase + airHandling + airFirstLast + airGst,
    },
    transitTimeDays: [1, 2], // Air is very fast
    reliabilityScore: 9,
    co2EstimateKg: weightTonne * shipment.distanceKm * 0.5,
    complianceNotes: ['Air Waybill (AWB) required', 'Strict security screening']
  });

  return options.sort((a, b) => a.costBreakdown.totalCost - b.costBreakdown.totalCost);
};

export const getCostOptions = async (shipment: ShipmentDetails, prisma: PrismaClient): Promise<ModeOption[]> => {
  const rates = await prisma.rateBenchmark.findMany();
  const ratesMap = buildRatesMap(rates);
  return calculateCosts(shipment, ratesMap);
};
