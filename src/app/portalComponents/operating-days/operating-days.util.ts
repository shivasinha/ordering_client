import { addDaysToDate, dayjs, DateTimeFormat } from '@Ordering/utils/dates';
import { getLocaleDateFormat } from '@Ordering/utils/dayjs-config';
import { DaySet } from '@Ordering/api';

/**
 * Function to get the end date from a given start date and bitmap.
 * @param {string} startDate - The starting date in API format.
 * @param {string} bitmap - A string of '1' and '0' representing operating and non-operating days.
 * @returns {string} The end date as an ISO string for consistent parsing.
 */
export function getEndDateFromBitmap(startDate: string, bitmap: string): string {
  return addDaysToDate(startDate, bitmap.length - 1); // Subtract 1 since start date is included
}

/**
 * Sorts an array of day numbers according to enum order.
 *
 * @param {number[] | undefined} dayNumbers - Array of day numbers to sort
 * @returns {number[]} Array of day numbers sorted by enum value
 *
 * @example
 * ```typescript
 * const dayNumbers = [2, 0, 1];
 * const sorted = sortDayNumbersByEnumOrder(dayNumbers);
 * console.log(sorted); // Output: [0, 1, 2]
 * ```
 */
export function sortDayNumbersByEnumOrder(dayNumbers: number[] | undefined): number[] {
  if (!dayNumbers || dayNumbers.length === 0) {
    return [];
  }

  return dayNumbers.sort((a, b) => a - b);
}

/**
 * Utility function that takes an array of DaySet objects and returns the overall begin and end dates
 * from all the operating days. It combines all DaySets and identifies the earliest begin date
 * and the latest end date across all DaySets.
 *
 * @param {DaySet[]} daySets - Array of DaySet objects containing operating days
 * @returns {{ beginDate: string; endDate: string }} Object containing the earliest begin date and latest end date
 *
 * @example
 * ```typescript
 * const daySets = [
 *   { beginDate: '2024-01-15', daysBitmap: '1111000', selectedDays: [], deselectedDays: [] },
 *   { beginDate: '2024-01-10', daysBitmap: '1110000', selectedDays: [], deselectedDays: [] },
 *   { beginDate: '2024-01-20', daysBitmap: '11111111', selectedDays: [], deselectedDays: [] }
 * ];
 * const range = getCombinedDateRange(daySets);
 * console.log(range); // Output: { beginDate: '2024-01-10', endDate: '2024-01-27' }
 * ```
 */
export function getDateRangeOfCombinedOperatingDays(daySets: DaySet[] | undefined): { beginDate: string; endDate: string } {
  if (!daySets || daySets.length === 0) {
    return { beginDate: '', endDate: '' };
  }

  let earliestBeginDate: dayjs.Dayjs | null = null;
  let latestEndDate: dayjs.Dayjs | null = null;

  for (const daySet of daySets) {
    if (!daySet.beginDate || !daySet.daysBitmap) {
      continue; // Skip invalid DaySet objects
    }

    // Parse the begin date
    const beginDate = dayjs(daySet.beginDate);
    if (!beginDate.isValid()) {
      continue; // Skip DaySet with invalid begin date
    }

    // Calculate the end date for this DaySet
    const endDate = dayjs(getEndDateFromBitmap(daySet.beginDate, daySet.daysBitmap));
    if (!endDate.isValid()) {
      continue; // Skip DaySet with invalid end date calculation
    }

    // Update earliest begin date
    if (!earliestBeginDate || beginDate.isBefore(earliestBeginDate)) {
      earliestBeginDate = beginDate;
    }

    // Update latest end date
    if (!latestEndDate || endDate.isAfter(latestEndDate)) {
      latestEndDate = endDate;
    }
  }

  return {
    beginDate: earliestBeginDate ? earliestBeginDate.format(DateTimeFormat.API_DATE_FORMAT) : '',
    endDate: latestEndDate ? latestEndDate.format(DateTimeFormat.API_DATE_FORMAT) : '',
  };
}

/**
 * Validates whether a date range is valid by checking if both dates are provided,
 * are valid dates, and the start date is not after the end date.
 *
 * @param {string} startDate - The start date as a string
 * @param {string} endDate - The end date as a string
 * @returns {boolean} `true` if the date range is valid, `false` otherwise
 *
 * @example
 * ```typescript
 * isValidDateRange('2023-01-01', '2023-01-31'); // returns true
 * isValidDateRange('2023-01-31', '2023-01-01'); // returns false
 * isValidDateRange('', '2023-01-01'); // returns false
 * isValidDateRange('invalid', '2023-01-01'); // returns false
 * ```
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  if (!start.isValid() || !end.isValid()) return false;

  return !start.isAfter(end);
}

/**
 * Formats a Date object into a display-friendly date format string.
 *
 * @param {Date | string} date - The Date object or string to be formatted
 * @param {string} [format] - Optional dayjs format string. Defaults to the locale-aware
 *        short date format from `getLocaleDateFormat()`. Pass an explicit format to override.
 * @returns A formatted date string
 *
 * @example
 * ```typescript
 * const date = new Date('2023-12-25');
 * const formatted = formatDisplayDate(date); // uses locale-aware format automatically
 * ```
 */
export function formatDisplayDate(date: Date | string, format = getLocaleDateFormat()): string {
  return dayjs(date).format(format);
}

/**
 * Compares two arrays of numbers for equality, regardless of element order.
 *
 * @param arr1 - The first array to compare
 * @param arr2 - The second array to compare
 * @returns True if both arrays contain the same elements (regardless of order), false otherwise
 *
 * @example
 * ```typescript
 * arraysEqual([1, 2, 3], [3, 1, 2]); // returns true
 * arraysEqual([1, 2, 3], [1, 2]); // returns false
 * arraysEqual([1, 2], [2, 1]); // returns true
 * ```
 */
export function arraysEqual(arr1: number[], arr2: number[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((val, index) => val === sorted2[index]);
}
