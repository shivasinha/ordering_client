import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEnGB from '@angular/common/locales/en-GB';
import localeSl from '@angular/common/locales/sl';
import localeSr from '@angular/common/locales/sr';
import { CustomDatePipe } from './custom-date.pipe';
import { DateTimeFormat } from '../../utils/dates';
import { configureDayjs } from '../../utils/dayjs-config';

// Register locale data for testing
registerLocaleData(localeEn);
registerLocaleData(localeEnGB);
registerLocaleData(localeSl);
registerLocaleData(localeSr);

// Ensure dayjs plugins are loaded
configureDayjs();

describe('CustomDatePipe', () => {
  let pipe: CustomDatePipe;
  const savedEnvironment = window.environment;

  beforeEach(() => {
    // Use en-GB locale which gives DD/MM/YYYY
    window.environment = { locale: 'en-GB' };
    pipe = new CustomDatePipe('en-GB');
  });

  afterEach(() => {
    window.environment = savedEnvironment;
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform', () => {
    it('should format a date using default UI_DATE_FORMAT', () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      // en-GB locale: getLocaleDateFormat() returns 'DD/MM/YYYY' → Angular format 'dd/MM/yyyy'
      const result = pipe.transform(date);
      expect(result).toBe('05/01/2025');
    });

    it('should format a date using custom format', () => {
      const date = new Date(2025, 0, 5);
      const result = pipe.transform(date, DateTimeFormat.API_DATE_FORMAT);
      expect(result).toBe('2025-01-05');
    });

    it('should handle null date', () => {
      const result = pipe.transform(null);
      expect(result).toBeNull();
    });

    it('should convert internal locale code to standard locale code', () => {
      const date = new Date(2025, 0, 5);
      // The pipe converts 'e' to 'en-GB' using the locale mapping → DD/MM/YYYY → 05/01/2025
      const result = pipe.transform(date, DateTimeFormat.UI_DATE_FORMAT, undefined, 'e');
      expect(result).toBe('05/01/2025');
    });

    it('should handle Serbian locale code conversion', () => {
      const date = new Date(2025, 0, 5);
      // The pipe converts 'sr-Latn' to 'sr-Latn' (passthrough) using the locale mapping
      const result = pipe.transform(date, DateTimeFormat.UI_DATE_FORMAT, undefined, 'sr-Latn');
      expect(result).toBe('05/01/2025');
    });

    it('should convert dayjs format tokens to Angular format tokens', () => {
      const date = new Date(2025, 0, 5, 14, 30); // Jan 5, 2025, 2:30 PM
      // DD/MM/YYYY should be converted to dd/MM/yyyy
      const result = pipe.transform(date, 'DD/MM/YYYY');
      expect(result).toBe('05/01/2025');
    });
  });
});
