// ============================================================
// Sea of Blue — Pricing Engine Constants
// Single source of truth: approved rate card, add-ons, discounts.
// ============================================================

// ---------- Core Types ----------

export type PropertyType = 'condo' | 'basement' | 'house';

export type PackageType =
  | 'standard'
  | 'standard_plus'
  | 'deep_clean'
  | 'full_reset'
  | 'move_in_out';

export type Frequency = 'one_time' | 'monthly' | 'biweekly' | 'weekly';

export interface SizeBand {
  label: string;
  bedBath?: string; // informational (house bands)
  sqftMin: number;
  sqftMax: number | null; // null = open-ended
  standard: number;
  standardPlus: number;
  deepClean: number | [number, number];
  fullReset: number | [number, number];
  moveInOut: number | [number, number];
  hourlyBilled: boolean;
}

export interface AddOnDef {
  id: string;
  label: string;
  price: number | null;
  /** Package tier from which this add-on is included at no extra charge */
  includedFrom: PackageType | null;
  /** If true, rep must manually enter a price — never auto-priced */
  customQuoteOnly?: boolean;
  /** If set, price = percentOfTotal × subtotal (computed last) */
  percentOfTotal?: number;
  /** Unit label for per-unit items (e.g. "window") */
  perUnit?: string;
  /** Informational flag: may need subcontractor */
  requiresSubcontractorCheck?: boolean;
  /** Informational flag: liability sign-off required */
  requiresLiabilitySignoff?: boolean;
}

// ---------- Rate Tables ----------

export const CONDO_RATES: SizeBand[] = [
  { label: 'Studio/Bachelor', sqftMin: 0, sqftMax: 500, standard: 120, standardPlus: 145, deepClean: 185, fullReset: 240, moveInOut: 250, hourlyBilled: false },
  { label: '1BR/1BA', sqftMin: 500, sqftMax: 700, standard: 140, standardPlus: 170, deepClean: 220, fullReset: 280, moveInOut: 295, hourlyBilled: false },
  { label: '2BR/1BA', sqftMin: 700, sqftMax: 900, standard: 160, standardPlus: 190, deepClean: 250, fullReset: 320, moveInOut: 335, hourlyBilled: false },
  { label: '2BR/2BA', sqftMin: 900, sqftMax: 1100, standard: 180, standardPlus: 215, deepClean: 280, fullReset: 360, moveInOut: 380, hourlyBilled: false },
  { label: '3BR/2BA', sqftMin: 1100, sqftMax: 1400, standard: 205, standardPlus: 245, deepClean: 320, fullReset: 410, moveInOut: 430, hourlyBilled: false },
];

export const BASEMENT_RATES: SizeBand[] = [
  { label: 'Bachelor basement', sqftMin: 0, sqftMax: 500, standard: 130, standardPlus: 155, deepClean: 195, fullReset: 250, moveInOut: 275, hourlyBilled: false },
  { label: '1BR basement', sqftMin: 500, sqftMax: 700, standard: 150, standardPlus: 180, deepClean: 230, fullReset: 295, moveInOut: 315, hourlyBilled: false },
  { label: '2BR basement', sqftMin: 700, sqftMax: 900, standard: 170, standardPlus: 205, deepClean: 265, fullReset: 340, moveInOut: 355, hourlyBilled: false },
];

