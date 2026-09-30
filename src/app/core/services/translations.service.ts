import { Injectable } from '@angular/core';

import { TranslationsServiceBase } from '@tps/angular-translation';

import * as translationsSource from '../../../assets/lang/translations.json';
import { enumMaps } from '@Ordering/data/custom/enum-maps';
import { generateTranslationKey } from '@Ordering/utils/translation-key-genrator';
import { convertBrowserLanguageToInternal, convertToStandardLocale } from '@Ordering/utils/locale-mapping';
import { setDayjsLocale } from '@Ordering/utils/dayjs-config';

@Injectable()
export class TranslationsService extends TranslationsServiceBase<typeof translationsSource> {
  constructor() {
    super();
    this.translations = translationsSource;
    const currentLanguage = localStorage.getItem('language');
    if (currentLanguage) {
      this.setLanguage(currentLanguage);
    } else {
      this.setLanguage(this.deriveDefaultLanguageFromBrowserSettings());
    }
  }

  /**
   * Determines the default language to use based on the browser's settings.
   *
   * Extracts the base language code from the browser's `navigator.language` property,
   * then converts it to the application's internal language representation using
   * `convertBrowserLanguageToInternal`.
   *
   * @returns {string} The application's internal language code derived from the browser settings.
   */
  public deriveDefaultLanguageFromBrowserSettings(): string {
    const baseLanguage = navigator.language.split('-')[0];
    return convertBrowserLanguageToInternal(baseLanguage);
  }

  /**
   * Sets the application's current UI language for translations and updates
   * dayjs locale for localized display names (month names, day-of-week names).
   *
   * Note: This does NOT change the formatting locale (date/number structure).
   * The formatting locale is controlled independently by the environment config.
   *
   * @param {string} lang - The internal language code to set (e.g., 'e', 'sl', 'sr-Latn-RS').
   */
  public setLanguage(lang: string): void {
    this.guiLanguage = lang;

    // Update dayjs locale so localized names (months, days) reflect the chosen language
    const standardLang = convertToStandardLocale(lang);
    setDayjsLocale(standardLang);
  }

  /**
   * Translates an enum value to its display string, optionally using a translation key.
   *
   * @param {number} value - The numeric value of the enum member to translate.
   * @param {keyof typeof enumMaps} enumName - The name of the enum as a key in the `enumMaps` object.
   * @param {boolean} translateEnum - If `true`, attempts to translate the enum value using a generated translation key;
   *                        if `false`, returns the original enum value string. Defaults to `false`.
   * @returns {string} The translated string if found, the original enum value string if translation is not requested or not found,
   *          or an empty string if the enum or value is not defined.
   */
  public translateEnumValue(value: number, enumName: keyof typeof enumMaps, translateEnum: boolean = false): string {
    const enumMap = enumMaps[enumName];
    if (!enumMap) {
      console.error(`Enum "${enumName}" is not defined in enum maps list.`);
      return '';
    }

    const enumValue = enumMap[value];
    if (!enumValue) {
      return '';
    }

    // If translation is not requested, return the original enum value
    if (!translateEnum) {
      return enumValue;
    }

    // Create translation key using standard naming convention: lbl{CamelCaseEnumValue}
    const translationKey = generateTranslationKey(enumValue, 'lbl');

    // Try to get translation, fallback to original enum value if not found
    try {
      const translation = this.translate(translationKey as any);

      // If translation returns the same key (not found), return original enum value
      return translation === translationKey ? enumValue : translation;
    } catch (error) {
      console.warn(`Failed to translate enum value for key "${translationKey}":`, error);
      // Return original enum value as fallback
      return enumValue;
    }
  }
}
