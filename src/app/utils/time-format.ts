import { dayjs } from '@Ordering/utils/dayjs-config';
import { DateTimeFormat } from '@Ordering/utils/dates';

/**
 * Normalises a time value to the canonical `HH:mm` string.
 *
 * Uses explicit-format parsing rather than concatenating a dummy date, so it is
 * safe and readable for time-only values.
 *
 * @param {string | number | null | undefined} time - Time value in `HH:mm` form.
 * @returns {string} The normalised `HH:mm` string, or an empty string when invalid.
 */
export function formatTimeToHourMinute(time: string | number | null | undefined): string {
  if (time === null || time === undefined || time === '') {
    return '';
  }
  const parsed = dayjs(String(time), DateTimeFormat.hourMinute);
  return parsed.isValid() ? parsed.format(DateTimeFormat.hourMinute) : '';
}
