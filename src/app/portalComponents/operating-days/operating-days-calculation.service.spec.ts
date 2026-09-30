import { TestBed } from '@angular/core/testing';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { DaySet } from '@Ordering/api';

import {
  OperatingDaysCalculationService,
  BitmapData,
  DaysSelectionsData,
  StrictDateRange,
} from '@Ordering/portalComponents/operating-days/operating-days-calculation.service';
import { DayOption, DayOptionTypes } from '@Ordering/portalComponents/operating-days/operating-days.model';
import { MasterDataHandlingService } from '@Ordering/shared/services/master-data-handling.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { signal } from '@angular/core';

// Configure dayjs plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

describe('OperatingDaysCalculationService', () => {
  let service: OperatingDaysCalculationService;

  beforeEach(() => {
    const mockMasterDataHandlingService = {
      masterDataHolidaysListSig: jest.fn().mockReturnValue([
        { date: '12/25/2024' }, // Christmas
        { date: '01/01/2024' }, // New Year
      ]),
    };

    const mockOrderActionsService = {
      contentTypeSig: signal(null),
      contentActionSig: signal(null),
    };

    TestBed.configureTestingModule({
      providers: [
        OperatingDaysCalculationService,
        { provide: MasterDataHandlingService, useValue: mockMasterDataHandlingService },
        { provide: OrderActionsService, useValue: mockOrderActionsService },
      ],
    });

    service = TestBed.inject(OperatingDaysCalculationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateBitmap', () => {
    it('should generate bitmap with selected weekdays', () => {
      const daysSelectionsData: DaysSelectionsData = {
        selectedDays: [DayOptionTypes.Weekday], // Weekdays: Mon-Fri
        deselectedDays: [],
      };

      // Test for one week: 2024-01-01 (Monday) to 2024-01-07 (Sunday)
      const result = service.generateBitmap('2024-01-01', '2024-01-07', daysSelectionsData);

      // Should be '1111100' (Mon-Fri selected, Sat-Sun not selected)
      expect(result).toBe('1111100');
    });

    it('should generate bitmap with daily selection', () => {
      const daysSelectionsData: DaysSelectionsData = {
        selectedDays: [DayOptionTypes.Daily],
        deselectedDays: [],
      };

      const result = service.generateBitmap('2024-01-01', '2024-01-03', daysSelectionsData);

      // Should be '111' (all days selected)
      expect(result).toBe('111');
    });

    it('should generate bitmap with weekend selection', () => {
      const daysSelectionsData: DaysSelectionsData = {
        selectedDays: [DayOptionTypes.Weekend],
        deselectedDays: [],
      };

      // Test for one week: 2024-01-01 (Monday) to 2024-01-07 (Sunday)
      const result = service.generateBitmap('2024-01-01', '2024-01-07', daysSelectionsData);

      // Should be '0000011' (Sat-Sun selected, Mon-Fri not selected)
      expect(result).toBe('0000011');
    });

    it('should generate empty bitmap when no days selected', () => {
      const daysSelectionsData: DaysSelectionsData = {
        selectedDays: [],
        deselectedDays: [],
      };

      const result = service.generateBitmap('2024-01-01', '2024-01-07', daysSelectionsData);

      // Should return empty string for invalid input (no selected days)
      expect(result).toBe('');
    });

    it('should handle deselected days correctly', () => {
      const daysSelectionsData: DaysSelectionsData = {
        selectedDays: [DayOptionTypes.Daily],
        deselectedDays: [1], // Deselect Monday
      };

      // Test for one week: 2024-01-01 (Monday) to 2024-01-07 (Sunday)
      const result = service.generateBitmap('2024-01-01', '2024-01-07', daysSelectionsData);

      // Should be '0111111' (all days except Monday)
      expect(result).toBe('0111111');
    });

    it('should return empty string for invalid input', () => {
      const daysSelectionsData: DaysSelectionsData = {
        selectedDays: [],
        deselectedDays: [],
      };

      // Missing begin date
      expect(service.generateBitmap('', '2024-01-07', daysSelectionsData)).toBe('');

      // Missing end date
      expect(service.generateBitmap('2024-01-01', '', daysSelectionsData)).toBe('');

      // No selected days and empty array
      expect(service.generateBitmap('2024-01-01', '2024-01-07', daysSelectionsData)).toBe('');
    });
  });

  describe('combineOperatingDays', () => {
    it('should return empty result for empty input', () => {
      const result = service.combineOperatingDays([]);
      expect(result).toEqual({ daysBitmap: '', beginDate: '' });
    });

    it('should return single day set unchanged', () => {
      const operatingDays: DaySet[] = [{ daysBitmap: '1010101', beginDate: '01/01/2024' }];

      const result = service.combineOperatingDays(operatingDays);
      expect(result).toEqual({
        daysBitmap: '1010101',
        beginDate: '01/01/2024',
      });
    });

    it('should combine multiple day sets correctly', () => {
      const operatingDays: DaySet[] = [
        { daysBitmap: '1010000', beginDate: '01/01/2024' },
        { daysBitmap: '0001010', beginDate: '01/01/2024' },
      ];

      const result = service.combineOperatingDays(operatingDays);
      expect(result.daysBitmap).toBe('1011010');
    });

    it('should handle different start dates correctly', () => {
      const operatingDays: DaySet[] = [
        { daysBitmap: '101', beginDate: '01/01/2024' },
        { daysBitmap: '010', beginDate: '01/02/2024' },
      ];

      const result = service.combineOperatingDays(operatingDays);
      // Should create a bitmap that covers both date ranges
      expect(result.daysBitmap.length).toBeGreaterThan(3);
    });
  });

  describe('validateBitmapSubset', () => {
    it('should return valid for empty parameters', () => {
      const result = service.validateBitmapSubset('', '', '', '');
      expect(result.isValid).toBe(true);
    });

    it('should validate correct subset', () => {
      const parentBitmap = '1111111';
      const newBitmap = '1010101';

      const result = service.validateBitmapSubset(newBitmap, '01/01/2024', parentBitmap, '01/01/2024');

      expect(result.isValid).toBe(true);
    });

    it('should detect invalid subset', () => {
      const parentBitmap = '1010101';
      const newBitmap = '1111111'; // Has more days than parent

      const result = service.validateBitmapSubset(newBitmap, '01/01/2024', parentBitmap, '01/01/2024');

      expect(result.isValid).toBe(false);
      expect(result.invalidDays).toBeDefined();
    });

    it('should handle date offset correctly', () => {
      const parentBitmap = '0111111';
      const newBitmap = '101'; // Starts one day later

      const result = service.validateBitmapSubset(newBitmap, '01/02/2024', parentBitmap, '01/01/2024');

      expect(result.isValid).toBe(true);
    });
  });

  describe('generateCalendarDisplayData', () => {
    const createBitmapData = (bitmap: string, startDate: string): BitmapData => ({
      bitmap,
      bitmapStartDate: dayjs(startDate),
    });

    const createDateRange = (start: string, end: string): StrictDateRange => ({
      start: dayjs(start),
      end: dayjs(end),
    });

    it('should return empty calendar for invalid date range', () => {
      const formDateRange = { start: null, end: null } as any;
      const generatedBitmap = createBitmapData('1010101', '2024-01-01');
      const parentBitmapData = createBitmapData('', '');

      const result = service.generateCalendarDisplayData(formDateRange, generatedBitmap, parentBitmapData);

      expect(result.months).toEqual([]);
      expect(result.allDaysNames).toEqual(DayOption.getAllDaysNames());
    });

    it('should generate calendar for valid date range and bitmap', () => {
      const formDateRange = createDateRange('2024-01-01', '2024-01-31');
      const generatedBitmap = createBitmapData('1010101010101010101010101010101', '2024-01-01');
      const parentBitmapData = createBitmapData('', '');

      const result = service.generateCalendarDisplayData(formDateRange, generatedBitmap, parentBitmapData);

      expect(result.months.length).toBeGreaterThan(0);
      expect(result.allDaysNames).toEqual(DayOption.getAllDaysNames());
    });

    it('should handle empty bitmap in standard mode', () => {
      const formDateRange = createDateRange('2024-01-01', '2024-01-07');
      const generatedBitmap = createBitmapData('0000000', '2024-01-01');
      const parentBitmapData = createBitmapData('', '');

      // Set to standard mode
      service.isSubsetModeSig.set(false);

      const result = service.generateCalendarDisplayData(formDateRange, generatedBitmap, parentBitmapData);

      // Should still generate calendar even with empty bitmap
      expect(result.months.length).toBeGreaterThan(0);
    });

    it('should handle subset mode correctly', () => {
      const formDateRange = createDateRange('2024-01-01', '2024-01-07');
      const generatedBitmap = createBitmapData('1010101', '2024-01-01');
      const parentBitmapData = createBitmapData('1111111', '2024-01-01');

      // Set to subset mode
      service.isSubsetModeSig.set(true);

      const result = service.generateCalendarDisplayData(formDateRange, generatedBitmap, parentBitmapData);

      expect(result.months.length).toBeGreaterThan(0);
    });

    it('should return empty calendar when bitmap start date is missing', () => {
      const formDateRange = createDateRange('2024-01-01', '2024-01-07');
      const generatedBitmap = { bitmap: '1010101', bitmapStartDate: null } as any;
      const parentBitmapData = createBitmapData('', '');

      // Set to standard mode
      service.isSubsetModeSig.set(false);

      const result = service.generateCalendarDisplayData(formDateRange, generatedBitmap, parentBitmapData);

      expect(result.months).toEqual([]);
    });
  });

  describe('isSubsetModeSig', () => {
    it('should have default value of false', () => {
      expect(service.isSubsetModeSig()).toBe(false);
    });

    it('should allow setting subset mode', () => {
      service.isSubsetModeSig.set(true);
      expect(service.isSubsetModeSig()).toBe(true);

      service.isSubsetModeSig.set(false);
      expect(service.isSubsetModeSig()).toBe(false);
    });
  });
});
