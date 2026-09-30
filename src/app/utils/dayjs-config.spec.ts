import { configureDayjs, setDayjsLocale, getLocaleDateFormat, dayjs } from './dayjs-config';

// Ensure dayjs plugins are loaded
configureDayjs();

describe('dayjs-config', () => {
  const savedEnvironment = window.environment;

  afterEach(() => {
    window.environment = savedEnvironment;
    setDayjsLocale('en'); // Reset to default
  });

  describe('configureDayjs', () => {
    it('should enable customParseFormat plugin', () => {
      // customParseFormat allows strict parsing with format strings
      const parsed = dayjs('05.01.2025', 'DD.MM.YYYY', true);
      expect(parsed.isValid()).toBe(true);
      expect(parsed.year()).toBe(2025);
      expect(parsed.month()).toBe(0);
      expect(parsed.date()).toBe(5);
    });

    it('should enable isSameOrAfter plugin', () => {
      const a = dayjs('2025-01-10');
      const b = dayjs('2025-01-05');
      expect(a.isSameOrAfter(b)).toBe(true);
    });

    it('should enable isSameOrBefore plugin', () => {
      const a = dayjs('2025-01-05');
      const b = dayjs('2025-01-10');
      expect(a.isSameOrBefore(b)).toBe(true);
    });

    it('should enable isBetween plugin', () => {
      const d = dayjs('2025-01-05');
      expect(d.isBetween('2025-01-01', '2025-01-10')).toBe(true);
    });
  });

  describe('setDayjsLocale', () => {
    it('should set dayjs locale to the specified language', () => {
      setDayjsLocale('sl');
      const monthName = dayjs().month(0).format('MMMM');
      // Slovenian month name for January
      expect(monthName).toBe('januar');
    });

    it('should fall back to en when empty string is passed', () => {
      setDayjsLocale('');
      const monthName = dayjs().month(0).format('MMMM');
      expect(monthName).toBe('January');
    });

    it('should set en locale', () => {
      setDayjsLocale('en');
      const monthName = dayjs().month(0).format('MMMM');
      expect(monthName).toBe('January');
    });

    it('should set Danish locale for da-DK', () => {
      setDayjsLocale('da-DK');
      const monthName = dayjs().month(0).format('MMMM');
      // Danish month name for January is 'januar'
      expect(monthName).toBe('januar');
    });

    it('should set Danish locale with unique weekday name', () => {
      setDayjsLocale('da-DK');
      const sundayName = dayjs().day(0).format('dddd');
      // Danish Sunday is 'søndag' — differs from Slovenian 'nedelja', confirms correct locale
      expect(sundayName).toBe('søndag');
    });
  });

  describe('getLocaleDateFormat', () => {
    it('should return Serbian format for sr-Latn locale', () => {
      window.environment = { locale: 'sr-Latn' };
      // Serbian dayjs 'L' format is 'D. M. YYYY.'
      expect(getLocaleDateFormat()).toBe('D. M. YYYY.');
    });

    it('should return Slovenian format for sl-SI locale', () => {
      window.environment = { locale: 'sl-SI' };
      expect(getLocaleDateFormat()).toBe('DD.MM.YYYY');
    });

    it('should return Danish date format for da-DK locale', () => {
      window.environment = { locale: 'da-DK' };
      // Danish dayjs 'L' format is 'DD.MM.YYYY'
      expect(getLocaleDateFormat()).toBe('DD.MM.YYYY');
    });

    it('should return English format for en-GB locale', () => {
      window.environment = { locale: 'en-GB' };
      expect(getLocaleDateFormat()).toBe('DD/MM/YYYY');
    });

    it('should fall back to DD/MM/YYYY when environment is undefined', () => {
      window.environment = undefined;
      expect(getLocaleDateFormat()).toBe('DD/MM/YYYY');
    });

    it('should fall back to DD/MM/YYYY when locale is not set', () => {
      window.environment = {};
      expect(getLocaleDateFormat()).toBe('DD/MM/YYYY');
    });

    it('should extract base locale key from BCP-47 tags', () => {
      // sr-Latn → 'sr', Serbian dayjs 'L' format is 'D. M. YYYY.'
      window.environment = { locale: 'sr-Latn' };
      const format = getLocaleDateFormat();
      expect(format).toBe('D. M. YYYY.');
    });
  });

  describe('getLocaleDateFormat (LT token)', () => {
    it('should return 24-hour time format for en-GB locale', () => {
      window.environment = { locale: 'en-GB' };
      expect(getLocaleDateFormat('LT')).toBe('HH:mm');
    });

    it('should return 24-hour time format for sl-SI locale', () => {
      window.environment = { locale: 'sl-SI' };
      expect(getLocaleDateFormat('LT')).toBe('H:mm');
    });

    it('should return 24-hour time format for sr-Latn locale', () => {
      window.environment = { locale: 'sr-Latn' };
      expect(getLocaleDateFormat('LT')).toBe('H:mm');
    });

    it('should fall back to HH:mm (en-GB) when environment is undefined', () => {
      window.environment = undefined;
      expect(getLocaleDateFormat('LT')).toBe('HH:mm');
    });
  });
});
