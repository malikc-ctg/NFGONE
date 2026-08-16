// ============================================================
// Sea of Blue — Carpet Cleaning Calculators
// Pure functions: no side effects, no DB calls, no React.
// ============================================================

// ----------------------------------------------------------------
// Service 1: Residential Carpet Cleaning
// ----------------------------------------------------------------

export type ResidentialCarpetTier = 'standard' | 'premium';

const RESIDENTIAL_CARPET_MINIMUM = 70;

const RESIDENTIAL_CARPET_STD_RATES = {
  bedroom:    60,
  livingRoom: 60,
  basement:   60,
  hallway:    40,
  stairs:     30,
  stairsHalf: 15,
} as const;

const RESIDENTIAL_CARPET_PREM_RATES = {
  bedroom:    75,
  livingRoom: 75,
  basement:   75,
  hallway:    50,
  stairs:     30,
  stairsHalf: 15,
} as const;

export interface ResidentialCarpetInput {
  tier: ResidentialCarpetTier;
  bedrooms: number;
  livingRooms: number;
  basementRooms: number;
  hallways: number;
  stairsFlights: number;
  stairsHalfFlights: number;
  /** Quantity of small area rugs (up to 5×7) */
  rugSmall: number;
  /** Quantity of medium area rugs (up to 8×10) */
  rugMedium: number;
  /** Quantity of large area rugs (9×12+) */
  rugLarge: number;
  /** Number of pet stain/odor spots */
  petSpots: number;
  /** True when this carpet job is its own standalone appointment */
  dispatchFee: boolean;
}

export interface ResidentialCarpetAddOnLine {
  label: string;
  amount: number | [number, number];
  isRange: boolean;
}

export interface ResidentialCarpetResult {
  /** Room subtotal, after minimum applied, before add-ons */
  roomTotal: number;
  /** True for premium tier or if large rugs are selected (quotes as a band) */
  isRange: boolean;
  addOnLines: ResidentialCarpetAddOnLine[];
  /** Grand total including add-ons */
  total: number | [number, number];
}

export function calcResidentialCarpet(input: ResidentialCarpetInput): ResidentialCarpetResult {
  const {
    tier, bedrooms, livingRooms, basementRooms, hallways, stairsFlights, stairsHalfFlights,
    rugSmall, rugMedium, rugLarge, petSpots, dispatchFee,
  } = input;

  // ── Room subtotal ──
  let roomLow  = 0;
  let roomHigh = 0;

  if (tier === 'standard') {
    const r = RESIDENTIAL_CARPET_STD_RATES;
    roomLow =
      bedrooms          * r.bedroom    +
      livingRooms       * r.livingRoom +
      basementRooms     * r.basement   +
      hallways          * r.hallway    +
      stairsFlights     * r.stairs     +
      stairsHalfFlights * r.stairsHalf;
    roomHigh = roomLow;
  } else {
    const r = RESIDENTIAL_CARPET_PREM_RATES;
    roomLow =
      bedrooms          * r.bedroom    +
      livingRooms       * r.livingRoom +
      basementRooms     * r.basement   +
      hallways          * r.hallway    +
      stairsFlights     * r.stairs     +
      stairsHalfFlights * r.stairsHalf;
    roomHigh = roomLow;
  }

  // Apply minimum to room total.
  roomLow  = Math.max(RESIDENTIAL_CARPET_MINIMUM, roomLow);
  roomHigh = Math.max(RESIDENTIAL_CARPET_MINIMUM, roomHigh);

  const roomTotal: number = roomLow;

  // ── Add-ons (not subject to tier multiplier, not subject to room minimum) ──
  const addOnLines: ResidentialCarpetAddOnLine[] = [];
  let addLow  = 0;
  let addHigh = 0;

  if (rugSmall > 0) {
    const amt = rugSmall * 60;
    addOnLines.push({ label: `Area rug, small ×${rugSmall}`, amount: amt, isRange: false });
    addLow += amt; addHigh += amt;
  }
  if (rugMedium > 0) {
    const amt = rugMedium * 85;
    addOnLines.push({ label: `Area rug, medium ×${rugMedium}`, amount: amt, isRange: false });
    addLow += amt; addHigh += amt;
  }
  if (rugLarge > 0) {
    const lo = rugLarge * 110;
    const hi = rugLarge * 130;
    addOnLines.push({ label: `Area rug, large ×${rugLarge}`, amount: [lo, hi], isRange: true });
    addLow += lo; addHigh += hi;
  }
  if (petSpots > 0) {
    const amt = petSpots * 18;
    addOnLines.push({ label: `Pet stain/odor treatment ×${petSpots} spots`, amount: amt, isRange: false });
    addLow += amt; addHigh += amt;
  }
  if (dispatchFee) {
    addOnLines.push({ label: 'Standalone dispatch fee', amount: 40, isRange: false });
    addLow += 40; addHigh += 40;
  }

  const totalLow  = Math.round((roomLow  + addLow)  * 100) / 100;
  const totalHigh = Math.round((roomHigh + addHigh) * 100) / 100;
  const isRange   = totalLow !== totalHigh;
  const total: number | [number, number] = isRange ? [totalLow, totalHigh] : totalLow;

  return { roomTotal, isRange, addOnLines, total };
}

