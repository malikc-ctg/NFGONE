// ============================================================
// Sea of Blue — Commercial Cleaning Calculators
// Pure functions: no side effects, no DB calls, no React.
// ============================================================

// ----------------------------------------------------------------
// Service 3: Commercial Strip and Wax
// ----------------------------------------------------------------

const STRIP_WAX_RATE_PER_SQFT = 0.55;
const STRIP_WAX_MINIMUM       = 300;

export interface StripAndWaxInput {
  sqft: number;
  /** When true, also calculate burnish & maintenance wax as a recurring add-on */
  burnishAddon: boolean;
}

export interface StripAndWaxResult {
  /** One-time strip and wax total (after minimum) */
  stripTotal: number;
  /** Burnish & maintenance wax — low end of recurring band (null when not selected) */
  burnishLow: number | null;
  /** Burnish & maintenance wax — high end of recurring band (null when not selected) */
  burnishHigh: number | null;
}

/**
 * Calculates the commercial strip and wax price.
 * Reference: 3,400 sqft → 3400 × 0.55 = 1,870.
 */
export function calcStripAndWax(input: StripAndWaxInput): StripAndWaxResult {
  const { sqft, burnishAddon } = input;

  const rawStrip   = sqft > 0 ? Math.round(sqft * STRIP_WAX_RATE_PER_SQFT * 100) / 100 : 0;
  const stripTotal = Math.max(STRIP_WAX_MINIMUM, rawStrip);

  let burnishLow: number | null  = null;
  let burnishHigh: number | null = null;

  if (burnishAddon && sqft > 0) {
    burnishLow  = Math.round(sqft * 0.15 * 100) / 100;
    burnishHigh = Math.round(sqft * 0.25 * 100) / 100;
  }

  return { stripTotal, burnishLow, burnishHigh };
}

// ----------------------------------------------------------------
// Service 4: Commercial Cleaning (Office Janitorial)
// ----------------------------------------------------------------

/** Weeks per month constant used in monthly total calculation */
const WEEKS_PER_MONTH = 4.33;

export type CommercialCleaningComplexity = 'small' | 'medium' | 'large';
export type CommercialCleaningFrequency  = '1x' | '2x' | '3x' | 'daily';

const COMPLEXITY_RATES: Record<CommercialCleaningComplexity, number> = {
  small:  0.11,
  medium: 0.15,
  large:  0.22,
};

interface FrequencyConfig {
  visitsPerWeek: number;
  /** Discount applied to per-visit price (e.g. 0.05 = 5%) */
  discount: number;
}

const FREQUENCY_CONFIG: Record<CommercialCleaningFrequency, FrequencyConfig> = {
  '1x':    { visitsPerWeek: 1, discount: 0.00 },
  '2x':    { visitsPerWeek: 2, discount: 0.05 },
  '3x':    { visitsPerWeek: 3, discount: 0.10 },
  'daily': { visitsPerWeek: 5, discount: 0.15 },
};

export interface CommercialCleaningInput {
  sqft: number;
  complexity: CommercialCleaningComplexity;
  frequency: CommercialCleaningFrequency;
  /** Units of 1,000 sqft needing carpet extraction (recurring add-on) */
  carpetExtractionUnits: number;
  /** Kitchen deep clean one-time add-on */
  kitchenDeepClean: boolean;
  /** Interior ground-accessible window cleaning one-time add-on */
  windowCleaning: boolean;
  /** Square footage for post-construction / move-in deep clean (one-time) */
  postConstructionSqft: number;
  /** After-hours service (6pm–11pm): +20% on per-visit, recurring */
  afterHours: boolean;
  /** Emergency / rush same-day: +30% on per-visit, shown as one-time note */
  rushSameDay: boolean;
}

export interface CommercialCleaningAddOnLine {
  label: string;
  amountLow: number;
  amountHigh: number;
  isRange: boolean;
  /** One-time add-ons are not folded into the monthly recurring total */
  isOneTime: boolean;
}

