import { describe, it, expect } from 'vitest';
import {
  calculateNextRunDate,
  calculateMonthlyMRR,
  formatRecurrenceSchedule,
  generateDatesForSchedule,
} from './recurring-utils';

describe('Recurring Services Utilities', () => {
  it('calculates monthly MRR correctly for multi-day schedules', () => {
    // 3 days a week at $225/visit -> 225 * 3 * 4.33 = $2,922.75
    const mrr = calculateMonthlyMRR(225, 'weekly', ['monday', 'wednesday', 'friday']);
    expect(mrr).toBe(2922.75);
  });

  it('calculates monthly MRR for biweekly service', () => {
    // Biweekly at $200 -> 200 * 2.165 = $433.00
    const mrr = calculateMonthlyMRR(200, 'biweekly', []);
    expect(mrr).toBe(433);
  });

  it('formats recurrence schedule cleanly', () => {
    const schedule = formatRecurrenceSchedule(
      'weekly',
      ['monday', 'wednesday', 'friday'],
      undefined,
      '18:00'
    );
    expect(schedule).toBe('Mon, Wed, Fri @ 6:00 PM (3x/wk)');
  });

  it('generates candidate dates within lookahead window for multi-day schedule', () => {
    const start = new Date('2026-09-14T00:00:00Z'); // Monday
    const dates = generateDatesForSchedule(start, 7, 'weekly', ['monday', 'wednesday', 'friday']);
    expect(dates.length).toBe(3); // Mon, Wed, Fri
    expect(dates[0]).toBe('2026-09-14');
    expect(dates[1]).toBe('2026-09-16');
    expect(dates[2]).toBe('2026-09-18');
  });

  it('calculates next run date advancing to the next scheduled weekday', () => {
    const monday = new Date('2026-09-14T12:00:00');
    const nextDate = calculateNextRunDate(monday, 'weekly', ['monday', 'wednesday', 'friday']);
    expect(nextDate).toBe('2026-09-16'); // Wednesday
  });
});
