import { inject, Injectable } from '@angular/core';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { CustomerName } from '@Ordering/customer-core/enums/customer-name.enum';

type TranslationKey = Parameters<TranslationsService['translate']>[0];

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private tr = inject(TranslationsService);
  private static readonly LANGUAGE_DEFINITIONS: ReadonlyArray<{ value: string; labelKey: TranslationKey }> = [
    { value: 'da', labelKey: 'lblLangDanish' },
    { value: 'sl', labelKey: 'lblLangSlovenian' },
    { value: 'sr-Latn', labelKey: 'lblLangSerbian' },
  ];
  private static readonly CUSTOMER_LANGUAGES: Partial<Record<CustomerName, ReadonlyArray<string>>> = {
    [CustomerName.BDK]: ['da'],
    [CustomerName.SLOVENIA]: ['sl'],
    [CustomerName.SERBIA]: ['sr-Latn'],
  };

  getCustomerName(): CustomerName | '' {
    // Check for runtime environment (set by packaging)
    if (typeof window !== 'undefined' && (window as any).environment?.customerName) {
      return (window as any).environment.customerName as CustomerName | '';
    }
    // Fallback to empty string for generic/product build
    return '';
  }

  /**
   * Returns the path to the logo image.
   * @returns Path to the logo image
   */
  getLogoPath(): string {
    return `/assets/webportal_logo.png`;
  }

  /**
   * Returns the path to the favicon image.
   * @returns Path to the favicon image
   */
  getFaviconPath(): string {
    return `/assets/favicon.ico`;
  }

  /**
   * Returns the path to the login background image.
   * @returns Path to the login background image
   */
  getLoginBackground(): string {
    return `/assets/login_bg.png`;
  }

  /**
   * Returns language options for the given customer, with translated labels.
   * @param customerName - The customer name enum value, or empty string for the generic/product build
   * @returns Array of language options with value and label
   */
  getLanguageOptions(customerName: CustomerName | ''): Array<{ value: string; label: string }> {
    const options = [{ value: 'e', label: this.tr.translate('lblLangEnglish') }];
    const allowedCodes = customerName ? BrandingService.CUSTOMER_LANGUAGES[customerName] : undefined;
    const languages = allowedCodes
      ? BrandingService.LANGUAGE_DEFINITIONS.filter(lang => allowedCodes.includes(lang.value))
      : BrandingService.LANGUAGE_DEFINITIONS;
    for (const lang of languages) {
      options.push({ value: lang.value, label: this.tr.translate(lang.labelKey) });
    }
    return options;
  }
}
