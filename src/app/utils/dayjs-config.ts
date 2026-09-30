import dayjs, { Dayjs } from 'dayjs';

import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isBetween from 'dayjs/plugin/isBetween';
import localeData from 'dayjs/plugin/localeData';
import updateLocale from 'dayjs/plugin/updateLocale';

// Import locales
import 'dayjs/locale/da'; // Danish
import 'dayjs/locale/en-gb';
import 'dayjs/locale/sl'; // Slovenian
import 'dayjs/locale/sr'; // Serbian

export type DayjsInput = Parameters<typeof dayjs>[0];

/** Default formatting locale used when `window.environment.locale` is not set. */
const DEFAULT_LOCALE = 'en-GB';

/**
 * Configure and extend dayjs with necessary plugins
 * This file centralizes all dayjs plugin configurations
 */
export function configureDayjs(): void {
  // Extend dayjs with plugins
  dayjs.extend(isSameOrAfter);
  dayjs.extend(isSameOrBefore);
  dayjs.extend(customParseFormat);
  dayjs.extend(isBetween);
  dayjs.extend(localeData);
  dayjs.extend(updateLocale);
}

/**
 * Maps standard Angular locale codes to dayjs locale keys.
 *
 * dayjs registers locales under lowercase filename-based keys (e.g. 'en-gb', 'sl', 'sr').
 * Angular uses codes like 'en-GB', 'sr-Latn' which don't match dayjs keys.
 * This map bridges the two systems.
 */
const ANGULAR_LOCALE_TO_DAYJS_KEY: Record<string, string> = {
  'da-dk': 'da', // Danish: 'da-DK' -> 'da'
  'en-gb': 'en-gb',
  sl: 'sl',
  'sr-latn': 'sr', // dayjs has no 'sr-Latn' locale, only 'sr'
};

/**
 * Sets the locale for dayjs to format dates according to the specified language.
 *
 * Accepts Angular-standard locale codes (e.g. 'en-GB', 'sr-Latn') as produced by
 * `convertToStandardLocale()` and maps them to the correct dayjs locale key.
 *
 * @param {string} locale - The standard locale code (e.g., 'en-GB', 'sl', 'sr-Latn')
 *
 * @example
 * ```typescript
 * setDayjsLocale('sl'); // Sets Slovenian locale
 * dayjs().format('MMMM YYYY'); // Returns "januar 2025" instead of "January 2025"
 * ```
 */
export function setDayjsLocale(locale: string): void {
  const key = (locale || 'en').toLowerCase();
  dayjs.locale(ANGULAR_LOCALE_TO_DAYJS_KEY[key] ?? key);
}

/**
 * Returns the raw formatting locale string from the runtime environment config.
 * Falls back to 'en-GB' if not set.
 *
 * Use this instead of accessing `window.environment?.locale` directly.
 */
export function getEnvironmentLocale(): string {
  return window.environment?.locale || DEFAULT_LOCALE;
}

/**
 * Returns a locale-aware format string based on the formatting locale from `window.environment.locale`.
 *
 * Reads the requested token from the dayjs locale registry without switching the global locale.
 * This is a pure function — no Angular service injection required.
 *
 * @param {'L' | 'LT'} token - The dayjs locale format token to resolve:
 *   - `'L'`  — short date format (e.g. `'DD/MM/YYYY'` for en-GB, `'MM/DD/YYYY'` for en-US) — **default**
 *   - `'LT'` — short time format (e.g. `'HH:mm'` for en-GB/sr/sl, `'h:mm A'` for en-US)
 * @returns {string} The resolved dayjs format string for the environment locale.
 *
 * @example
 * getLocaleDateFormat();        // 'DD/MM/YYYY'  (date only, default)
 * getLocaleDateFormat('LT');    // 'HH:mm'       (time only, 24h locale)
 */
/**
 * Maps environment locale (lowercased) to the dayjs locale key.
 * Needed because dayjs registers locales by filename (e.g. 'en-gb', 'sl', 'sr'),
 * but environment.js uses values like 'sl-SI' or 'sr-Latn' that don't match.
 */
const ENV_LOCALE_TO_DAYJS_KEY: Record<string, string> = {
  'da-dk': 'da', // Danish: 'da-DK' -> 'da'
  'en-gb': 'en-gb',
  'sl-si': 'sl',
  'sr-latn': 'sr',
};

export function getLocaleDateFormat(token: 'L' | 'LT' = 'L'): string {
  const envLocale = window.environment?.locale || DEFAULT_LOCALE;
  const dayjsKey = ENV_LOCALE_TO_DAYJS_KEY[envLocale.toLowerCase()] ?? envLocale.toLowerCase();
  return dayjs().locale(dayjsKey).localeData().longDateFormat(token);
}

export { dayjs };
export type { Dayjs };
