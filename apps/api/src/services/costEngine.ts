/**
 * Rate parameters fetched from the database.
 * All values are plain numbers; currency is in paise where noted.
 */
export interface RateParameters {
  [key: string]: number;
}

/** Input from the user */
export interface CompareInput {
  origin: string;
  destination: string;
  weightKg: number;
  cargoClass: 'general' | 'fragile' | 'temperature-controlled' | 'hazmat' | 'high-value';
  gstRegistered: boolean;
  goodsValueInr?: number;
  dimensionsCm?: { l: number; w: number; h: number };
  urgency?: 'normal' | 'express';
}

/** A single line item in a cost breakdown */
export interface LineItem {
  label: string;
  amountPaise: number; // integer paise, avoids float drift
}

export interface TransitRange {
  minDays: number;
  maxDays: number;
}

export type TransportMode = 'road_ftl' | 'road_ltl' | 'rail' | 'air' | 'coastal';

export interface ModeResult {
  mode: TransportMode;
  label: string;
  vehicleType?: string; // human-readable vehicle/vessel spec
  lineItems: LineItem[];
  totalPaise: number; // === sum(lineItems.amountPaise), guaranteed
  transit: TransitRange;
  co2Kg: number;
  gstApplied: boolean;
  ewayBillRequired: boolean;
  distanceKm: number;
  viable: true;
  rankReason: string; // plain-language one-liner
}

export interface OmittedMode {
  mode: TransportMode;
  label: string;
  viable: false;
  reason: string;
}