export const HOUSE_RATES: SizeBand[] = [
  { label: 'Under 1,000 sqft', bedBath: '2BR/1BA', sqftMin: 0, sqftMax: 1000, standard: 175, standardPlus: 210, deepClean: 270, fullReset: 350, moveInOut: 365, hourlyBilled: false },
  { label: '1,000–1,500 sqft', bedBath: '3BR/1.5BA', sqftMin: 1000, sqftMax: 1500, standard: 200, standardPlus: 240, deepClean: 395, fullReset: 550, moveInOut: 420, hourlyBilled: false },
  { label: '1,500–2,000 sqft', bedBath: '3BR/2BA', sqftMin: 1500, sqftMax: 2000, standard: 280, standardPlus: 345, deepClean: [480, 650], fullReset: [665, 910], moveInOut: [700, 955], hourlyBilled: true },
  { label: '2,000–2,500 sqft', bedBath: '4BR/2.5BA', sqftMin: 2000, sqftMax: 2500, standard: 360, standardPlus: 440, deepClean: [610, 830], fullReset: [865, 1160], moveInOut: [910, 1225], hourlyBilled: true },
  { label: '2,500–3,000 sqft', bedBath: '4BR/3BA', sqftMin: 2500, sqftMax: 3000, standard: 440, standardPlus: 540, deepClean: [750, 1015], fullReset: [1050, 1420], moveInOut: [1105, 1495], hourlyBilled: true },
];
// 3,000+ sqft house: no lookup row → CUSTOM_QUOTE_REQUIRED

// ---------- Bathroom Adjustment ----------

export const BATHROOM_ADJUSTMENT = {
  includedBaths: { condo: 1, basement: 1, house: 2 } as Record<PropertyType, number>,
  extraFullBath: 18,
  extraHalfBath: 9,
};

// ---------- Frequency Discounts ----------
// Only applies to standard / standard_plus. Others are always one-time.

export const FREQUENCY_DISCOUNT: Record<Frequency, number> = {
  one_time: 0,
  monthly: -0.05,
  biweekly: -0.10,
  weekly: -0.15,
};

// ---------- Add-Ons ----------

export const ADD_ONS: AddOnDef[] = [
  // --- Standard Add-Ons ---
  { id: 'inside_fridge', label: 'Inside fridge', price: 30, includedFrom: 'deep_clean' },
  { id: 'inside_oven', label: 'Inside oven', price: 30, includedFrom: 'deep_clean' },
  { id: 'inside_cabinets', label: 'Inside cabinets (empty)', price: 40, includedFrom: 'full_reset' },
  { id: 'interior_windows', label: 'Interior windows', price: 50, includedFrom: 'full_reset' },
  { id: 'laundry', label: 'Laundry, per load', price: 18, includedFrom: null },
  { id: 'balcony', label: 'Balcony/patio', price: 25, includedFrom: 'full_reset' },
  { id: 'heavy_pet_hair', label: 'Heavy pet hair', price: 20, includedFrom: null },
  { id: 'garage', label: 'Garage', price: null, includedFrom: 'full_reset', customQuoteOnly: true },

  // --- Fabric & Textile ---
  { id: 'upholstery_sofa', label: 'Upholstery cleaning, sofa', price: 75, includedFrom: null },
  { id: 'upholstery_chair', label: 'Upholstery cleaning, armchair', price: 30, includedFrom: null },
  { id: 'mattress_clean', label: 'Mattress vacuum/sanitize', price: 30, includedFrom: null },
  { id: 'carpet_steam_room', label: 'Carpet steam clean, per room', price: 50, includedFrom: null },
  { id: 'carpet_steam_unit', label: 'Carpet steam clean, whole unit', price: 150, includedFrom: null, requiresSubcontractorCheck: true },
  { id: 'linen_change', label: 'Bed linen strip and remake, per bed', price: 12, includedFrom: null },

  // --- Deep Surface & Fixtures ---
  { id: 'blinds_detail', label: 'Blinds detail, per window', price: 10, includedFrom: null },
  { id: 'curtain_dusting', label: 'Curtain/drape dusting, per window', price: 12, includedFrom: null },
  { id: 'full_wall_wash', label: 'Full wall wash, per room', price: 18, includedFrom: null },
  { id: 'ceiling_fan', label: 'Ceiling fan deep clean, per fan', price: 12, includedFrom: null },
  { id: 'grout_deep_clean', label: 'Grout deep clean', price: null, includedFrom: null, customQuoteOnly: true },
  { id: 'wine_fridge', label: 'Wine/bar fridge interior', price: 18, includedFrom: null },
  { id: 'fireplace_surround', label: 'Fireplace surround wipe-down', price: 18, includedFrom: null },
  { id: 'bbq_exterior', label: 'BBQ/grill exterior clean', price: 25, includedFrom: null },

  // --- Windows & Exterior ---
  { id: 'exterior_windows_ground', label: 'Exterior windows, ground-accessible', price: 9, includedFrom: null, perUnit: 'window' },
  { id: 'exterior_windows_elevated', label: 'Exterior windows, above ground level', price: null, includedFrom: null, customQuoteOnly: true, requiresLiabilitySignoff: true },

  // --- Convenience & Scheduling ---
  { id: 'dishes', label: 'Dishes left in sink, washed', price: 12, includedFrom: null },
  { id: 'rush_booking', label: 'Same-day/rush booking', price: null, includedFrom: null, percentOfTotal: 0.175 },
  { id: 'after_hours', label: 'After-hours/weekend service', price: null, includedFrom: null, percentOfTotal: 0.125 },
  { id: 'key_pickup', label: 'Key pickup/lockbox coordination', price: 12, includedFrom: null },
  { id: 'eco_upgrade', label: 'Eco/green product upgrade', price: 10, includedFrom: null },
  { id: 'pet_odor', label: 'Pet odor treatment', price: 25, includedFrom: null },
  { id: 'sanitizing_pass', label: 'Post-illness sanitizing pass', price: 40, includedFrom: null },
];

