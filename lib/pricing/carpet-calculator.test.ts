import { describe, it, expect } from 'vitest';
import { calcCommercialCarpet, calcResidentialCarpet } from './carpet-calculator';

// ----------------------------------------------------------------
// Commercial Carpet — Bracket boundaries and monotonic guard
// ----------------------------------------------------------------

describe('calcCommercialCarpet — Standard tier', () => {
  it('800 sqft: bracket 0, no guard', () => {
    expect(calcCommercialCarpet({ tier: 'standard', sqft: 800 }).total).toBe(560.00);
  });

  it('999 sqft: bracket 0 upper boundary, no guard', () => {
    expect(calcCommercialCarpet({ tier: 'standard', sqft: 999 }).total).toBe(699.30);
  });

  it('1,000 sqft: guard raises price above naive bracket calculation', () => {
    const result = calcCommercialCarpet({ tier: 'standard', sqft: 1000 });
    expect(result.total).toBe(699.30);
    expect(result.guardApplied).toBe(true);
  });

  it('1,200 sqft: past guard floor, naive calculation wins', () => {
    const result = calcCommercialCarpet({ tier: 'standard', sqft: 1200 });
    expect(result.total).toBe(780.00);
    expect(result.guardApplied).toBe(false);
  });

  it('2,999 sqft: bracket 1 upper boundary', () => {
    expect(calcCommercialCarpet({ tier: 'standard', sqft: 2999 }).total).toBe(1949.35);
  });

  it('3,000 sqft: guard at bracket 2 boundary', () => {
    const result = calcCommercialCarpet({ tier: 'standard', sqft: 3000 });
    expect(result.total).toBe(1949.35);
    expect(result.guardApplied).toBe(true);
  });

  it('3,500 sqft: past guard floor at bracket 2', () => {
    const result = calcCommercialCarpet({ tier: 'standard', sqft: 3500 });
    expect(result.total).toBe(2100.00);
    expect(result.guardApplied).toBe(false);
  });

  it('5,999 sqft: bracket 2 upper boundary', () => {
    expect(calcCommercialCarpet({ tier: 'standard', sqft: 5999 }).total).toBe(3599.40);
  });

  it('6,000 sqft: guard at bracket 3 boundary', () => {
    const result = calcCommercialCarpet({ tier: 'standard', sqft: 6000 });
    expect(result.total).toBe(3599.40);
    expect(result.guardApplied).toBe(true);
  });

  it('7,000 sqft: past guard floor at bracket 3', () => {
    const result = calcCommercialCarpet({ tier: 'standard', sqft: 7000 });
    expect(result.total).toBe(3850.00);
    expect(result.guardApplied).toBe(false);
  });

  it('minimum applied (small job)', () => {
    expect(calcCommercialCarpet({ tier: 'standard', sqft: 100 }).total).toBe(200);
  });

  it('monotonic: price at 1,000 >= price at 999', () => {
    const at999  = calcCommercialCarpet({ tier: 'standard', sqft: 999 }).total;
    const at1000 = calcCommercialCarpet({ tier: 'standard', sqft: 1000 }).total;
    expect(at1000).toBeGreaterThanOrEqual(at999);
  });

  it('monotonic: price at 3,000 >= price at 2,999', () => {
    const at2999 = calcCommercialCarpet({ tier: 'standard', sqft: 2999 }).total;
    const at3000 = calcCommercialCarpet({ tier: 'standard', sqft: 3000 }).total;
    expect(at3000).toBeGreaterThanOrEqual(at2999);
  });

  it('monotonic: price at 6,000 >= price at 5,999', () => {
    const at5999 = calcCommercialCarpet({ tier: 'standard', sqft: 5999 }).total;
    const at6000 = calcCommercialCarpet({ tier: 'standard', sqft: 6000 }).total;
    expect(at6000).toBeGreaterThanOrEqual(at5999);
  });
});

describe('calcCommercialCarpet — Premium tier', () => {
  it('999 sqft: bracket 0', () => {
    expect(calcCommercialCarpet({ tier: 'premium', sqft: 999 }).total).toBe(799.20);
  });

  it('1,000 sqft: guard applied (Premium)', () => {
    const result = calcCommercialCarpet({ tier: 'premium', sqft: 1000 });
    expect(result.total).toBe(799.20);
    expect(result.guardApplied).toBe(true);
  });

  it('2,999 sqft: bracket 1 upper boundary (Premium)', () => {
    expect(calcCommercialCarpet({ tier: 'premium', sqft: 2999 }).total).toBe(2249.25);
  });

  it('3,000 sqft: guard applied (Premium)', () => {
    const result = calcCommercialCarpet({ tier: 'premium', sqft: 3000 });
    expect(result.total).toBe(2249.25);
    expect(result.guardApplied).toBe(true);
  });

  it('5,999 sqft: bracket 2 upper boundary (Premium)', () => {
    expect(calcCommercialCarpet({ tier: 'premium', sqft: 5999 }).total).toBe(4199.30);
  });

  it('6,000 sqft: guard applied (Premium)', () => {
    const result = calcCommercialCarpet({ tier: 'premium', sqft: 6000 });
    expect(result.total).toBe(4199.30);
    expect(result.guardApplied).toBe(true);
  });

  it('minimum applied (Premium)', () => {
    expect(calcCommercialCarpet({ tier: 'premium', sqft: 100 }).total).toBe(300);
  });

  it('monotonic at all bracket boundaries (Premium)', () => {
    const boundaries = [999, 1000, 2999, 3000, 5999, 6000];
    for (let i = 0; i < boundaries.length - 1; i += 2) {
      const lo = calcCommercialCarpet({ tier: 'premium', sqft: boundaries[i] }).total;
      const hi = calcCommercialCarpet({ tier: 'premium', sqft: boundaries[i + 1] }).total;
      expect(hi).toBeGreaterThanOrEqual(lo);
    }
  });
});

