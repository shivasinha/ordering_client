// Mock @angular/material/core to avoid JIT compilation errors in Jest.
// CustomDateAdapter only uses NativeDateAdapter from this package.
jest.mock('@angular/material/core', () => {
  class NativeDateAdapter {
    isValid(date: Date): boolean {
      return date instanceof Date && !isNaN(date.getTime());
    }
  }
  return { NativeDateAdapter, MAT_DATE_LOCALE: 'MAT_DATE_LOCALE' };
});

import { CustomDateAdapter } from './custom-date-adapter';
import { DateTimeFormat } from './dates';
import { configureDayjs, setDayjsLocale } from './dayjs-config';

// Ensure dayjs plugins are loaded
configureDayjs();

describe('CustomDateAdapter', () => {
  let adapter: CustomDateAdapter;
  const savedEnvironment = window.environment;

  beforeEach(() => {
    // Default test environment: Serbian locale (DD. MM. YYYY)
    window.environment = { locale: 'sr-Latn-RS' };
    setDayjsLocale('en'); // language for display names
    adapter = new CustomDateAdapter('en-GB');
  });

  afterEach(() => {
    window.environment = savedEnvironment;
  });

  describe('format', () => {
    it('returns empty string for invalid date', () => {
      const invalid = new Date('invalid');
      expect(isNaN(invalid.getTime())).toBe(true);
      expect(adapter.format(invalid)).toBe('');
    });

    it('formats valid date using locale-aware format by default (Serbian)', () => {
      const d = new Date(2025, 0, 5); // Jan 05 2025
      // Serbian locale dayjs 'L' format: D. M. YYYY.
      expect(adapter.format(d)).toBe('5. 1. 2025.');
    });

    it('formats valid date using Slovenian locale', () => {
      window.environment = { locale: 'sl-SI' };
      const d = new Date(2025, 0, 5);
      // Slovenian locale 'L' format: DD.MM.YYYY  (dayjs 'sl' → DD.MM.YYYY)
      expect(adapter.format(d)).toBe('05.01.2025');
    });

    it('formats valid date using English locale fallback', () => {
      window.environment = { locale: 'en-GB' };
      const d = new Date(2025, 0, 5);
      // en-GB locale 'L' format: DD/MM/YYYY
      expect(adapter.format(d)).toBe('05/01/2025');
    });

    it('formats valid date when environment is undefined (fallback to en-GB)', () => {
      window.environment = undefined;
      const d = new Date(2025, 0, 5);
      expect(adapter.format(d)).toBe('05/01/2025');
    });

    it('uses provided displayFormat if given', () => {
      const d = new Date(2025, 6, 15); // Jul 15
      expect(adapter.format(d, DateTimeFormat.API_DATE_FORMAT)).toBe('2025-07-15');
    });
  });

  describe('parse', () => {
    it('returns null for falsy value', () => {
      expect(adapter.parse('')).toBeNull();
      expect(adapter.parse(null as any)).toBeNull();
    });

    it('parses Serbian locale format date strictly (D. M. YYYY.)', () => {
      // Serbian 'L' format is 'D. M. YYYY.' — single-digit day/month without leading zeros
      const parsed = adapter.parse('5. 1. 2025.');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2025);
      expect(parsed?.getMonth()).toBe(0);
      expect(parsed?.getDate()).toBe(5);
    });

    it('parses English locale format date strictly (DD/MM/YYYY)', () => {
      window.environment = { locale: 'en-GB' };
      const parsed = adapter.parse('05/01/2025');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2025);
      expect(parsed?.getMonth()).toBe(0);
      expect(parsed?.getDate()).toBe(5);
    });

    it('parses API (ISO) format date strictly', () => {
      const parsed = adapter.parse('2025-01-05');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2025);
      expect(parsed?.getMonth()).toBe(0);
      expect(parsed?.getDate()).toBe(5);
    });

    it('returns null for RFC 2822 / free-form date strings (lenient parsing disabled)', () => {
      // Lenient dayjs(value) fallback is intentionally removed to prevent month/day swaps.
      // Only the locale format and ISO format are accepted.
      const parsed = adapter.parse('Tue, 05 Jan 2025 00:00:00 GMT');
      expect(parsed).toBeNull();
    });

    it('returns null for clearly invalid string', () => {
      expect(adapter.parse('not-a-date')).toBeNull();
    });
  });

  describe('getYearName', () => {
    it('should return year as string without trailing dots', () => {
      const d = new Date(2025, 0, 1);
      expect(adapter.getYearName(d)).toBe('2025');
    });

    it('should handle different years correctly', () => {
      const d2005 = new Date(2005, 5, 15);
      const d2006 = new Date(2006, 11, 31);
      expect(adapter.getYearName(d2005)).toBe('2005');
      expect(adapter.getYearName(d2006)).toBe('2006');
    });
  });

  describe('getDateNames', () => {
    it('should return day numbers 1-31 without locale-specific formatting', () => {
      const dateNames = adapter.getDateNames();
      expect(dateNames.length).toBe(31);
      expect(dateNames[0]).toBe('1');
      expect(dateNames[30]).toBe('31');
      // Ensure no dots or other punctuation
      dateNames.forEach(name => {
        expect(name).not.toContain('.');
      });
    });
  });

  describe('getMonthNames', () => {
    it('should return 12 month names for each style', () => {
      expect(adapter.getMonthNames('long').length).toBe(12);
      expect(adapter.getMonthNames('short').length).toBe(12);
      expect(adapter.getMonthNames('narrow').length).toBe(12);
    });

    it('should return month names without trailing dots', () => {
      const longMonths = adapter.getMonthNames('long');
      const shortMonths = adapter.getMonthNames('short');

      longMonths.forEach(month => {
        expect(month).not.toMatch(/\.$/);
      });
      shortMonths.forEach(month => {
        expect(month).not.toMatch(/\.$/);
      });
    });

    it('should return English month names when dayjs locale is en', () => {
      setDayjsLocale('en');
      const longMonths = adapter.getMonthNames('long');
      expect(longMonths[0]).toBe('January');
      expect(longMonths[11]).toBe('December');
    });
  });

  describe('getDayOfWeekNames', () => {
    it('should return 7 day names for each style', () => {
      expect(adapter.getDayOfWeekNames('long').length).toBe(7);
      expect(adapter.getDayOfWeekNames('short').length).toBe(7);
      expect(adapter.getDayOfWeekNames('narrow').length).toBe(7);
    });

    it('should return day names without trailing dots', () => {
      const longDays = adapter.getDayOfWeekNames('long');
      const shortDays = adapter.getDayOfWeekNames('short');

      longDays.forEach(day => {
        expect(day).not.toMatch(/\.$/);
      });
      shortDays.forEach(day => {
        expect(day).not.toMatch(/\.$/);
      });
    });

    it('should return English day names when dayjs locale is en', () => {
      setDayjsLocale('en');
      const longDays = adapter.getDayOfWeekNames('long');
      expect(longDays[0]).toBe('Sunday');
      expect(longDays[1]).toBe('Monday');
    });
  });
});
