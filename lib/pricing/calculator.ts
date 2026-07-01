// ============================================================
// Sea of Blue — Quote Calculator
// Pure function: no side effects, no DB calls, no React.
// ============================================================

import {
  type PropertyType,
  type PackageType,
  type Frequency,
  type SizeBand,
  type AddOnDef,
  CONDO_RATES,
  BASEMENT_RATES,
  HOUSE_RATES,
  BATHROOM_ADJUSTMENT,
  FREQUENCY_DISCOUNT,
  ADD_ONS,
  PACKAGE_TIER_ORDER,
  PACKAGE_LABELS,
} from './constants';

// ---------- Input / Output Types ----------

export interface QuoteInput {
  propertyType: PropertyType;
  sqft: number;
  selectedPackage: PackageType;
  frequency: Frequency;
  fullBathrooms: number;
  halfBathrooms: number;
  /** Add-on IDs the rep has selected */
  selectedAddOnIds: string[];
  /** Manual price overrides for customQuoteOnly add-ons, keyed by add-on ID */
  customAddOnPrices: Record<string, number>;
  /** Quantity overrides for per-unit add-ons, keyed by add-on ID */
  addOnQuantities: Record<string, number>;
  /** For move_in_out: whether unit vacancy is confirmed */
  vacancyConfirmed?: boolean;
}

export interface AddOnLineItem {
  id: string;
  label: string;
  /** Resolved dollar amount, or 'included' if covered by package, or 'custom' if awaiting manual entry */
  price: number | 'included' | 'custom';
  quantity: number;
  /** If included, which package tier includes it */
  includedInPackage?: string;
  requiresSubcontractorCheck?: boolean;
  requiresLiabilitySignoff?: boolean;
}

export interface QuoteResult {
  /** Matched size band label (e.g. "2BR/2BA") */
  sizeBandLabel: string;
  /** Base price from the rate table, before any adjustments */
  basePrice: number | [number, number];
  /** Dollar amount added for extra bathrooms */
  bathroomAdjustment: number;
  /** Dollar amount subtracted for frequency discount (negative number) */
  frequencyDiscount: number | [number, number];
  /** Effective frequency discount percentage (e.g. -0.10) */
  frequencyDiscountPercent: number;
  /** Itemized add-ons */
  addOns: AddOnLineItem[];
  /** Total of priced add-ons (excludes included/custom) */
  addOnsTotal: number;
  /** Percentage-based surcharges (rush, after-hours) */
  percentageSurcharges: { id: string; label: string; percent: number; amount: number }[];
  /** Grand total */
  total: number | [number, number];
  /** True if the price is a range (hourly-billed house bands) */
  isRange: boolean;
  /** True if quote cannot be auto-priced (house ≥3000 sqft or unresolved custom add-ons) */
  requiresCustomQuote: boolean;
  /** Reason the quote requires custom pricing */
  customQuoteReason?: string;
  /** True if move_in_out is selected */
  requiresVacancyConfirmation: boolean;
  /** True if estimated hours >12 (large house on full_reset/move_in_out) */
  requires2PersonCrewFlag: boolean;
  /** Any unresolved custom-quote-only add-ons that still need manual price entry */
  unresolvedCustomAddOns: string[];
}

// ---------- Helpers ----------

function getRateTable(propertyType: PropertyType): SizeBand[] {
  switch (propertyType) {
    case 'condo': return CONDO_RATES;
    case 'basement': return BASEMENT_RATES;
    case 'house': return HOUSE_RATES;
  }
}

function resolveBand(table: SizeBand[], sqft: number): SizeBand | null {
  for (const band of table) {
    if (sqft >= band.sqftMin && (band.sqftMax === null || sqft < band.sqftMax)) {
      return band;
    }
  }
  return null;
}

function getPackagePrice(band: SizeBand, pkg: PackageType): number | [number, number] {
  switch (pkg) {
    case 'standard': return band.standard;
    case 'standard_plus': return band.standardPlus;
    case 'deep_clean': return band.deepClean;
    case 'full_reset': return band.fullReset;
    case 'move_in_out': return band.moveInOut;
  }
}

function getPackageTierIndex(pkg: PackageType): number {
  return PACKAGE_TIER_ORDER.indexOf(pkg);
}

function isIncludedInPackage(addOn: AddOnDef, selectedPackage: PackageType): boolean {
  if (!addOn.includedFrom) return false;
  const addOnTier = getPackageTierIndex(addOn.includedFrom);
  const selectedTier = getPackageTierIndex(selectedPackage);
  return selectedTier >= addOnTier;
}

