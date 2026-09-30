import { TestBed } from '@angular/core/testing';
import { TranslationsService } from './translations.service';

describe('TranslationsService', () => {
  let service: TranslationsService;
  let languageGetterSpy: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TranslationsService],
    });

    service = TestBed.inject(TranslationsService);

    languageGetterSpy = jest.spyOn(window.navigator, 'language', 'get');
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Constructor and GUI Language Initialization', () => {
    it('should set guiLanguage from localStorage if available', () => {
      localStorage.setItem('language', 'sr-Latn');
      const newService = new TranslationsService();
      expect(newService.guiLanguage).toBe('sr-Latn');
    });

    it('should set guiLanguage from browser settings if localStorage is not available', () => {
      localStorage.removeItem('language');
      languageGetterSpy.mockReturnValue('sl-SI');
      const newService = new TranslationsService();
      expect(newService.guiLanguage).toBe('sl');
    });
  });

  describe('deriveDefaultLanguageFromBrowserSettings', () => {
    it('should return "sl" for Slovenian browser settings', () => {
      languageGetterSpy.mockReturnValue('sl-SI');
      const result = service.deriveDefaultLanguageFromBrowserSettings();
      expect(result).toBe('sl');
    });

    it('should return "sr-Latn" for Serbian browser settings', () => {
      languageGetterSpy.mockReturnValue('sr-RS');
      const result = service.deriveDefaultLanguageFromBrowserSettings();
      expect(result).toBe('sr-Latn');
    });

    it('should return "e" for English browser settings', () => {
      languageGetterSpy.mockReturnValue('en-EN');
      const result = service.deriveDefaultLanguageFromBrowserSettings();
      expect(result).toBe('e');
    });

    it('should return default language "e" for all other browser settings', () => {
      languageGetterSpy.mockReturnValue('fr-FR');
      const result = service.deriveDefaultLanguageFromBrowserSettings();
      expect(result).toBe('e');
    });
  });

  describe('setLanguage', () => {
    it('should set guiLanguage to the provided internal language code', () => {
      service.setLanguage('sr-Latn');
      expect(service.guiLanguage).toBe('sr-Latn');
    });

    it('should set guiLanguage to "e" for English', () => {
      service.setLanguage('e');
      expect(service.guiLanguage).toBe('e');
    });

    it('should set guiLanguage to "sl" for Slovenian', () => {
      service.setLanguage('sl');
      expect(service.guiLanguage).toBe('sl');
    });
  });
});
