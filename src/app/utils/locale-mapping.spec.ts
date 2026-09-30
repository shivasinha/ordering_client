import { convertToStandardLocale, convertBrowserLanguageToInternal, DEFAULT_LANGUAGE } from './locale-mapping';

describe('locale-mapping', () => {
  describe('convertToStandardLocale', () => {
    it('should convert "da" to "da-DK"', () => {
      expect(convertToStandardLocale('da')).toBe('da-DK');
    });

    it('should convert "e" to "en-GB"', () => {
      expect(convertToStandardLocale('e')).toBe('en-GB');
    });

    it('should keep "sl" as "sl"', () => {
      expect(convertToStandardLocale('sl')).toBe('sl');
    });

    it('should keep "sr-Latn" as "sr-Latn"', () => {
      expect(convertToStandardLocale('sr-Latn')).toBe('sr-Latn');
    });

    it('should return input for unmapped language codes', () => {
      expect(convertToStandardLocale('fr')).toBe('fr');
      expect(convertToStandardLocale('de')).toBe('de');
    });
  });

  describe('convertBrowserLanguageToInternal', () => {
    it('should convert "da" to "da"', () => {
      expect(convertBrowserLanguageToInternal('da')).toBe('da');
    });

    it('should convert "sl" to "sl"', () => {
      expect(convertBrowserLanguageToInternal('sl')).toBe('sl');
    });

    it('should convert "sr" to "sr-Latn"', () => {
      expect(convertBrowserLanguageToInternal('sr')).toBe('sr-Latn');
    });

    it('should convert "en" to "e"', () => {
      expect(convertBrowserLanguageToInternal('en')).toBe('e');
    });

    it('should return default language for unmapped browser languages', () => {
      expect(convertBrowserLanguageToInternal('fr')).toBe(DEFAULT_LANGUAGE);
      expect(convertBrowserLanguageToInternal('de')).toBe(DEFAULT_LANGUAGE);
    });
  });

  describe('DEFAULT_LANGUAGE', () => {
    it('should be "e"', () => {
      expect(DEFAULT_LANGUAGE).toBe('e');
    });
  });
});
