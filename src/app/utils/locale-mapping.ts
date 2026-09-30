/**
 * Centralized locale mapping utility.
 *
 * This module handles the conversion between internal (non-standard) language codes
 * used in translations.json and standard locale codes used by Angular, dayjs, and Material.
 *
 * This is a workaround for technical debt where translations.json uses non-standard
 * language abbreviations that cannot be changed without breaking existing data.
 */

/**
 * Default internal language code when no language is detected or set.
 */
export const DEFAULT_LANGUAGE = 'e';

/**
 * Maps browser language codes to internal (non-standard) translation.json keys.
 * Used to determine which internal language code to use based on browser settings.
 */
const BASE_LANGUAGE_TO_INTERNAL_LANGUAGE_MAPPING: Record<string, string> = {
  da: 'da', // Danish -> Danish
  en: 'e', // English -> English
  sl: 'sl', // Slovenian -> Slovenian
  sr: 'sr-Latn', // Serbian -> Serbian Latin
};

/**
 * Maps internal (non-standard) language codes to standard locale codes.
 *
 * Internal codes (from translations.json):
 * - 'e': English (non-standard, should be 'en')
 * - 'sl': Slovenian (already standard)
 * - 'sr-Latn': Serbian Latin (should be 'sr' for standard locale systems)
 */
const INTERNAL_TO_STANDARD_LOCALE_MAPPING: Record<string, string> = {
  da: 'da-DK', // Danish: 'da' -> 'da-DK'
  e: 'en-GB', // English: 'e' -> 'en-GB'
  sl: 'sl', // Slovenian: already standard
  'sr-Latn': 'sr-Latn', // Serbian Latin: keep as sr-Latn (registered locale)
};

/**
 * Converts a browser language code to an internal language code.
 *
 * @param {string} browserLanguage - The browser language code (e.g., 'sl', 'sr', 'en')
 * @returns {string} The internal language code (e.g., 'sl', 'sr-Latn', 'e')
 *
 * @example
 * ```typescript
 * convertBrowserLanguageToInternal('sl');  // Returns 'sl'
 * convertBrowserLanguageToInternal('sr');  // Returns 'sr-Latn'
 * convertBrowserLanguageToInternal('en');  // Returns 'e' (default)
 * ```
 */
export function convertBrowserLanguageToInternal(browserLanguage: string): string {
  return BASE_LANGUAGE_TO_INTERNAL_LANGUAGE_MAPPING[browserLanguage] || DEFAULT_LANGUAGE;
}

/**
 * Converts an internal language code to a standard locale code.
 *
 * @param {string} internalCode - The internal language code (e.g., 'e', 'sl', 'sr-Latn')
 * @returns {string} The standard locale code (e.g., 'en', 'sl', 'sr')
 *
 * @example
 * ```typescript
 * convertToStandardLocale('e');        // Returns 'en-GB'
 * convertToStandardLocale('sr-Latn');  // Returns 'sr-Latn'
 * convertToStandardLocale('sl');       // Returns 'sl'
 * convertToStandardLocale('unknown');  // Returns 'unknown' (fallback)
 * ```
 */
export function convertToStandardLocale(internalCode: string): string {
  return INTERNAL_TO_STANDARD_LOCALE_MAPPING[internalCode] || internalCode;
}