// ----------------------------------------------------------------
// Residential Carpet — spot checks
// ----------------------------------------------------------------

describe('calcResidentialCarpet — Standard', () => {
  it('1 bedroom → $70 minimum applied (base is $60)', () => {
    const result = calcResidentialCarpet({
      tier: 'standard', bedrooms: 1, livingRooms: 0, basementRooms: 0,
      hallways: 0, stairsFlights: 0, stairsHalfFlights: 0, rugSmall: 0, rugMedium: 0, rugLarge: 0,
      petSpots: 0, dispatchFee: false,
    });
    expect(result.total).toBe(70);
    expect(result.isRange).toBe(false);
  });

  it('minimum applied — 1 hallway = $40, but minimum is $70', () => {
    const result = calcResidentialCarpet({
      tier: 'standard', bedrooms: 0, livingRooms: 0, basementRooms: 0,
      hallways: 1, stairsFlights: 0, stairsHalfFlights: 0, rugSmall: 0, rugMedium: 0, rugLarge: 0,
      petSpots: 0, dispatchFee: false,
    });
    expect(result.total).toBe(70);
  });

  it('add-ons stack above room total correctly', () => {
    const result = calcResidentialCarpet({
      tier: 'standard', bedrooms: 1, livingRooms: 0, basementRooms: 0,
      hallways: 0, stairsFlights: 0, stairsHalfFlights: 0, rugSmall: 1, rugMedium: 0, rugLarge: 0,
      petSpots: 0, dispatchFee: true,
    });
    // 60 (bedroom) → minimum 70 + 60 (rug small) + 40 (dispatch) = 170
    expect(result.total).toBe(170);
  });

  it('2 bedrooms → $120 (no minimum needed)', () => {
    const result = calcResidentialCarpet({
      tier: 'standard', bedrooms: 2, livingRooms: 0, basementRooms: 0,
      hallways: 0, stairsFlights: 0, stairsHalfFlights: 0, rugSmall: 0, rugMedium: 0, rugLarge: 0,
      petSpots: 0, dispatchFee: false,
    });
    // 2 * 60 = 120
    expect(result.total).toBe(120);
  });
});

describe('calcResidentialCarpet — Premium', () => {
  it('1 bedroom → $75 flat rate', () => {
    const result = calcResidentialCarpet({
      tier: 'premium', bedrooms: 1, livingRooms: 0, basementRooms: 0,
      hallways: 0, stairsFlights: 0, stairsHalfFlights: 0, rugSmall: 0, rugMedium: 0, rugLarge: 0,
      petSpots: 0, dispatchFee: false,
    });
    expect(result.isRange).toBe(false);
    expect(result.total).toBe(75);
  });

  it('minimum applied to room figure', () => {
    const result = calcResidentialCarpet({
      tier: 'premium', bedrooms: 0, livingRooms: 0, basementRooms: 0,
      hallways: 1, stairsFlights: 0, stairsHalfFlights: 0, rugSmall: 0, rugMedium: 0, rugLarge: 0,
      petSpots: 0, dispatchFee: false,
    });
    // Hallway premium: 50 — below minimum 70
    expect(result.total).toBe(70);
  });

  it('large rug add-on shows as band', () => {
    const result = calcResidentialCarpet({
      tier: 'premium', bedrooms: 1, livingRooms: 0, basementRooms: 0,
      hallways: 0, stairsFlights: 0, stairsHalfFlights: 0, rugSmall: 0, rugMedium: 0, rugLarge: 2,
      petSpots: 0, dispatchFee: false,
    });
    // Room: 75. Rugs: 2 × [110, 130] = [220, 260]. Total: [295, 335]
    expect(result.total).toEqual([295, 335]);
    const rugLine = result.addOnLines.find((l) => l.label.includes('large'));
    expect(rugLine?.isRange).toBe(true);
    expect(rugLine?.amount).toEqual([220, 260]);
  });
});
