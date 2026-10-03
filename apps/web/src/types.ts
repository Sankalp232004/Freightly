export type CargoClass =
  | 'general'
  | 'fragile'
  | 'temperature-controlled'
  | 'hazmat'
  | 'high-value';

export interface CompareInput {
  origin: string;
  destination: string;
  weightKg: number;
  cargoClass: CargoClass;
  gstRegistered: boolean;
  goodsValueInr?: number;
  dimensionsCm?: {
    l: number;
    w: number;
    h: number;
  };
  urgency?: 'normal' | 'express';
}

export interface LineItem {
  label: string;
  amountPaise: number;
}

export interface TransitDuration {
  minDays: number;
  maxDays: number;
}

export interface ModeResult {
  mode: 'road_ftl' | 'road_ltl' | 'rail' | 'air' | 'coastal';
  label: string;
  vehicleType?: string;
  lineItems: LineItem[];
  totalPaise: number;
  transit: TransitDuration;
  co2Kg: number;
  gstApplied: boolean;
  ewayBillRequired: boolean;
  distanceKm: number;
  viable: true;
  rankReason: string;
}

export interface OmittedMode {
  mode: string;
  label: string;
  viable: false;
  reason: string;
}

export interface CompareResponse {
  comparisonId: string;
  rankedOptions: ModeResult[];
  omittedModes: OmittedMode[];
  distanceKm: number;
  distanceSource: 'ors' | 'estimate';
  rateVersionId: number;
  disclaimer: string;
  ewayBillNotice?: string;
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  created_at?: string;
}

export interface SavedComparison {
  id: number;
  label: string | null;
  created_at: string;
  comparison_id: string;
  input: CompareInput;
  result: CompareResponse;
}

export interface RateVersion {
  id: number;
  created_at: string;
  created_by: string;
  is_active: boolean;
  note: string | null;
}

export interface RateParameter {
  id: number;
  rate_version_id: number;
  key: string;
  value: number;
  unit: string;
  description: string;
  source_note?: string | null;
}

export interface PlaceFeature {
  properties: {
    label: string;
    name: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}
