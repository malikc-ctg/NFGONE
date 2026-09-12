// ============================================================
// Sea of Blue — Junk Removal Pricing Calculator
// Pure functions: no side effects, no DB calls, no React.
// ============================================================

export type JunkVolume = 'single_item' | 'eighth' | 'quarter' | 'half' | 'three_quarter' | 'full_truck';

export interface JunkRemovalInput {
  volume: JunkVolume;
  heavyMaterials?: boolean; // drywall, tile, concrete, brick, dirt
  stairsCount?: number; // flights of stairs without elevator
  appliancesCount?: number; // appliances requiring eco-disposal fees (fridge, AC, freezer)
  disassemblyItemCount?: number; // furniture pieces needing disassembly
}

export interface JunkRemovalResult {
  volume: JunkVolume;
  volumeLabel: string;
  volumeDescription: string;
  basePrice: number;
  addOnsTotal: number;
  addOnBreakdown: { id: string; label: string; price: number }[];
  total: number;
  estimatedLaborMinutes: number;
}

export const JUNK_VOLUME_TIERS: Record<JunkVolume, { label: string; desc: string; price: number; minutes: number }> = {
  single_item: { label: 'Single Item / Minimum', desc: '1 small piece (e.g. mattress, armchair, single appliance)', price: 95, minutes: 20 },
  eighth: { label: '1/8 Truckload', desc: 'Small collection (approx. 2-3 items or small storage locker)', price: 135, minutes: 30 },
  quarter: { label: '1/4 Truckload', desc: 'Sofa, dresser, several boxes (small bedroom cleanout)', price: 195, minutes: 45 },
  half: { label: '1/2 Truckload', desc: 'Full living room set, garage cleanout portion, large appliances', price: 345, minutes: 75 },
  three_quarter: { label: '3/4 Truckload', desc: 'Multi-room renovation clutter, extensive estate clearing', price: 485, minutes: 110 },
  full_truck: { label: 'Full Truckload', desc: 'Full home or commercial warehouse / office junk out', price: 595, minutes: 150 },
};

const HEAVY_MATERIALS_SURCHARGE = 110;
const STAIRS_PER_FLIGHT = 35;
const APPLIANCE_ECO_FEE = 45;
const DISASSEMBLY_PER_ITEM = 40;

export function calcJunkRemoval(input: JunkRemovalInput): JunkRemovalResult {
  const {
    volume = 'quarter',
    heavyMaterials = false,
    stairsCount = 0,
    appliancesCount = 0,
    disassemblyItemCount = 0,
  } = input;

  const tier = JUNK_VOLUME_TIERS[volume] || JUNK_VOLUME_TIERS.quarter;
  const basePrice = tier.price;

  const addOnBreakdown: { id: string; label: string; price: number }[] = [];

  if (heavyMaterials) {
    addOnBreakdown.push({
      id: 'heavy_materials',
      label: 'Heavy Dense Materials (Drywall, Tile, Brick, Plaster)',
      price: HEAVY_MATERIALS_SURCHARGE,
    });
  }

  if (stairsCount > 0) {
    const price = stairsCount * STAIRS_PER_FLIGHT;
    addOnBreakdown.push({
      id: 'stairs',
      label: `Stairs Carry (${stairsCount} flight${stairsCount > 1 ? 's' : ''})`,
      price,
    });
  }

  if (appliancesCount > 0) {
    const price = appliancesCount * APPLIANCE_ECO_FEE;
    addOnBreakdown.push({
      id: 'appliances',
      label: `Appliance Eco Disposal (${appliancesCount} unit${appliancesCount > 1 ? 's' : ''})`,
      price,
    });
  }

  if (disassemblyItemCount > 0) {
    const price = disassemblyItemCount * DISASSEMBLY_PER_ITEM;
    addOnBreakdown.push({
      id: 'disassembly',
      label: `Furniture Disassembly Labor (${disassemblyItemCount} item${disassemblyItemCount > 1 ? 's' : ''})`,
      price,
    });
  }

  const addOnsTotal = addOnBreakdown.reduce((sum, item) => sum + item.price, 0);
  const total = basePrice + addOnsTotal;

  // Compute labor time
  const extraMinutes = (stairsCount * 15) + (disassemblyItemCount * 20);
  const estimatedLaborMinutes = tier.minutes + extraMinutes;

  return {
    volume,
    volumeLabel: tier.label,
    volumeDescription: tier.desc,
    basePrice,
    addOnsTotal,
    addOnBreakdown,
    total,
    estimatedLaborMinutes,
  };
}
