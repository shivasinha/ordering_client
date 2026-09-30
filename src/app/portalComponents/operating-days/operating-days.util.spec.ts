import { getDateRangeOfCombinedOperatingDays, getEndDateFromBitmap } from './operating-days.util';
import { DaySet } from '@Ordering/api';

describe('Operating Days Utilities', () => {
  describe('getDateRangeOfCombinedOperatingDays', () => {
    it('should return empty dates for empty array', () => {
      const result = getDateRangeOfCombinedOperatingDays([]);
      expect(result).toEqual({ beginDate: '', endDate: '' });
    });

    it('should return empty dates for null/undefined input', () => {
      const result = getDateRangeOfCombinedOperatingDays(null as any);
      expect(result).toEqual({ beginDate: '', endDate: '' });
    });

    it('should handle single DaySet correctly', () => {
      const daySets: DaySet[] = [
        {
          beginDate: '2024-01-15',
          daysBitmap: '1111000', // 7 days, so end date should be 2024-01-21
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = getDateRangeOfCombinedOperatingDays(daySets);
      expect(result.beginDate).toBe('2024-01-15');
      expect(result.endDate).toBe('2024-01-21');
    });

    it('should combine multiple DaySets and find earliest begin and latest end dates', () => {
      const daySets: DaySet[] = [
        {
          beginDate: '2024-01-15',
          daysBitmap: '1111000', // 7 days: 2024-01-15 to 2024-01-21
          selectedDays: [],
          deselectedDays: [],
        },
        {
          beginDate: '2024-01-10', // Earlier begin date
          daysBitmap: '1110000', // 7 days: 2024-01-10 to 2024-01-16
          selectedDays: [],
          deselectedDays: [],
        },
        {
          beginDate: '2024-01-20',
          daysBitmap: '11111111', // 8 days: 2024-01-20 to 2024-01-27 (latest end date)
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = getDateRangeOfCombinedOperatingDays(daySets);
      expect(result.beginDate).toBe('2024-01-10'); // Earliest
      expect(result.endDate).toBe('2024-01-27'); // Latest
    });

    it('should skip invalid DaySets with missing beginDate', () => {
      const daySets: DaySet[] = [
        {
          beginDate: '2024-01-15',
          daysBitmap: '1111000',
          selectedDays: [],
          deselectedDays: [],
        },
        {
          beginDate: '', // Invalid
          daysBitmap: '1110000',
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = getDateRangeOfCombinedOperatingDays(daySets);
      expect(result.beginDate).toBe('2024-01-15');
      expect(result.endDate).toBe('2024-01-21');
    });

    it('should skip invalid DaySets with missing daysBitmap', () => {
      const daySets: DaySet[] = [
        {
          beginDate: '2024-01-15',
          daysBitmap: '1111000',
          selectedDays: [],
          deselectedDays: [],
        },
        {
          beginDate: '2024-01-10',
          daysBitmap: '', // Invalid
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = getDateRangeOfCombinedOperatingDays(daySets);
      expect(result.beginDate).toBe('2024-01-15');
      expect(result.endDate).toBe('2024-01-21');
    });

    it('should skip DaySets with invalid date format', () => {
      const daySets: DaySet[] = [
        {
          beginDate: 'invalid-date',
          daysBitmap: '1111000',
          selectedDays: [],
          deselectedDays: [],
        },
        {
          beginDate: '2024-01-15',
          daysBitmap: '1111000',
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = getDateRangeOfCombinedOperatingDays(daySets);
      expect(result.beginDate).toBe('2024-01-15');
      expect(result.endDate).toBe('2024-01-21');
    });

    it('should return empty dates when all DaySets are invalid', () => {
      const daySets: DaySet[] = [
        {
          beginDate: '',
          daysBitmap: '1111000',
          selectedDays: [],
          deselectedDays: [],
        },
        {
          beginDate: 'invalid-date',
          daysBitmap: '1111000',
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = getDateRangeOfCombinedOperatingDays(daySets);
      expect(result).toEqual({ beginDate: '', endDate: '' });
    });

    it('should handle overlapping date ranges correctly', () => {
      const daySets: DaySet[] = [
        {
          beginDate: '2024-01-15',
          daysBitmap: '1111111111', // 10 days: 2024-01-15 to 2024-01-24
          selectedDays: [],
          deselectedDays: [],
        },
        {
          beginDate: '2024-01-20',
          daysBitmap: '11111', // 5 days: 2024-01-20 to 2024-01-24 (overlaps with first)
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = getDateRangeOfCombinedOperatingDays(daySets);
      expect(result.beginDate).toBe('2024-01-15');
      expect(result.endDate).toBe('2024-01-24');
    });
  });

  describe('getEndDateFromBitmap', () => {
    it('should calculate end date correctly for single day', () => {
      const result = getEndDateFromBitmap('2024-01-15', '1');
      expect(result).toBe('2024-01-15');
    });

    it('should calculate end date correctly for multiple days', () => {
      const result = getEndDateFromBitmap('2024-01-15', '1111111'); // 7 days
      expect(result).toBe('2024-01-21');
    });
  });
});
