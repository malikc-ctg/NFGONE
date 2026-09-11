import { describe, it, expect } from 'vitest';
import { calculateQuote } from './calculator';
import {
  ADD_ONS,
  FREQUENCY_DISCOUNT,
  PACKAGE_TIER_ORDER,
  PACKAGE_LABELS,
} from './constants';

describe('Residential Cleaning Pricing Engine Updates', () => {
  it('starts all standard cleans at $199 minimum for base tier', () => {
    // Studio condo
    const condoStudio = calculateQuote({
      propertyType: 'condo',
      sqft: 400,
      selectedPackage: 'standard',
      frequency: 'one_time',
      fullBathrooms: 1,
      halfBathrooms: 0,
      selectedAddOnIds: [],
      customAddOnPrices: {},
      addOnQuantities: {},
    });
    expect(condoStudio.basePrice).toBe(199);

    // Bachelor basement
    const basementStudio = calculateQuote({
      propertyType: 'basement',
      sqft: 400,
      selectedPackage: 'standard',
      frequency: 'one_time',
      fullBathrooms: 1,
      halfBathrooms: 0,
      selectedAddOnIds: [],
      customAddOnPrices: {},
      addOnQuantities: {},
    });
    expect(basementStudio.basePrice).toBe(199);

    // House under 1000 sqft
    const houseSmall = calculateQuote({
      propertyType: 'house',
      sqft: 800,
      selectedPackage: 'standard',
      frequency: 'one_time',
      fullBathrooms: 2,
      halfBathrooms: 0,
      selectedAddOnIds: [],
      customAddOnPrices: {},
      addOnQuantities: {},
    });
    expect(houseSmall.basePrice).toBe(199);
  });

  it('starts all standard plus cleans at $229 minimum for base tier', () => {
    const condoStudioPlus = calculateQuote({
      propertyType: 'condo',
      sqft: 400,
      selectedPackage: 'standard_plus',
      frequency: 'one_time',
      fullBathrooms: 1,
      halfBathrooms: 0,
      selectedAddOnIds: [],
      customAddOnPrices: {},
      addOnQuantities: {},
    });
    expect(condoStudioPlus.basePrice).toBe(229);

    const basementPlus = calculateQuote({
      propertyType: 'basement',
      sqft: 400,
      selectedPackage: 'standard_plus',
      frequency: 'one_time',
      fullBathrooms: 1,
      halfBathrooms: 0,
      selectedAddOnIds: [],
      customAddOnPrices: {},
      addOnQuantities: {},
    });
    expect(basementPlus.basePrice).toBe(229);

    const houseSmallPlus = calculateQuote({
      propertyType: 'house',
      sqft: 800,
      selectedPackage: 'standard_plus',
      frequency: 'one_time',
      fullBathrooms: 2,
      halfBathrooms: 0,
      selectedAddOnIds: [],
      customAddOnPrices: {},
      addOnQuantities: {},
    });
    expect(houseSmallPlus.basePrice).toBe(229);
  });

  it('verifies full reset clean is completely removed', () => {
    expect((PACKAGE_TIER_ORDER as string[]).includes('full_reset')).toBe(false);
    expect((PACKAGE_LABELS as any).full_reset).toBeUndefined();
  });

  it('verifies frequency discounts: monthly -10%, biweekly -15%, weekly -20%', () => {
    expect(FREQUENCY_DISCOUNT.one_time).toBe(0);
    expect(FREQUENCY_DISCOUNT.monthly).toBe(-0.10);
    expect(FREQUENCY_DISCOUNT.biweekly).toBe(-0.15);
    expect(FREQUENCY_DISCOUNT.weekly).toBe(-0.20);

    const quoteWeekly = calculateQuote({
      propertyType: 'condo',
      sqft: 400,
      selectedPackage: 'standard',
      frequency: 'weekly',
      fullBathrooms: 1,
      halfBathrooms: 0,
      selectedAddOnIds: [],
      customAddOnPrices: {},
      addOnQuantities: {},
    });
    // 199 base - 20% = 199 - 39.80 = 159.20
    expect(quoteWeekly.total).toBe(159.20);
    expect(quoteWeekly.frequencyDiscountPercent).toBe(-0.20);
  });

  it('verifies add-on prices and removals', () => {
    const addOnMap = new Map(ADD_ONS.map((a) => [a.id, a]));

    // Updated / Added
    expect(addOnMap.get('laundry_appliances')?.price).toBe(30);
    expect(addOnMap.get('carpet_steam_room')?.price).toBe(60);
    expect(addOnMap.get('pet_odor')?.price).toBe(100);
    expect(addOnMap.get('rush_booking')?.percentOfTotal).toBe(0.30);
    expect(addOnMap.get('after_hours')?.percentOfTotal).toBe(0.15);

    // Removed
    expect(addOnMap.get('laundry')).toBeUndefined();
    expect(addOnMap.get('carpet_steam_unit')).toBeUndefined();
    expect(addOnMap.get('linen_change')).toBeUndefined();
    expect(addOnMap.get('fireplace_surround')).toBeUndefined();
    expect(addOnMap.get('bbq_exterior')).toBeUndefined();
    expect(addOnMap.get('wine_fridge')).toBeUndefined();
    expect(addOnMap.get('dishes')).toBeUndefined();
    expect(addOnMap.get('key_pickup')).toBeUndefined();
    expect(addOnMap.get('eco_upgrade')).toBeUndefined();
    expect(addOnMap.get('sanitizing_pass')).toBeUndefined();
  });
});