// ----------------------------------------------------------------
// Service 2: Commercial Carpet Cleaning
// ----------------------------------------------------------------

export type CommercialCarpetTier = 'standard' | 'premium';

const COMMERCIAL_CARPET_MIN_STANDARD = 200;
const COMMERCIAL_CARPET_MIN_PREMIUM  = 300;

interface CommercialCarpetBracket {
  /** Lower bound (inclusive) */
  min: number;
  /** Upper bound (exclusive). Infinity for the last bracket. */
  max: number;
  standardRate: number;
  premiumRate: number;
}

const COMMERCIAL_CARPET_BRACKETS: CommercialCarpetBracket[] = [
  { min: 0,    max: 1000,     standardRate: 0.70, premiumRate: 0.80 },
  { min: 1000, max: 3000,     standardRate: 0.65, premiumRate: 0.75 },
  { min: 3000, max: 6000,     standardRate: 0.60, premiumRate: 0.70 },
  { min: 6000, max: Infinity, standardRate: 0.55, premiumRate: 0.65 },
];

export interface CommercialCarpetInput {
  tier: CommercialCarpetTier;
  sqft: number;
}

export interface CommercialCarpetResult {
  total: number;
  /** The per-sqft rate applied in this bracket */
  rate: number;
  /** True when the monotonic guard raised the price above the naive bracket calculation */
  guardApplied: boolean;
}

/**
 * Calculates the commercial carpet cleaning price using a tiered sqft rate
 * with a monotonic price guard to prevent the price cliff at bracket boundaries.
 *
 * Guard formula:
 *   total = max(sqft × currentRate, (currentBracketMin − 1) × prevRate)
 */
export function calcCommercialCarpet(input: CommercialCarpetInput): CommercialCarpetResult {
  const { tier, sqft } = input;

  if (sqft <= 0) {
    return { total: 0, rate: 0, guardApplied: false };
  }

  // Find the applicable bracket — first bracket where sqft < bracket.max
  const bracketIndex = COMMERCIAL_CARPET_BRACKETS.findIndex((b) => sqft < b.max);
  const bracket      = COMMERCIAL_CARPET_BRACKETS[bracketIndex];
  const currentRate  = tier === 'standard' ? bracket.standardRate : bracket.premiumRate;

  let total        = sqft * currentRate;
  let guardApplied = false;

  // Monotonic price guard for all brackets after the first
  if (bracketIndex > 0) {
    const prevBracket = COMMERCIAL_CARPET_BRACKETS[bracketIndex - 1];
    const prevRate    = tier === 'standard' ? prevBracket.standardRate : prevBracket.premiumRate;
    const guardFloor  = (bracket.min - 1) * prevRate;
    if (guardFloor > total) {
      total        = guardFloor;
      guardApplied = true;
    }
  }

  // Apply service minimum after the monotonic guard
  const minimum = tier === 'standard' ? COMMERCIAL_CARPET_MIN_STANDARD : COMMERCIAL_CARPET_MIN_PREMIUM;
  total = Math.max(total, minimum);

  return { total: Math.round(total * 100) / 100, rate: currentRate, guardApplied };
}
