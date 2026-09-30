import { dayjs, getLocaleDateFormat } from '@Ordering/utils/dayjs-config';

// Export the configured dayjs instance for use throughout the application
export { dayjs };

/**
 * Global date time string format config
 */
export class DateTimeFormat {
  public static readonly ISO_DATE_FORMAT = 'YYYY-MM-DD';
  /**
   * API date format constant - format expected by backend APIs
   * Used when sending date data to backend services.
   *
   * @example
   * // Usage in components:
   * import { API_DATE_FORMAT } from '@Ordering/utils/dates';
   * const apiDate = dayjs(userDate).format(API_DATE_FORMAT);
   */
  public static readonly API_DATE_FORMAT = DateTimeFormat.ISO_DATE_FORMAT;
  /**
   * UI display date format — static fallback only.
   *
   * At runtime, prefer `getLocaleDateFormat()` from `dayjs-config.ts` which reads
   * the locale-aware format from dayjs localeData (the 'L' token).  This constant
   * is kept for situations where the function is not yet available (e.g. static
   * type annotations, unit-test defaults).
   */
  public static readonly UI_DATE_FORMAT = 'DD/MM/YYYY';
  /** Hour Minute - example: 12:00 */
  public static readonly hourMinute: string = 'HH:mm';
  /** Year Month Date Hour Minute Second for INTERNAL operations - example: 2025-08-20 00:00:00 */
  public static readonly yearMonthDateDayStartTime: string = `${DateTimeFormat.API_DATE_FORMAT} 00:00:00`;
  /** Format of month and year i.e. June 2025 */
  public static readonly monthYear: string = 'MMMM YYYY';
  /** Format of month and year label i.e. Jun 2025 */
  public static readonly monthYearLabel: string = 'MMM YYYY';

  /**
   * Locale-aware date + time format (e.g. 'DD/MM/YYYY h:mm A' for en-US, 'DD/MM/YYYY HH:mm' for en-GB).
   * The time portion uses the locale's preferred convention — 12-hour AM/PM or 24-hour — via the 'LT' token.
   * Evaluated at call time so it always reflects the current environment locale.
   */
  public static get localeDateTime(): string {
    return `${getLocaleDateFormat()} ${getLocaleDateFormat('LT')}`;
  }
}

/**
 * Adds a specified number of days to a given date string.
 *
 * @param {string} dateStr  - The date string to which days will be added. The string should be in a format recognized by dayjs.
 * @param {number} days - The number of days to add to the date.
 * @returns {string} A new date string with the specified number of days added, in API format for consistent parsing.
 *          Returns an empty string if the input date string is invalid.
 */
export function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return '';
  // Try strict API/ISO format first (most reliable for unambiguous parsing)
  let base = dayjs(dateStr, DateTimeFormat.API_DATE_FORMAT, true);
  if (!base.isValid()) {
    // Try strict static UI format as fallback
    base = dayjs(dateStr, DateTimeFormat.UI_DATE_FORMAT, true);
  }
  if (!base.isValid()) {
    // final fallback lenient parse (may still interpret ambiguous strings in locale-specific manner)
    base = dayjs(dateStr);
  }
  return base.isValid() ? base.add(days, 'day').format(DateTimeFormat.API_DATE_FORMAT) : '';
}

/**
 * Normalizes a date input (string or Date object) to the standard API date format (YYYY-MM-DD).
 * If the input is null, undefined, or an empty string, it returns an empty string.
 *
 * @param {string | Date | null | undefined} value - The date input to be normalized.
 * @returns {string} A date string formatted as 'YYYY-MM-DD' or an empty string if the input is invalid.
 * ```
 */
export function normalizeToAPIDate(value: string | Date | null | undefined): string {
  if (!value) return '';

  return dayjs(value).format(DateTimeFormat.API_DATE_FORMAT);
}