// ---------- Main Calculator ----------

export function calculateQuote(input: QuoteInput): QuoteResult {
  const {
    propertyType,
    sqft,
    selectedPackage,
    frequency,
    fullBathrooms,
    halfBathrooms,
    selectedAddOnIds,
    customAddOnPrices,
    addOnQuantities,
  } = input;

  // ── Step 0: Check for 3000+ sqft house ──
  if (propertyType === 'house' && sqft >= 3000) {
    return {
      sizeBandLabel: '3,000+ sqft',
      basePrice: 0,
      bathroomAdjustment: 0,
      frequencyDiscount: 0,
      frequencyDiscountPercent: 0,
      addOns: [],
      addOnsTotal: 0,
      percentageSurcharges: [],
      total: 0,
      isRange: false,
      requiresCustomQuote: true,
      customQuoteReason: '3,000+ sqft house — site visit recommended',
      requiresVacancyConfirmation: selectedPackage === 'move_in_out',
      requires2PersonCrewFlag: false,
      unresolvedCustomAddOns: [],
    };
  }

  // ── Step 1: Resolve size band ──
  const table = getRateTable(propertyType);
  const band = resolveBand(table, sqft);

  if (!band) {
    return {
      sizeBandLabel: 'Unknown',
      basePrice: 0,
      bathroomAdjustment: 0,
      frequencyDiscount: 0,
      frequencyDiscountPercent: 0,
      addOns: [],
      addOnsTotal: 0,
      percentageSurcharges: [],
      total: 0,
      isRange: false,
      requiresCustomQuote: true,
      customQuoteReason: 'Could not match a size band for this property',
      requiresVacancyConfirmation: selectedPackage === 'move_in_out',
      requires2PersonCrewFlag: false,
      unresolvedCustomAddOns: [],
    };
  }

  // ── Step 2: Get base package price ──
  const rawBase = getPackagePrice(band, selectedPackage);
  const isRange = Array.isArray(rawBase);

  // ── Step 3: Bathroom adjustment ──
  const includedBaths = BATHROOM_ADJUSTMENT.includedBaths[propertyType];
  const totalBaths = fullBathrooms + halfBathrooms;
  const extraBaths = Math.max(0, totalBaths - includedBaths);
  // Calculate weighted: full baths cost $18 extra, half baths cost $9 extra.
  // Allocate extra from full baths first, then half baths.
  const extraFullBathsUsed = Math.max(0, Math.min(extraBaths, fullBathrooms - Math.max(0, includedBaths - halfBathrooms)));
  const extraHalfBathsUsed = Math.max(0, extraBaths - extraFullBathsUsed);

  // Simpler approach: count total baths, extras are priced as full if ≤ fullBathrooms count
  const extraFullBathCount = Math.max(0, fullBathrooms - includedBaths);
  const extraHalfBathCount = extraFullBathCount >= 0 ? halfBathrooms : Math.max(0, halfBathrooms - (includedBaths - fullBathrooms));

  const bathroomAdjustment =
    Math.max(0, extraFullBathCount) * BATHROOM_ADJUSTMENT.extraFullBath +
    Math.max(0, extraHalfBathCount) * BATHROOM_ADJUSTMENT.extraHalfBath;

  // ── Step 4: Frequency discount ──
  const frequencyApplies =
    (selectedPackage === 'standard' || selectedPackage === 'standard_plus') &&
    frequency !== 'one_time';
  const discountPercent = frequencyApplies ? FREQUENCY_DISCOUNT[frequency] : 0;

  let frequencyDiscount: number | [number, number] = 0;
  let priceAfterFrequency: number | [number, number];

  if (isRange) {
    // Range prices are always one-time packages, no frequency discount
    const [min, max] = rawBase as [number, number];
    priceAfterFrequency = [min + bathroomAdjustment, max + bathroomAdjustment];
  } else {
    const baseWithBath = (rawBase as number) + bathroomAdjustment;
    if (frequencyApplies) {
      const discounted = baseWithBath * (1 + discountPercent);
      frequencyDiscount = discounted - baseWithBath; // negative number
      priceAfterFrequency = discounted;
    } else {
      priceAfterFrequency = baseWithBath;
    }
  }

  // ── Step 5: Add-ons ──
  const addOnLineItems: AddOnLineItem[] = [];
  let addOnsTotal = 0;
  const percentageAddOns: { id: string; label: string; percent: number }[] = [];
  const unresolvedCustomAddOns: string[] = [];

  for (const addOnId of selectedAddOnIds) {
    const def = ADD_ONS.find((a) => a.id === addOnId);
    if (!def) continue;

    const quantity = addOnQuantities[addOnId] || 1;

    // Check if included in the selected package
    if (isIncludedInPackage(def, selectedPackage)) {
      addOnLineItems.push({
        id: def.id,
        label: def.label,
        price: 'included',
        quantity,
        includedInPackage: PACKAGE_LABELS[def.includedFrom!],
      });
      continue;
    }

    // Percentage-based (rush, after-hours) — defer until we have the subtotal
    if (def.percentOfTotal) {
      percentageAddOns.push({ id: def.id, label: def.label, percent: def.percentOfTotal });
      continue;
    }

    // Custom-quote-only
    if (def.customQuoteOnly) {
      const manualPrice = customAddOnPrices[def.id];
      if (manualPrice !== undefined && manualPrice > 0) {
        addOnLineItems.push({
          id: def.id,
          label: def.label,
          price: manualPrice * quantity,
          quantity,
          requiresSubcontractorCheck: def.requiresSubcontractorCheck,
          requiresLiabilitySignoff: def.requiresLiabilitySignoff,
        });
        addOnsTotal += manualPrice * quantity;
      } else {
        unresolvedCustomAddOns.push(def.id);
        addOnLineItems.push({
          id: def.id,
          label: def.label,
          price: 'custom',
          quantity,
          requiresSubcontractorCheck: def.requiresSubcontractorCheck,
          requiresLiabilitySignoff: def.requiresLiabilitySignoff,
        });
      }
      continue;
    }

    // Standard priced add-on
    const unitPrice = def.price!;
    addOnLineItems.push({
      id: def.id,
      label: def.label,
      price: unitPrice * quantity,
      quantity,
      requiresSubcontractorCheck: def.requiresSubcontractorCheck,
    });
    addOnsTotal += unitPrice * quantity;
  }

  // ── Step 5b: Percentage-based surcharges ──
  const percentageSurcharges: QuoteResult['percentageSurcharges'] = [];

  if (percentageAddOns.length > 0) {
    // Compute the subtotal before percentage surcharges
    if (isRange) {
      const [min, max] = priceAfterFrequency as [number, number];
      for (const pctAddon of percentageAddOns) {
        const amountMin = Math.round((min + addOnsTotal) * pctAddon.percent * 100) / 100;
        const amountMax = Math.round((max + addOnsTotal) * pctAddon.percent * 100) / 100;
        // Use the max for the surcharge line item (conservative)
        percentageSurcharges.push({
          id: pctAddon.id,
          label: pctAddon.label,
          percent: pctAddon.percent,
          amount: amountMax,
        });
        addOnsTotal += amountMax;
      }
    } else {
      const subtotal = (priceAfterFrequency as number) + addOnsTotal;
      for (const pctAddon of percentageAddOns) {
        const amount = Math.round(subtotal * pctAddon.percent * 100) / 100;
        percentageSurcharges.push({
          id: pctAddon.id,
          label: pctAddon.label,
          percent: pctAddon.percent,
          amount,
        });
        addOnsTotal += amount;
      }
    }
  }

  // ── Step 6: Total ──
  let total: number | [number, number];
  if (isRange) {
    const [min, max] = priceAfterFrequency as [number, number];
    total = [
      Math.round((min + addOnsTotal) * 100) / 100,
      Math.round((max + addOnsTotal) * 100) / 100,
    ];
  } else {
    total = Math.round(((priceAfterFrequency as number) + addOnsTotal) * 100) / 100;
  }

  // ── Flags ──
  const requires2PersonCrewFlag =
    propertyType === 'house' &&
    sqft >= 2500 &&
    (selectedPackage === 'full_reset' || selectedPackage === 'move_in_out');

  return {
    sizeBandLabel: band.label,
    basePrice: rawBase,
    bathroomAdjustment,
    frequencyDiscount,
    frequencyDiscountPercent: discountPercent,
    addOns: addOnLineItems,
    addOnsTotal,
    percentageSurcharges,
    total,
    isRange,
    requiresCustomQuote: unresolvedCustomAddOns.length > 0,
    requiresVacancyConfirmation: selectedPackage === 'move_in_out',
    requires2PersonCrewFlag,
    unresolvedCustomAddOns,
  };
}
