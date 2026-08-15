import { describe, it, expect } from 'vitest';
import { calcCommercialCleaning } from './commercial-calculator';
import { calcStripAndWax } from './commercial-calculator';

// ----------------------------------------------------------------
// Strip and Wax — reference case from spec
// ----------------------------------------------------------------

describe('calcStripAndWax', () => {
  it('3,400 sqft → 1,870 (spec reference)', () => {
    const result = calcStripAndWax({ sqft: 3400, burnishAddon: false });
    expect(result.stripTotal).toBe(1870);
  });

  it('minimum applied for small jobs', () => {
    const result = calcStripAndWax({ sqft: 100, burnishAddon: false });
    expect(result.stripTotal).toBe(300);
  });

  it('burnish add-on calculates band (0.15–0.25/sqft)', () => {
    const result = calcStripAndWax({ sqft: 2000, burnishAddon: true });
    expect(result.burnishLow).toBe(300);  // 2000 × 0.15
    expect(result.burnishHigh).toBe(500); // 2000 × 0.25
  });

  it('burnish add-on is null when not selected', () => {
    const result = calcStripAndWax({ sqft: 2000, burnishAddon: false });
    expect(result.burnishLow).toBeNull();
    expect(result.burnishHigh).toBeNull();
  });
});

// ----------------------------------------------------------------
// Commercial Cleaning — frequency calculation order (spec worked examples)
// ----------------------------------------------------------------

const baseInput = {
  carpetExtractionUnits: 0,
  kitchenDeepClean: false,
  windowCleaning: false,
  postConstructionSqft: 0,
  afterHours: false,
  rushSameDay: false,
};

describe('calcCommercialCleaning — worked examples from spec', () => {
  it('1,000 sqft, Small, 1x/wk → per-visit 110, weekly 110, monthly 476.30', () => {
    const result = calcCommercialCleaning({
      ...baseInput,
      sqft: 1000,
      complexity: 'small',
      frequency: '1x',
    });
    expect(result.basePerVisit).toBe(110.00);
    expect(result.adjustedPerVisit).toBe(110.00);
    expect(result.weeklyTotal).toBe(110.00);
    expect(result.monthlyTotal).toBe(476.30);
  });

  it('3,000 sqft, Medium, 1x/wk → per-visit 450, weekly 450, monthly 1,948.50', () => {
    const result = calcCommercialCleaning({
      ...baseInput,
      sqft: 3000,
      complexity: 'medium',
      frequency: '1x',
    });
    expect(result.basePerVisit).toBe(450.00);
    expect(result.adjustedPerVisit).toBe(450.00);
    expect(result.weeklyTotal).toBe(450.00);
    expect(result.monthlyTotal).toBe(1948.50);
  });

  it('1,000 sqft, Small, 3x/wk → base 110, adjusted 99, weekly 297, monthly 1,286.01', () => {
    const result = calcCommercialCleaning({
      ...baseInput,
      sqft: 1000,
      complexity: 'small',
      frequency: '3x',
    });
    expect(result.basePerVisit).toBe(110.00);
    expect(result.adjustedPerVisit).toBe(99.00);  // 110 × (1 − 0.10)
    expect(result.weeklyTotal).toBe(297.00);       // 99 × 3
    expect(result.monthlyTotal).toBe(1286.01);     // 297 × 4.33
  });
});

describe('calcCommercialCleaning — frequency discounts', () => {
  it('1x/wk: no discount', () => {
    const result = calcCommercialCleaning({ ...baseInput, sqft: 1000, complexity: 'small', frequency: '1x' });
    expect(result.adjustedPerVisit).toBe(result.basePerVisit);
  });

  it('2x/wk: 5% discount', () => {
    const result = calcCommercialCleaning({ ...baseInput, sqft: 1000, complexity: 'small', frequency: '2x' });
    expect(result.adjustedPerVisit).toBeCloseTo(110 * 0.95, 2);
    expect(result.weeklyTotal).toBeCloseTo(110 * 0.95 * 2, 2);
  });

  it('daily (5x/wk): 15% discount', () => {
    const result = calcCommercialCleaning({ ...baseInput, sqft: 1000, complexity: 'small', frequency: 'daily' });
    expect(result.adjustedPerVisit).toBeCloseTo(110 * 0.85, 2);
    expect(result.weeklyTotal).toBeCloseTo(110 * 0.85 * 5, 2);
  });
});

describe('calcCommercialCleaning — surcharges', () => {
  it('after-hours (+20%) applies to per-visit before weekly multiplication, recurs in monthly', () => {
    const base = calcCommercialCleaning({ ...baseInput, sqft: 1000, complexity: 'small', frequency: '1x' });
    const ah   = calcCommercialCleaning({ ...baseInput, sqft: 1000, complexity: 'small', frequency: '1x', afterHours: true });
    expect(ah.perVisitWithSurcharges).toBeCloseTo(base.adjustedPerVisit * 1.20, 2);
    expect(ah.monthlyTotal).toBeGreaterThan(base.monthlyTotal);
  });

  it('rush (+30%) is shown as rushSurcharge, not included in monthlyTotal', () => {
    const base = calcCommercialCleaning({ ...baseInput, sqft: 1000, complexity: 'small', frequency: '1x' });
    const rush = calcCommercialCleaning({ ...baseInput, sqft: 1000, complexity: 'small', frequency: '1x', rushSameDay: true });
    expect(rush.rushSurcharge).toBeCloseTo(base.adjustedPerVisit * 0.30, 2);
    // Rush does NOT change the monthly total
    expect(rush.monthlyTotal).toBe(base.monthlyTotal);
  });
});

describe('calcCommercialCleaning — add-ons', () => {
  it('one-time add-ons are NOT included in monthlyWithRecurringAddOns', () => {
    const withOT = calcCommercialCleaning({
      ...baseInput, sqft: 1000, complexity: 'small', frequency: '1x',
      kitchenDeepClean: true, windowCleaning: true,
    });
    expect(withOT.monthlyWithRecurringAddOns).toBe(withOT.monthlyTotal);
    expect(withOT.addOnLines.every((l) => l.isOneTime)).toBe(true);
  });

  it('recurring add-ons (carpet extraction) ARE included in monthlyWithRecurringAddOns', () => {
    const base = calcCommercialCleaning({ ...baseInput, sqft: 1000, complexity: 'small', frequency: '1x' });
    const withExtraction = calcCommercialCleaning({
      ...baseInput, sqft: 1000, complexity: 'small', frequency: '1x',
      carpetExtractionUnits: 2,
    });
    // 2 units × $150 low = $300 added to recurring
    expect(withExtraction.monthlyWithRecurringAddOns).toBe(base.monthlyTotal + 300);
  });
});

describe('calcCommercialCleaning — WEEKS_PER_MONTH constant', () => {
  it('uses 4.33 as weeks-per-month (not 4 or 4.5)', () => {
    const result = calcCommercialCleaning({ ...baseInput, sqft: 1000, complexity: 'small', frequency: '1x' });
    // 110 × 4.33 = 476.30
    expect(result.monthlyTotal).toBe(476.30);
    // Guard against wrong constants
    expect(result.monthlyTotal).not.toBe(440.00); // 4.0 weeks
    expect(result.monthlyTotal).not.toBe(495.00); // 4.5 weeks
  });
});
