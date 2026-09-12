import { describe, it, expect } from 'vitest';
import { calcPostConstruction } from './post-construction-calculator';
import { calcJunkRemoval } from './junk-removal-calculator';
import { calcPainting } from './painting-calculator';

describe('New Services Pricing Engines', () => {
  describe('Post Construction Cleaning', () => {
    it('applies minimum price of $350 for small units', () => {
      const result = calcPostConstruction({ sqft: 500, stage: 'final' });
      // 500 * 0.45 = 225 < 350
      expect(result.total).toBe(350);
      expect(result.stagePrice).toBe(350);
    });

    it('calculates correctly for 2,000 sqft final clean', () => {
      const result = calcPostConstruction({ sqft: 2000, stage: 'final' });
      // 2000 * 0.45 * 1.0 = 900
      expect(result.total).toBe(900);
      expect(result.estimatedHours).toBeGreaterThan(4);
    });

    it('adds window scraping and HVAC vents add-ons', () => {
      const result = calcPostConstruction({
        sqft: 2000,
        stage: 'final',
        windowScrapingCount: 10, // 10 * 12 = 120
        hvacVentsClean: true, // 45
      });
      expect(result.addOnsTotal).toBe(165);
      expect(result.total).toBe(1065);
    });
  });

  describe('Junk Removal', () => {
    it('calculates standard 1/4 truckload', () => {
      const result = calcJunkRemoval({ volume: 'quarter' });
      expect(result.basePrice).toBe(195);
      expect(result.total).toBe(195);
    });

    it('adds heavy materials surcharge and stairs', () => {
      const result = calcJunkRemoval({
        volume: 'half', // 345
        heavyMaterials: true, // +110
        stairsCount: 2, // 2 * 35 = +70
      });
      expect(result.total).toBe(345 + 110 + 70);
    });
  });

  describe('Painting', () => {
    it('calculates 2 standard rooms with 2 coats and materials', () => {
      const result = calcPainting({
        standardRooms: 2, // 2 * 275 = 550
        largeRooms: 0,
        bathroomsOrHallways: 0,
        accentWalls: 0,
        coats: 'two_coats', // 550 * 1.35 = 742.5 -> 743
        paintSupply: 'contractor_supplies', // 2 * 50 = 100
      });
      // 743 + 100 = 843
      expect(result.total).toBe(843);
      expect(result.estimatedDays).toBe(1);
    });
  });
});