// Add-on category groupings for the UI
export const ADD_ON_CATEGORIES = [
  {
    label: 'Standard',
    ids: ['inside_fridge', 'inside_oven', 'inside_cabinets', 'interior_windows', 'laundry', 'balcony', 'heavy_pet_hair', 'garage'],
  },
  {
    label: 'Fabric & Textile',
    ids: ['upholstery_sofa', 'upholstery_chair', 'mattress_clean', 'carpet_steam_room', 'carpet_steam_unit', 'linen_change'],
  },
  {
    label: 'Deep Surface & Fixtures',
    ids: ['blinds_detail', 'curtain_dusting', 'full_wall_wash', 'ceiling_fan', 'grout_deep_clean', 'wine_fridge', 'fireplace_surround', 'bbq_exterior'],
  },
  {
    label: 'Windows & Exterior',
    ids: ['exterior_windows_ground', 'exterior_windows_elevated'],
  },
  {
    label: 'Convenience & Scheduling',
    ids: ['dishes', 'rush_booking', 'after_hours', 'key_pickup', 'eco_upgrade', 'pet_odor', 'sanitizing_pass'],
  },
];

// ---------- Package Tier Order ----------
// Index position used for includedFrom comparison.

export const PACKAGE_TIER_ORDER: PackageType[] = [
  'standard',
  'standard_plus',
  'deep_clean',
  'full_reset',
  'move_in_out',
];

// ---------- Display Labels ----------

export const PACKAGE_LABELS: Record<PackageType, string> = {
  standard: 'Standard Clean',
  standard_plus: 'Standard Plus',
  deep_clean: 'Deep Clean',
  full_reset: 'Full Reset',
  move_in_out: 'Move-In / Move-Out',
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  condo: 'Condo / Apartment',
  basement: 'Basement Apartment',
  house: 'House',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  biweekly: 'Bi-weekly',
  weekly: 'Weekly',
};

// ---------- Mapping to existing ServiceType enum ----------
// Maps the new PackageType to the existing ServiceType values in the DB.

export const PACKAGE_TO_SERVICE_TYPE: Record<PackageType, string> = {
  standard: 'standard_clean',
  standard_plus: 'standard_plus_clean',
  deep_clean: 'deep_clean',
  full_reset: 'reset_clean',
  move_in_out: 'move_in_clean',
};
