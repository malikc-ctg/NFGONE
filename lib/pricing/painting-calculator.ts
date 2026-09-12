// ============================================================
// Sea of Blue — Interior & Commercial Painting Calculator
// Pure functions: no side effects, no DB calls, no React.
// ============================================================

export type PaintCoats = 'one_coat' | 'two_coats';
export type PaintSupplyOption = 'customer_supplies' | 'contractor_supplies';

export interface PaintingInput {
  standardRooms: number; // bedrooms, dining, standard offices (up to 144 sqft)
  largeRooms: number; // living rooms, master bedrooms, open concept lobbies
  bathroomsOrHallways: number; // smaller utility rooms, powder rooms, corridors
  accentWalls: number; // single accent walls
  
  /** Surfaces */
  includeCeilings?: boolean;
  includeBaseboardsTrim?: boolean;
  doorCount?: number; // doors and casings

  /** Coats & Materials */
  coats: PaintCoats;
  paintSupply: PaintSupplyOption;

  /** Prep / Repairs */
  heavyDrywallPatching?: boolean;
}

export interface PaintingResult {
  roomCountTotal: number;
  baseLaborPrice: number;
  coatsMultiplier: number;
  surfacesTotal: number;
  materialsTotal: number;
  repairsTotal: number;
  breakdown: { id: string; label: string; price: number }[];
  total: number;
  estimatedDays: number;
}

const RATE_STANDARD_ROOM = 275;
const RATE_LARGE_ROOM = 375;
const RATE_BATHROOM_HALLWAY = 165;
const RATE_ACCENT_WALL = 120;

const RATE_CEILING_STANDARD = 85;
const RATE_CEILING_LARGE = 125;
const RATE_TRIM_PER_ROOM = 55;
const RATE_DOOR_CASING = 45;

const PAINT_SUPPLY_PER_STD_ROOM = 50;
const PAINT_SUPPLY_PER_LRG_ROOM = 75;
const PAINT_SUPPLY_PER_BATH = 35;

const DRYWALL_PATCHING_FEE = 75;

export function calcPainting(input: PaintingInput): PaintingResult {
  const {
    standardRooms = 0,
    largeRooms = 0,
    bathroomsOrHallways = 0,
    accentWalls = 0,
    includeCeilings = false,
    includeBaseboardsTrim = false,
    doorCount = 0,
    coats = 'two_coats',
    paintSupply = 'contractor_supplies',
    heavyDrywallPatching = false,
  } = input;

  const breakdown: { id: string; label: string; price: number }[] = [];

  // 1. Base Room Walls Labor
  let rawRoomsLabor = 0;
  if (standardRooms > 0) {
    const price = standardRooms * RATE_STANDARD_ROOM;
    rawRoomsLabor += price;
    breakdown.push({ id: 'std_rooms', label: `Standard Rooms (${standardRooms})`, price });
  }

  if (largeRooms > 0) {
    const price = largeRooms * RATE_LARGE_ROOM;
    rawRoomsLabor += price;
    breakdown.push({ id: 'lrg_rooms', label: `Large Rooms / Living Areas (${largeRooms})`, price });
  }

  if (bathroomsOrHallways > 0) {
    const price = bathroomsOrHallways * RATE_BATHROOM_HALLWAY;
    rawRoomsLabor += price;
    breakdown.push({ id: 'bathrooms', label: `Bathrooms / Hallways (${bathroomsOrHallways})`, price });
  }

  if (accentWalls > 0) {
    const price = accentWalls * RATE_ACCENT_WALL;
    rawRoomsLabor += price;
    breakdown.push({ id: 'accent_walls', label: `Accent Walls (${accentWalls})`, price });
  }

  // 2. Coat multiplier on walls labor
  const coatsMultiplier = coats === 'two_coats' ? 1.35 : 1.0;
  const totalWallsLabor = Math.round(rawRoomsLabor * coatsMultiplier);
  if (coats === 'two_coats' && rawRoomsLabor > 0) {
    const extra = totalWallsLabor - rawRoomsLabor;
    breakdown.push({ id: 'second_coat', label: '2-Coat Coverage Premium (+35%)', price: extra });
  }

  // 3. Additional Surfaces
  let surfacesTotal = 0;
  if (includeCeilings) {
    const ceilingPrice = (standardRooms * RATE_CEILING_STANDARD) + (largeRooms * RATE_CEILING_LARGE);
    if (ceilingPrice > 0) {
      surfacesTotal += ceilingPrice;
      breakdown.push({ id: 'ceilings', label: `Ceilings Painting (${standardRooms + largeRooms} areas)`, price: ceilingPrice });
    }
  }

  if (includeBaseboardsTrim) {
    const totalRooms = standardRooms + largeRooms + bathroomsOrHallways;
    const trimPrice = totalRooms * RATE_TRIM_PER_ROOM;
    if (trimPrice > 0) {
      surfacesTotal += trimPrice;
      breakdown.push({ id: 'trim', label: `Baseboards & Trim Detailing (${totalRooms} rooms)`, price: trimPrice });
    }
  }

  if (doorCount > 0) {
    const doorPrice = doorCount * RATE_DOOR_CASING;
    surfacesTotal += doorPrice;
    breakdown.push({ id: 'doors', label: `Doors & Door Casings (${doorCount} doors)`, price: doorPrice });
  }

  // 4. Paint & Materials
  let materialsTotal = 0;
  if (paintSupply === 'contractor_supplies') {
    const paintPrice = 
      (standardRooms * PAINT_SUPPLY_PER_STD_ROOM) + 
      (largeRooms * PAINT_SUPPLY_PER_LRG_ROOM) + 
      (bathroomsOrHallways * PAINT_SUPPLY_PER_BATH);
    if (paintPrice > 0) {
      materialsTotal += paintPrice;
      breakdown.push({ id: 'paint_materials', label: 'Premium Paint & Prep Materials Included', price: paintPrice });
    }
  }

  // 5. Drywall Repairs
  let repairsTotal = 0;
  if (heavyDrywallPatching) {
    repairsTotal += DRYWALL_PATCHING_FEE;
    breakdown.push({ id: 'drywall_repairs', label: 'Drywall Patching, Spackle & Sanding', price: DRYWALL_PATCHING_FEE });
  }

  const roomCountTotal = standardRooms + largeRooms + bathroomsOrHallways;
  const total = totalWallsLabor + surfacesTotal + materialsTotal + repairsTotal;

  // Estimated job days (approx 1.5 - 2 rooms per painter day)
  const estimatedDays = Math.max(1, Math.ceil(roomCountTotal / 2));

  return {
    roomCountTotal,
    baseLaborPrice: rawRoomsLabor,
    coatsMultiplier,
    surfacesTotal,
    materialsTotal,
    repairsTotal,
    breakdown,
    total,
    estimatedDays,
  };
}
