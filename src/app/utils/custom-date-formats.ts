import { MatDateFormats } from '@angular/material/core';
import { DateTimeFormat } from '@Ordering/utils/dates';
import { getLocaleDateFormat } from '@Ordering/utils/dayjs-config';

/**
 * Creates Angular Material date formats configuration using the locale-aware
 * date format from the environment.
 *
 * This ensures all mat-date-range-input and other Angular Material date components
 * display and parse dates in the format defined by the current formatting locale
 * (e.g., DD/MM/YYYY for 'en', DD. MM. YYYY for 'sr').
 */
export function createCustomDateFormats(): MatDateFormats {
  const dateFormat = getLocaleDateFormat();
  return {
    parse: {
      // Not used by CustomDateAdapter (it handles parsing internally),
      // but required by the MatDateFormats interface.
      dateInput: dateFormat,
    },
    display: {
      // Format shown in input fields
      dateInput: dateFormat,
      // Format for month/year headers in calendar
      monthYearLabel: DateTimeFormat.monthYearLabel,
      // Accessibility label for dates
      dateA11yLabel: dateFormat,
      // Accessibility label for month/year
      monthYearA11yLabel: DateTimeFormat.monthYear,
    },
  };
}
