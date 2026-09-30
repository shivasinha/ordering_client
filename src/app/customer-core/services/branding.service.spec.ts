import { TestBed } from '@angular/core/testing';
import { BrandingService } from './branding.service';
import { CustomerName } from '@Ordering/customer-core/enums/customer-name.enum';
import { TranslationsService } from '@Ordering/core/services/translations.service';

describe('BrandingService', () => {
  let service: BrandingService;

  class MockTranslationsService {
    translate(key: string) {
      return key;
    }
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BrandingService, { provide: TranslationsService, useClass: MockTranslationsService }],
    });
    service = TestBed.inject(BrandingService);
  });

  afterEach(() => {
    // Clean up window.environment after each test
    delete (window as any).environment;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCustomerName', () => {
    it('should read customer name from window.environment', () => {
      (window as any).environment = { customerName: 'test-customer' };
      expect(service.getCustomerName()).toBe('test-customer');
    });

    it('should fallback to empty string when not set', () => {
      expect(service.getCustomerName()).toBe('');
    });
  });

  describe('getLogoPath', () => {
    it('should return webportal logo PNG path', () => {
      expect(service.getLogoPath()).toBe('/assets/webportal_logo.png');
    });
  });

  describe('getFaviconPath', () => {
    it('should return the correct favicon path', () => {
      expect(service.getFaviconPath()).toBe('/assets/favicon.ico');
    });
  });

  describe('getLoginBackground', () => {
    it('should return the correct login background path', () => {
      expect(service.getLoginBackground()).toBe('/assets/login_bg.png');
    });
    it('should return string type for login background', () => {
      expect(typeof service.getLoginBackground()).toBe('string');
    });
  });

  describe('getLanguageOptions', () => {
    it('should return English + Danish for BDK', () => {
      const options = service.getLanguageOptions(CustomerName.BDK);
      expect(options).toEqual([
        { value: 'e', label: 'lblLangEnglish' },
        { value: 'da', label: 'lblLangDanish' },
      ]);
    });

    it('should return English + Slovenian for Slovenia', () => {
      const options = service.getLanguageOptions(CustomerName.SLOVENIA);
      expect(options).toEqual([
        { value: 'e', label: 'lblLangEnglish' },
        { value: 'sl', label: 'lblLangSlovenian' },
      ]);
    });

    it('should return English + Serbian for Serbia', () => {
      const options = service.getLanguageOptions(CustomerName.SERBIA);
      expect(options).toEqual([
        { value: 'e', label: 'lblLangEnglish' },
        { value: 'sr-Latn', label: 'lblLangSerbian' },
      ]);
    });

    it('should include English always', () => {
      const options = service.getLanguageOptions('');
      expect(options[0]).toEqual({ value: 'e', label: 'lblLangEnglish' });
    });

    it('should return English + Danish + Slovenian + Serbian for generic/product build', () => {
      const options = service.getLanguageOptions('');
      expect(options).toEqual([
        { value: 'e', label: 'lblLangEnglish' },
        { value: 'da', label: 'lblLangDanish' },
        { value: 'sl', label: 'lblLangSlovenian' },
        { value: 'sr-Latn', label: 'lblLangSerbian' },
      ]);
    });
  });
});