export interface CompareResult {
  rankedOptions: ModeResult[];
  omittedModes: OmittedMode[];
  distanceKm: number;
  distanceSource: 'ors' | 'estimate';
  rateVersionId: number;
  disclaimer: string;
  ewayBillNotice?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Round to nearest integer (for paise) */
function toPaise(inr: number): number {
  return Math.round(inr * 100);
}

function param(rates: RateParameters, key: string): number {
  const v = rates[key];
  if (v === undefined) throw new Error(`Missing rate parameter: ${key}`);
  return Number(v);
}

function transitRange(
  distanceKm: number,
  speedPerDay: number,
  bufferDays: number,
): TransitRange {
  const raw = distanceKm / speedPerDay;
  const minDays = Math.max(1, Math.floor(raw) + bufferDays);
  const maxDays = Math.max(minDays + 1, Math.ceil(raw) + bufferDays + 1);
  return { minDays, maxDays }; // minDays < maxDays always
}

// ─── FTL ─────────────────────────────────────────────────────────────────────

interface VehicleTier {
  key: string;
  capacityKg: number;
  ratePerTonneKm: number;
}

function getFtlTiers(rates: RateParameters): VehicleTier[] {
  return [
    { key: 'mini',       capacityKg: param(rates, 'road.mini_truck.capacity_kg'),       ratePerTonneKm: param(rates, 'road.mini_truck.rate_per_tonne_km') },
    { key: 'medium',     capacityKg: param(rates, 'road.medium_truck.capacity_kg'),     ratePerTonneKm: param(rates, 'road.medium_truck.rate_per_tonne_km') },
    { key: 'large',      capacityKg: param(rates, 'road.large_truck.capacity_kg'),      ratePerTonneKm: param(rates, 'road.large_truck.rate_per_tonne_km') },
    { key: 'multi_axle', capacityKg: param(rates, 'road.multi_axle.capacity_kg'),      ratePerTonneKm: param(rates, 'road.multi_axle.rate_per_tonne_km') },
  ];
}

export function calcRoadFtl(
  input: CompareInput,
  distanceKm: number,
  rates: RateParameters,
): ModeResult {
  const tiers = getFtlTiers(rates);
  const largestTier = tiers[tiers.length - 1];

  // Split across multiple trucks if weight exceeds the largest tier
  const trucksNeeded = Math.ceil(input.weightKg / largestTier.capacityKg);
  const weightPerTruck = input.weightKg / trucksNeeded;

  // Pick the smallest tier that fits each truck's share
  const tier = tiers.find((t) => t.capacityKg >= weightPerTruck) ?? largestTier;

  const vehicleLabels: Record<string, string> = {
    mini:       'Mini Truck (up to 1.5T)',
    medium:     'Medium Truck / 9T GVW',
    large:      'Large Truck / 25T GVW',
    multi_axle: 'Multi-Axle / 40T GVW',
  };
  const vehicleType = vehicleLabels[tier.key] ?? tier.key;

  const weightTonne = input.weightKg / 1000;
  const baseFreightInr = tier.ratePerTonneKm * distanceKm * weightTonne * trucksNeeded;
  const fuelSurchargeInr = baseFreightInr * param(rates, 'road.fuel_surcharge_pct');
  const tollsInr = param(rates, 'road.toll_rate_per_km') * distanceKm * trucksNeeded;
  const handlingInr = param(rates, 'road.handling_per_tonne') * weightTonne;

  // Express dispatch: 15% priority surcharge on road FTL
  const isExpress = input.urgency === 'express';
  const expressSubtotal = baseFreightInr + fuelSurchargeInr + tollsInr + handlingInr;
  const expressSurchargeInr = isExpress ? expressSubtotal * 0.15 : 0;

  const subtotalInr = expressSubtotal + expressSurchargeInr;
  const gstRate = input.gstRegistered
    ? param(rates, 'gst.gta_rcm_rate')
    : param(rates, 'gst.gta_fcm_rate');
  const gstInr = subtotalInr * gstRate;

  const lineItems: LineItem[] = [
    { label: `Base freight (${trucksNeeded > 1 ? `${trucksNeeded}× ` : ''}${tier.key.replace('_', ' ')} truck)`, amountPaise: toPaise(baseFreightInr) },
    { label: 'Fuel surcharge', amountPaise: toPaise(fuelSurchargeInr) },
    { label: 'Tolls', amountPaise: toPaise(tollsInr) },
    { label: 'Handling (loading + unloading)', amountPaise: toPaise(handlingInr) },
    ...(isExpress ? [{ label: 'Express dispatch surcharge (15%)', amountPaise: toPaise(expressSurchargeInr) }] : []),
    { label: `GST ${(gstRate * 100).toFixed(0)}% (${input.gstRegistered ? 'RCM' : 'FCM'})`, amountPaise: toPaise(gstInr) },
  ];

  const totalPaise = lineItems.reduce((s, li) => s + li.amountPaise, 0);
  const transit = transitRange(
    distanceKm,
    param(rates, 'road.speed_km_per_day') * (isExpress ? 1.25 : 1),
    isExpress ? 0 : param(rates, 'road.transit_buffer_days'),
  );
  const co2Kg = (weightTonne * distanceKm * param(rates, 'co2.road_ftl_kg_per_tonne_km')) * trucksNeeded;

  const ewayBillRequired = !!(input.goodsValueInr && input.goodsValueInr > param(rates, 'compliance.eway_bill_threshold_inr'));

  return {
    mode: 'road_ftl',
    label: isExpress ? 'Road — Full Truck Load (Express)' : 'Road — Full Truck Load',
    vehicleType: trucksNeeded > 1 ? `${trucksNeeded}× ${vehicleType}` : vehicleType,
    lineItems,
    totalPaise,
    transit,
    co2Kg: Math.round(co2Kg * 10) / 10,
    gstApplied: true,
    ewayBillRequired,
    distanceKm,
    viable: true,
    rankReason: trucksNeeded > 1
      ? `Requires ${trucksNeeded} trucks; dedicated capacity`
      : isExpress ? 'Priority express dispatch; dedicated truck with faster transit'
      : 'Dedicated truck; faster and more reliable than LTL',
  };
}

// ─── LTL ─────────────────────────────────────────────────────────────────────

export function calcRoadLtl(
  input: CompareInput,
  distanceKm: number,
  rates: RateParameters,
): ModeResult {
  const baseInr = Math.max(
    param(rates, 'road_ltl.minimum_charge'),
    param(rates, 'road_ltl.rate_per_kg') * input.weightKg * param(rates, 'road_ltl.consolidation_multiplier'),
  );
  const fuelSurchargeInr = baseInr * param(rates, 'road.fuel_surcharge_pct');
  const weightTonne = input.weightKg / 1000;
  const handlingInr = param(rates, 'road.handling_per_tonne') * weightTonne;

  const subtotalInr = baseInr + fuelSurchargeInr + handlingInr;
  const gstRate = input.gstRegistered
    ? param(rates, 'gst.gta_rcm_rate')
    : param(rates, 'gst.gta_fcm_rate');
  const gstInr = subtotalInr * gstRate;

  const lineItems: LineItem[] = [
    { label: 'Base freight (LTL consolidated)', amountPaise: toPaise(baseInr) },
    { label: 'Fuel surcharge', amountPaise: toPaise(fuelSurchargeInr) },
    { label: 'Handling', amountPaise: toPaise(handlingInr) },
    { label: `GST ${(gstRate * 100).toFixed(0)}%`, amountPaise: toPaise(gstInr) },
  ];

  const totalPaise = lineItems.reduce((s, li) => s + li.amountPaise, 0);
  const transit = transitRange(
    distanceKm,
    param(rates, 'road.speed_km_per_day') * 0.75, // LTL is slower due to consolidation hubs
    param(rates, 'road.transit_buffer_days') + 1,
  );
  const co2Kg = weightTonne * distanceKm * param(rates, 'co2.road_ltl_kg_per_tonne_km');
  const ewayBillRequired = !!(input.goodsValueInr && input.goodsValueInr > param(rates, 'compliance.eway_bill_threshold_inr'));

  return {
    mode: 'road_ltl',
    label: 'Road — Less Than Truck Load',
    lineItems,
    totalPaise,
    transit,
    co2Kg: Math.round(co2Kg * 10) / 10,
    gstApplied: true,
    ewayBillRequired,
    distanceKm,
    viable: true,
    rankReason: 'Shared load; lower cost for small shipments, slightly slower',
  };
}

// ─── RAIL ────────────────────────────────────────────────────────────────────

export function calcRail(
  input: CompareInput,
  distanceKm: number,
  rates: RateParameters,
): ModeResult | OmittedMode {
  const minWeight = param(rates, 'rail.minimum_weight_kg');
  if (input.weightKg < minWeight) {
    return {
      mode: 'rail',
      label: 'Rail',
      viable: false,
      reason: `Rail requires a minimum of ${minWeight} kg; your shipment is ${input.weightKg} kg`,
    };
  }
  if (distanceKm < 400) {
    return {
      mode: 'rail',
      label: 'Rail',
      viable: false,
      reason: `Rail is not competitive for distances under 400 km (${distanceKm} km route); use road instead`,
    };
  }

  const weightTonne = input.weightKg / 1000;
  const lineHaulInr = param(rates, 'rail.rate_per_tonne_km') * distanceKm * weightTonne;
  const terminalHandlingInr = param(rates, 'rail.terminal_handling_per_tonne') * weightTonne;
  const firstMileDistKm = param(rates, 'rail.first_mile_distance_km');
  const lastMileDistKm = param(rates, 'rail.last_mile_distance_km');
  const firstMileInr = param(rates, 'rail.first_mile_rate_per_km') * firstMileDistKm * weightTonne;
  const lastMileInr = param(rates, 'rail.last_mile_rate_per_km') * lastMileDistKm * weightTonne;

  const subtotalInr = lineHaulInr + terminalHandlingInr + firstMileInr + lastMileInr;
  const gstInr = subtotalInr * 0.05; // Rail GST fixed at 5%

  // Rail lineItems ALWAYS include first and last mile — this is a specification requirement
  const lineItems: LineItem[] = [
    { label: `Rail line-haul (${distanceKm} km)`, amountPaise: toPaise(lineHaulInr) },
    { label: 'Terminal handling (loading + unloading)', amountPaise: toPaise(terminalHandlingInr) },
    { label: `First-mile road (${firstMileDistKm} km origin to rail yard)`, amountPaise: toPaise(firstMileInr) },
    { label: `Last-mile road (${lastMileDistKm} km rail yard to destination)`, amountPaise: toPaise(lastMileInr) },
    { label: 'GST 5%', amountPaise: toPaise(gstInr) },
  ];

  const totalPaise = lineItems.reduce((s, li) => s + li.amountPaise, 0);
  const transit = transitRange(distanceKm, param(rates, 'rail.speed_km_per_day'), param(rates, 'rail.transit_buffer_days'));
  const co2Kg = weightTonne * distanceKm * param(rates, 'co2.rail_kg_per_tonne_km');
  const ewayBillRequired = !!(input.goodsValueInr && input.goodsValueInr > param(rates, 'compliance.eway_bill_threshold_inr'));

  return {
    mode: 'rail',
    label: 'Rail',
    lineItems,
    totalPaise,
    transit,
    co2Kg: Math.round(co2Kg * 10) / 10,
    gstApplied: true,
    ewayBillRequired,
    distanceKm,
    viable: true,
    rankReason: 'Lowest CO2; best value for heavy, long-haul cargo over 300 km',
  };
}

// ─── AIR ─────────────────────────────────────────────────────────────────────

export function calcAir(
  input: CompareInput,
  distanceKm: number,
  rates: RateParameters,
): ModeResult | OmittedMode {
  const maxWeight = param(rates, 'air.max_practical_weight_kg');
  if (input.weightKg > maxWeight) {
    return {
      mode: 'air',
      label: 'Air',
      viable: false,
      reason: `Air freight is not offered above ${maxWeight} kg; your shipment is ${input.weightKg} kg`,
    };
  }

  // Chargeable weight = max(actual, volumetric) when dimensions provided
  let chargeableWeightKg = input.weightKg;
  if (input.dimensionsCm) {
    const { l, w, h } = input.dimensionsCm;
    const volumetricKg = (l * w * h) / param(rates, 'air.volumetric_divisor');
    chargeableWeightKg = Math.max(input.weightKg, volumetricKg);
  }

  const ratePerKg = param(rates, 'air.rate_per_kg');
  const minCharge = param(rates, 'air.minimum_charge');
  const baseInr = Math.max(minCharge, ratePerKg * chargeableWeightKg);
  const handlingInr = param(rates, 'air.handling_flat');

  // Express dispatch is default for air; no extra surcharge needed
  const subtotalInr = baseInr + handlingInr;
  const gstInr = subtotalInr * param(rates, 'gst.air_freight_rate');

  const lineItems: LineItem[] = [
    {
      label: chargeableWeightKg !== input.weightKg
        ? `Air freight (${chargeableWeightKg.toFixed(1)} kg chargeable, volumetric)`
        : `Air freight (${input.weightKg} kg)`,
      amountPaise: toPaise(baseInr),
    },
    { label: 'Handling and documentation', amountPaise: toPaise(handlingInr) },
    { label: `GST 18%`, amountPaise: toPaise(gstInr) },
  ];

  const totalPaise = lineItems.reduce((s, li) => s + li.amountPaise, 0);

  // Air transit: 1–2 days (express same-day option if urgency=express)
  const isExpress = input.urgency === 'express';
  const transit: TransitRange = {
    minDays: isExpress ? 1 : param(rates, 'air.transit_days_min'),
    maxDays: isExpress ? 1 : param(rates, 'air.transit_days_max'),
  };

  const weightTonne = input.weightKg / 1000;
  const co2Kg = weightTonne * distanceKm * param(rates, 'co2.air_kg_per_tonne_km');
  const ewayBillRequired = !!(input.goodsValueInr && input.goodsValueInr > param(rates, 'compliance.eway_bill_threshold_inr'));

  return {
    mode: 'air',
    label: 'Air Freight',
    vehicleType: isExpress ? 'Priority Express Air (Next Flight Out)' : 'Standard Air Cargo',
    lineItems,
    totalPaise,
    transit,
    co2Kg: Math.round(co2Kg * 10) / 10,
    gstApplied: true,
    ewayBillRequired,
    distanceKm,
    viable: true,
    rankReason: isExpress ? 'Priority express; next available flight' : 'Fastest bulk option; premium cost per kg',
  };
}

// ─── COASTAL ─────────────────────────────────────────────────────────────────

export function calcCoastal(
  input: CompareInput,
  distanceKm: number,
  rates: RateParameters,
  originNearPort: boolean,
  destinationNearPort: boolean,
): ModeResult | OmittedMode {
  if (!originNearPort || !destinationNearPort) {
    return {
      mode: 'coastal',
      label: 'Coastal / Short-Sea',
      viable: false,
      reason: `Coastal shipping requires both origin and destination within ${param(rates, 'coastal.port_proximity_km')} km of a major port`,
    };
  }

  const weightTonne = input.weightKg / 1000;
  const baseInr = param(rates, 'coastal.rate_per_tonne_km') * distanceKm * weightTonne;
  const portHandlingInr = param(rates, 'coastal.handling_per_tonne') * weightTonne;
  const gstInr = (baseInr + portHandlingInr) * 0.05;

  const lineItems: LineItem[] = [
    { label: `Coastal sea freight (${distanceKm} km)`, amountPaise: toPaise(baseInr) },
    { label: 'Port handling charges', amountPaise: toPaise(portHandlingInr) },
    { label: 'GST 5%', amountPaise: toPaise(gstInr) },
  ];

  const totalPaise = lineItems.reduce((s, li) => s + li.amountPaise, 0);

  const seaSpeedKmh = param(rates, 'coastal.transit_speed_kmh');
  const seaDays = distanceKm / (seaSpeedKmh * 24);
  const portDwell = param(rates, 'coastal.port_dwell_days');
  const transit: TransitRange = {
    minDays: Math.max(1, Math.floor(seaDays + portDwell)),
    maxDays: Math.max(2, Math.ceil(seaDays + portDwell) + 1),
  };

  const co2Kg = weightTonne * distanceKm * param(rates, 'co2.coastal_kg_per_tonne_km');
  const ewayBillRequired = !!(input.goodsValueInr && input.goodsValueInr > param(rates, 'compliance.eway_bill_threshold_inr'));

  return {
    mode: 'coastal',
    label: 'Coastal / Short-Sea',
    lineItems,
    totalPaise,
    transit,
    co2Kg: Math.round(co2Kg * 10) / 10,
    gstApplied: true,
    ewayBillRequired,
    distanceKm,
    viable: true,
    rankReason: 'Lowest cost per tonne-km for coastal corridors; longer transit',
  };
}

// ─── MAIN COMPARE FUNCTION ───────────────────────────────────────────────────

export function runCompare(
  input: CompareInput,
  distanceKm: number,
  distanceSource: 'ors' | 'estimate',
  rates: RateParameters,
  rateVersionId: number,
  originNearPort = false,
  destinationNearPort = false,
): CompareResult {
  const candidates = [
    calcRoadFtl(input, distanceKm, rates),
    calcRoadLtl(input, distanceKm, rates),
    calcRail(input, distanceKm, rates),
    calcAir(input, distanceKm, rates),
    calcCoastal(input, distanceKm, rates, originNearPort, destinationNearPort),
  ];

  const viable: ModeResult[] = [];
  const omitted: OmittedMode[] = [];

  for (const c of candidates) {
    if (c.viable) {
      // Invariant: total must equal sum of line items
      const lineItemSum = c.lineItems.reduce((s, li) => s + li.amountPaise, 0);
      if (c.totalPaise !== lineItemSum) {
        throw new Error(
          `Cost engine invariant violated for mode ${c.mode}: total ${c.totalPaise} !== sum ${lineItemSum}`,
        );
      }
      viable.push(c);
    } else {
      omitted.push(c);
    }
  }

  // Sort by cost (cheapest first), then by transit (fastest)
  viable.sort((a, b) => a.totalPaise - b.totalPaise || a.transit.minDays - b.transit.minDays);

  const ewayThreshold = rates['compliance.eway_bill_threshold_inr'];
  const ewayBillNotice =
    input.goodsValueInr && input.goodsValueInr > ewayThreshold
      ? `E-way bill required: declared goods value ₹${input.goodsValueInr.toLocaleString('en-IN')} exceeds the ₹${ewayThreshold.toLocaleString('en-IN')} threshold (CGST Rule 138).`
      : undefined;

  return {
    rankedOptions: viable,
    omittedModes: omitted,
    distanceKm,
    distanceSource,
    rateVersionId,
    disclaimer:
      'These are modelled estimates based on benchmark rates and approximate distances. They are not carrier quotes. Actual costs will vary based on carrier, route conditions, and current fuel prices.',
    ewayBillNotice,
  };
}
