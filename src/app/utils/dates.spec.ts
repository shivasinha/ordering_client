import { configureDayjs } from '@Ordering/utils/dayjs-config';
import { addDaysToDate, normalizeToAPIDate, DateTimeFormat } from './dates';

// Ensure dayjs plugins (localeData etc.) are loaded before any test runs
configureDayjs();

/**
 * Unit tests for dates.ts utility functions
 */
describe('dates utilities', () => {
  describe('addDaysToDate', () => {
    it('adds days to API format date string', () => {
      expect(addDaysToDate('2025-02-01', 5)).toBe('2025-02-06');
    });

    it('adds one day when UI date provided (lenient dayjs parse)', () => {
      // dayjs can parse this UI date even though addDaysToDate does not enforce strictness
      expect(addDaysToDate('01/02/2025', 1)).toBe('2025-02-02');
    });

    it('returns empty string for invalid input', () => {
      expect(addDaysToDate('99/99/2025', 1)).toBe('');
    });
  });

  describe('normalizeToAPIDate', () => {
    it('returns API string for Date object', () => {
      const d = new Date(2025, 0, 15); // Jan 15 2025
      expect(normalizeToAPIDate(d)).toBe('2025-01-15');
    });

    it('returns original API date if already in API format', () => {
      expect(normalizeToAPIDate('2025-03-10')).toBe('2025-03-10');
    });

    it('returns empty string for null', () => {
      expect(normalizeToAPIDate(null)).toBe('');
    });
  });

  describe('consistency checks', () => {
    it('UI_DATE_FORMAT static fallback should be DD/MM/YYYY', () => {
      expect(DateTimeFormat.UI_DATE_FORMAT).toBe('DD/MM/YYYY');
    });

    it('API_DATE_FORMAT should be ISO_DATE_FORMAT', () => {
      expect(DateTimeFormat.API_DATE_FORMAT).toBe(DateTimeFormat.ISO_DATE_FORMAT);
    });
  });

  describe('DateTimeFormat.localeDateTime', () => {
    const savedEnvironment = window.environment;

    afterEach(() => {
      window.environment = savedEnvironment;
    });

    it('returns 24-hour format for en-GB locale', () => {
      window.environment = { locale: 'en-GB' };
      expect(DateTimeFormat.localeDateTime).toBe('DD/MM/YYYY HH:mm');
    });

    it('returns 24-hour format for sl-SI locale', () => {
      window.environment = { locale: 'sl-SI' };
      expect(DateTimeFormat.localeDateTime).toBe('DD.MM.YYYY H:mm');
    });

    it('returns 24-hour format for sr-Latn locale', () => {
      window.environment = { locale: 'sr-Latn' };
      expect(DateTimeFormat.localeDateTime).toBe('D. M. YYYY. H:mm');
    });
  });
});
