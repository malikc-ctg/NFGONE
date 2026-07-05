const fs = require('fs');

const CODE = `// ============================================================
// Sea of Blue — Scope of Work Generator
// Generates customer-facing quote + scope of work text.
// ============================================================

import {
  type PackageType,
  type Frequency,
  type PropertyType,
  PACKAGE_LABELS,
  PROPERTY_TYPE_LABELS,
  FREQUENCY_LABELS,
} from './constants';
import type { QuoteResult } from './calculator';

// ---------- Scope of Work Flattened Engine ----------

type RoomCategory = 'KITCHEN' | 'BATHROOMS' | 'BEDROOMS' | 'LIVING AREAS' | 'GENERAL';
type ScopeItems = Record<RoomCategory, string[]>;

const STANDARD_ITEMS: ScopeItems = {
  KITCHEN: [
    'Wipe down countertops, stovetop, and exterior of appliances',
    'Clean and sanitize sink',
    'Spot-clean cabinet fronts',
    'Wipe small appliances (microwave exterior, toaster, etc.)',
    'Sweep and mop floors',
  ],
  BATHROOMS: [
    'Scrub and sanitize toilet, tub/shower, and sink',
    'Clean mirrors',
    'Wipe countertops and fixtures',
    'Sweep and mop floors',
  ],
  BEDROOMS: [
    'Dust all accessible surfaces (nightstands, dressers, shelves)',
    'Make beds (straighten linens)',
    'Vacuum or sweep floors',
  ],
  'LIVING AREAS': [
    'Dust furniture, shelves, and décor',
    'Vacuum upholstered furniture (surface)',
    'Vacuum, sweep, or mop all floors',
  ],
  GENERAL: [
    'Empty all trash and replace liners',
    'Wipe light switches and door handles',
    'Spot-clean visible marks on walls',
  ],
};

const STANDARD_PLUS_ADDITIONS: ScopeItems = {
  KITCHEN: [
    'Wipe inside microwave',
    'Clean backsplash tile',
    'Detail-clean stovetop (drip pans, knobs)',
    'Wipe down baseboards',
  ],
  BATHROOMS: [
    'Scrub grout lines in shower/tub area',
    'Clean baseboards',
    'Wipe cabinet fronts',
  ],
  BEDROOMS: [
    'Dust ceiling fan blades (if reachable)',
    'Dust baseboards',
    'Vacuum under beds (if accessible)',
  ],
  'LIVING AREAS': [
    'Dust blinds (surface dusting)',
    'Dust baseboards throughout',
    'Detail-dust shelving and décor',
  ],
  GENERAL: [
    'Wipe all baseboards throughout the home',
    'Dust air vents/returns (accessible)',
  ],
};

const DEEP_CLEAN_ADDITIONS: ScopeItems = {
  KITCHEN: [
    'Clean inside oven (included)',
    'Clean inside fridge (included)',
    'Degrease range hood and filter',
    'Deep-clean sink and fixtures (descale)',
  ],
  BATHROOMS: [
    'Descale showerhead, faucets, and fixtures',
    'Deep-scrub tile and grout',
    'Clean exhaust fan cover',
    'Wipe light fixtures',
  ],
  BEDROOMS: [
    'Dust and wipe closet shelves (exterior)',
    'Thorough dusting of all surfaces and décor',
    'Wipe window sills',
  ],
  'LIVING AREAS': [
    'Wipe window sills and ledges',
    'Detail-clean all décor and shelving',
    'Move small furniture to vacuum beneath',
  ],
  GENERAL: [
    'Clean all light fixtures (reachable)',
    'Wipe door frames',
    'Deep vacuum all carpets/rugs',
  ],
};

const FULL_RESET_ADDITIONS: ScopeItems = {
  KITCHEN: [
    'Clean inside all cabinets and drawers (empty)',
    'Clean interior windows',
    'Clean balcony/patio door tracks',
    'Wipe inside pantry shelving',
  ],
  BATHROOMS: [
    'Clean inside all cabinets and drawers',
    'Clean interior windows',
    'Wipe medicine cabinet interior',
    'Sanitize toothbrush holders and soap dispensers',
  ],
  BEDROOMS: [
    'Clean inside closets (shelves, rods, floors)',
    'Clean interior windows',
    'Wipe window tracks',
  ],
  'LIVING AREAS': [
    'Clean interior windows throughout',
    'Clean balcony/patio (if applicable, included)',
    'Wipe all accessible light fixtures and chandeliers',
  ],
  GENERAL: [
    'Full baseboard detail throughout',
    'Interior window cleaning throughout',
    'Clean all door frames, trim, and mouldings',
    'Garage sweep (if applicable, included)',
  ],
};

const MOVE_IN_OUT_ADDITIONS: ScopeItems = {
  KITCHEN: [
    'Clean inside all cabinets, drawers, and pantry',
    'Clean inside all appliances (oven, fridge, dishwasher, microwave)',
    'Degrease and detail exhaust hood interior',
    'Clean behind and under appliances (if accessible)',
    'Clean all fixtures, handles, and hardware',
  ],
  BATHROOMS: [
    'Sanitize all surfaces for new occupant',
    'Clean inside all cabinets and drawers',
    'Clean behind toilet',
    'Descale and polish all fixtures',
    'Clean tile grout lines thoroughly',
  ],
  BEDROOMS: [
    'Clean inside all closets, shelves, and rods',
    'Wipe all walls (spot-clean for scuffs and marks)',
    'Clean window sills, tracks, and frames',
    'Dust/clean all lighting fixtures',
  ],
  'LIVING AREAS': [
    'Wipe all walls (spot-clean for scuffs and marks)',
    'Clean all interior windows, tracks, and sills',
    'Clean all light switches, outlets, and cover plates',
    'Clean fireplace surround (if applicable)',
  ],
  GENERAL: [
    'Full wall spot-cleaning throughout',
    'All closets cleaned inside and out',
    'All windows and tracks cleaned',
    'Full sanitizing pass',
    'Unit must be fully vacant for this service',
  ],
};

function flattenScopeText(tiers: ScopeItems[], notIncluded: string, requires?: string): string {
  const rooms: RoomCategory[] = ['KITCHEN', 'BATHROOMS', 'BEDROOMS', 'LIVING AREAS', 'GENERAL'];
  const lines: string[] = [];

  for (const room of rooms) {
    lines.push(room);
    for (const tier of tiers) {
      if (tier[room]) {
        for (const item of tier[room]) {
          lines.push(\`• \${item}\`);
        }
      }
    }
    lines.push(''); // blank line
  }

  lines.push(\`NOT INCLUDED: \${notIncluded}\`);
  if (requires) {
    lines.push('');
    lines.push(\`REQUIRES: \${requires}\`);
  }

  return lines.join('\\n');
}

const SCOPE_STANDARD = flattenScopeText(
  [STANDARD_ITEMS],
  'Inside oven, inside fridge, interior windows, inside cabinets, baseboards detail, wall washing'
);

const SCOPE_STANDARD_PLUS = flattenScopeText(
  [STANDARD_ITEMS, STANDARD_PLUS_ADDITIONS],
  'Inside oven, inside fridge, interior windows, inside cabinets, wall washing'
);

const SCOPE_DEEP_CLEAN = flattenScopeText(
  [STANDARD_ITEMS, STANDARD_PLUS_ADDITIONS, DEEP_CLEAN_ADDITIONS],
  'Inside cabinets, interior windows, wall washing, balcony'
);

const SCOPE_FULL_RESET = flattenScopeText(
  [STANDARD_ITEMS, STANDARD_PLUS_ADDITIONS, DEEP_CLEAN_ADDITIONS, FULL_RESET_ADDITIONS],
  'Wall washing (available as add-on), exterior windows'
);

const SCOPE_MOVE_IN_OUT = flattenScopeText(
  [STANDARD_ITEMS, STANDARD_PLUS_ADDITIONS, DEEP_CLEAN_ADDITIONS, FULL_RESET_ADDITIONS, MOVE_IN_OUT_ADDITIONS],
  'Exterior windows',
  'Unit must be fully vacant. If occupied, switch to Full Reset.'
);

const SCOPE_MAP: Record<PackageType, string> = {
  standard: SCOPE_STANDARD,
  standard_plus: SCOPE_STANDARD_PLUS,
  deep_clean: SCOPE_DEEP_CLEAN,
  full_reset: SCOPE_FULL_RESET,
  move_in_out: SCOPE_MOVE_IN_OUT,
};

// ---------- Generator ----------

export interface ScopeOfWorkInput {
  customerName: string;
  propertyType: PropertyType;
  sizeBandLabel: string;
  selectedPackage: PackageType;
  frequency: Frequency;
  quote: QuoteResult;
  vacancyConfirmed?: boolean;
  bedrooms?: number;
  bathrooms?: number;
}

export function generateScopeOfWork(input: ScopeOfWorkInput): string {
  const {
    customerName,
    propertyType,
    sizeBandLabel,
    selectedPackage,
    frequency,
    quote,
    vacancyConfirmed,
    bedrooms,
    bathrooms,
  } = input;

  const packageLabel = PACKAGE_LABELS[selectedPackage];
  const propertyLabel = PROPERTY_TYPE_LABELS[propertyType];

  let propertySummary = \`\${propertyLabel}, \${sizeBandLabel}\`;
  if (bedrooms !== undefined && bathrooms !== undefined) {
    // For houses, sizeBandLabel is sqft (e.g. "1,000-1,500 sqft"), so explicitly add bed/bath.
    // For condos/basements, sizeBandLabel is already bed/bath (e.g. "1BR/1BA"), but appending it makes it completely clear.
    propertySummary = \`\${propertyLabel} (\${bedrooms} Bed / \${bathrooms} Bath), \${sizeBandLabel}\`;
  }

  // Price line
  let priceLine: string;
  if (quote.requiresCustomQuote && quote.total === 0) {
    priceLine = 'Price: Custom quote — to be confirmed after assessment';
  } else if (quote.isRange) {
    const [min, max] = quote.total as [number, number];
    priceLine = \`Estimated price: $\${min.toFixed(2)}–$\${max.toFixed(2)}, final price confirmed once our team assesses the property on arrival\`;
  } else {
    const total = quote.total as number;
    const suffix =
      frequency !== 'one_time'
        ? \` / per visit\`
        : '';
    priceLine = \`Price: $\${total.toFixed(2)}\${suffix}\`;
  }

  // Frequency line
  const frequencyLine =
    frequency !== 'one_time'
      ? \`Frequency: \${FREQUENCY_LABELS[frequency]}\`
      : '';

  // Add-ons list
  const pricedAddOns = quote.addOns.filter((a) => typeof a.price === 'number');
  const includedAddOns = quote.addOns.filter((a) => a.price === 'included');
  let addOnsSection: string;

  if (pricedAddOns.length === 0 && quote.percentageSurcharges.length === 0) {
    addOnsSection = 'None';
  } else {
    const lines: string[] = [];
    for (const a of pricedAddOns) {
      const qtyLabel = a.quantity > 1 ? \` (×\${a.quantity})\` : '';
      lines.push(\`- \${a.label}\${qtyLabel}: $\${(a.price as number).toFixed(2)}\`);
    }
    for (const s of quote.percentageSurcharges) {
      lines.push(\`- \${s.label} (\${(s.percent * 100).toFixed(1)}%): $\${s.amount.toFixed(2)}\`);
    }
    addOnsSection = lines.join('\\n');
  }

  // Scope of work body
  const scopeBody = SCOPE_MAP[selectedPackage];

  // Vacancy confirmation line
  const vacancyLine =
    selectedPackage === 'move_in_out' && vacancyConfirmed
      ? '\\nConfirmed vacant unit service.'
      : '';

  const output = \`Hi \${customerName || 'there'},

Here's your confirmed quote for \${propertySummary}:

Package: \${packageLabel}
\${priceLine}\${frequencyLine ? '\\n' + frequencyLine : ''}

Add-ons included:
\${addOnsSection}

What's included in your \${packageLabel} clean:

\${scopeBody}\${vacancyLine}

Questions before your appointment? Just reply to this message.

— Sea of Blue\`;

  return output.trim();
}
`;

fs.writeFileSync('lib/pricing/scope-of-work.ts', CODE);