export interface CommercialCleaningResult {
  /** sqft × complexityRate, before any discounts or surcharges */
  basePerVisit: number;
  /** basePerVisit after frequency discount, before surcharges — used as the display per-visit figure */
  adjustedPerVisit: number;
  /** adjustedPerVisit after after-hours surcharge (if applicable) */
  perVisitWithSurcharges: number;
  /** perVisitWithSurcharges × visitsPerWeek */
  weeklyTotal: number;
  /** weeklyTotal × WEEKS_PER_MONTH */
  monthlyTotal: number;
  /** monthlyTotal plus any recurring add-on lower bounds */
  monthlyWithRecurringAddOns: number;
  addOnLines: CommercialCleaningAddOnLine[];
  /** Rush surcharge for one visit (not included in monthlyTotal) */
  rushSurcharge: number;
}

/**
 * Calculates the commercial (office janitorial) cleaning price.
 *
 * Calculation order per spec:
 *   basePerVisit     = sqft × complexityRate
 *   adjustedPerVisit = basePerVisit × (1 − frequencyDiscount)
 *   weeklyTotal      = adjustedPerVisit × visitsPerWeek  [after-hours applied here]
 *   monthlyTotal     = weeklyTotal × WEEKS_PER_MONTH (4.33)
 *
 * After-hours (+20%) applies to the per-visit total before frequency multiplication
 * and recurs in the monthly figure.
 * Rush (+30%) applies to a single visit and is shown separately — not in monthly.
 */
export function calcCommercialCleaning(input: CommercialCleaningInput): CommercialCleaningResult {
  const {
    sqft, complexity, frequency,
    carpetExtractionUnits, kitchenDeepClean, windowCleaning,
    postConstructionSqft, afterHours, rushSameDay,
  } = input;

  const complexityRate            = COMPLEXITY_RATES[complexity];
  const { visitsPerWeek, discount } = FREQUENCY_CONFIG[frequency];

  // ── Core calculation (per spec formula) ──
  const basePerVisit     = sqft > 0 ? Math.round(sqft * complexityRate * 100) / 100 : 0;
  const adjustedPerVisit = Math.round(basePerVisit * (1 - discount) * 100) / 100;

  // After-hours is a recurring per-visit surcharge; applied before frequency multiplication
  const perVisitWithSurcharges = afterHours
    ? Math.round(adjustedPerVisit * 1.20 * 100) / 100
    : adjustedPerVisit;

  const weeklyTotal  = Math.round(perVisitWithSurcharges * visitsPerWeek    * 100) / 100;
  const monthlyTotal = Math.round(weeklyTotal            * WEEKS_PER_MONTH * 100) / 100;

  // Rush is one-time only — shown as a separate note, not in monthly
  const rushSurcharge = rushSameDay
    ? Math.round(adjustedPerVisit * 0.30 * 100) / 100
    : 0;

  // ── Add-on lines ──
  const addOnLines: CommercialCleaningAddOnLine[] = [];
  let recurringAddOnLow = 0;

  if (carpetExtractionUnits > 0) {
    const lo = carpetExtractionUnits * 150;
    const hi = carpetExtractionUnits * 200;
    addOnLines.push({
      label: `Carpet extraction (${carpetExtractionUnits} × 1,000 sqft)`,
      amountLow: lo, amountHigh: hi, isRange: true, isOneTime: false,
    });
    recurringAddOnLow += lo;
  }

  if (kitchenDeepClean) {
    addOnLines.push({
      label: 'Kitchen deep clean',
      amountLow: 200, amountHigh: 400, isRange: true, isOneTime: true,
    });
  }

  if (windowCleaning) {
    addOnLines.push({
      label: 'Window cleaning (interior ground-accessible)',
      amountLow: 100, amountHigh: 300, isRange: true, isOneTime: true,
    });
  }

  if (postConstructionSqft > 0) {
    const lo = Math.round(postConstructionSqft * 0.25 * 100) / 100;
    const hi = Math.round(postConstructionSqft * 0.65 * 100) / 100;
    addOnLines.push({
      label: `Post-construction / move-in deep clean (${postConstructionSqft} sqft)`,
      amountLow: lo, amountHigh: hi, isRange: true, isOneTime: true,
    });
  }

  const monthlyWithRecurringAddOns = Math.round((monthlyTotal + recurringAddOnLow) * 100) / 100;

  return {
    basePerVisit,
    adjustedPerVisit,
    perVisitWithSurcharges,
    weeklyTotal,
    monthlyTotal,
    monthlyWithRecurringAddOns,
    addOnLines,
    rushSurcharge,
  };
}
