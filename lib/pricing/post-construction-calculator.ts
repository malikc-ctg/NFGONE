// ============================================================
// Sea of Blue — Post-Construction Cleaning Calculator
// Pure functions: no side effects, no DB calls, no React.
// ============================================================

export type PostConstructionStage = 'rough' | 'final' | 'touch_up' | 'two_phase';

export interface PostConstructionInput {
  sqft: number;
  stage: PostConstructionStage;
  isCommercial?: boolean;
  /** Add-ons */
  windowScrapingCount?: number; // per window
  hvacVentsClean?: boolean;
  insideCabinetsDetail?: boolean;
  debrisHaulaway?: boolean;
}

export interface PostConstructionResult {
  sqft: number;
  stage: PostConstructionStage;
  basePrice: number;
  stageMultiplier: number;
  stagePrice: number;
  addOnsTotal: number;
  addOnBreakdown: { id: string; label: string; price: number }[];
  total: number;
  estimatedHours: number;
}

const RATE_PER_SQFT = 0.45;
const MINIMUM_PRICE = 350;
const WINDOW_SCRAPING_RATE = 12; // per window
const HVAC_VENTS_RATE = 45;
const INSIDE_CABINETS_RATE = 65;
const DEBRIS_HAULAWAY_RATE = 150;

const STAGE_MULTIPLIERS: Record<PostConstructionStage, number> = {
  rough: 0.85,
  final: 1.0,
  touch_up: 0.65,
  two_phase: 1.65, // Rough clean + Final post-trade clean
};

export const POST_CONSTRUCTION_STAGE_LABELS: Record<PostConstructionStage, { label: string; desc: string }> = {
  rough: { label: 'Rough Clean', desc: 'Post-framing / drywall debris pickup, rough sweep, vacuum' },
  final: { label: 'Final Clean', desc: 'Top-to-bottom detailed scrub, dust removal, ready for handover' },
  touch_up: { label: 'Touch-Up Clean', desc: 'Pre-inspection fluff & buff after trade touch-ups' },
  two_phase: { label: '2-Phase Package', desc: 'Comprehensive Rough Clean + Final Handover Clean' },
};

export function calcPostConstruction(input: PostConstructionInput): PostConstructionResult {
  const {
    sqft,
    stage = 'final',
    windowScrapingCount = 0,
    hvacVentsClean = false,
    insideCabinetsDetail = false,
    debrisHaulaway = false,
  } = input;

  const validSqft = Math.max(0, sqft);
  const rawSqftPrice = validSqft * RATE_PER_SQFT;
  const stageMultiplier = STAGE_MULTIPLIERS[stage] || 1.0;
  
  // Calculate base price subject to minimum
  const calculatedBase = Math.round(rawSqftPrice * stageMultiplier * 100) / 100;
  const stagePrice = Math.max(MINIMUM_PRICE, calculatedBase);

  // Add-ons
  const addOnBreakdown: { id: string; label: string; price: number }[] = [];

  if (windowScrapingCount > 0) {
    const price = windowScrapingCount * WINDOW_SCRAPING_RATE;
    addOnBreakdown.push({
      id: 'window_scraping',
      label: `Window Paint/Sticker Scraping (${windowScrapingCount} windows)`,
      price,
    });
  }

  if (hvacVentsClean) {
    addOnBreakdown.push({
      id: 'hvac_vents',
      label: 'HVAC Vent Grills & Fine Dust Extraction',
      price: HVAC_VENTS_RATE,
    });
  }

  if (insideCabinetsDetail) {
    addOnBreakdown.push({
      id: 'inside_cabinets',
      label: 'Inside Millwork, Cabinets & Drawers Vacuum/Wipe',
      price: INSIDE_CABINETS_RATE,
    });
  }

  if (debrisHaulaway) {
    addOnBreakdown.push({
      id: 'debris_haulaway',
      label: 'Construction Debris Bagging & Haulaway',
      price: DEBRIS_HAULAWAY_RATE,
    });
  }

  const addOnsTotal = addOnBreakdown.reduce((sum, item) => sum + item.price, 0);
  const total = Math.round((stagePrice + addOnsTotal) * 100) / 100;

  // Estimated labor hours: roughly 350-450 sqft per labor hour for construction final clean
  const estimatedHours = Math.max(3, Math.round((validSqft / 350) * stageMultiplier * 10) / 10);

  return {
    sqft: validSqft,
    stage,
    basePrice: rawSqftPrice,
    stageMultiplier,
    stagePrice,
    addOnsTotal,
    addOnBreakdown,
    total,
    estimatedHours,
  };
}
