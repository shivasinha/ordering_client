import { Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';

import { DayjsDateAdapter } from './dayjs-date-adapter';
import { DateTimeFormat } from './dates';

/**
 * Configuration object for Day.js date adapter formats used in Angular Material components.
 *
 * Defines how dates should be parsed from user input and displayed in various contexts
 * within date picker components.
 *
 * @property {Object} parse - Formats used when parsing date strings from user input
 * @property {string} parse.dateInput - Format for parsing date input fields
 * @property {Object} display - Formats used when displaying dates to users
 * @property {string} display.dateInput - Format for displaying dates in input fields
 * @property {string} display.monthYearLabel - Format for month/year labels in date picker header
 * @property {string} display.dateA11yLabel - Accessible format for date announcements to screen readers
 * @property {string} display.monthYearA11yLabel - Accessible format for month/year announcements to screen readers
 */
export const DAYJS_DATE_FORMATS = {
  parse: {
    dateInput: DateTimeFormat.UI_DATE_FORMAT,
  },
  display: {
    dateInput: DateTimeFormat.UI_DATE_FORMAT,
    monthYearLabel: DateTimeFormat.monthYearLabel,
    dateA11yLabel: DateTimeFormat.UI_DATE_FORMAT,
    monthYearA11yLabel: DateTimeFormat.monthYear,
  },
};

/**
 * Provides the DayJS date adapter configuration for Angular Material components.
 *
 * This function returns an array of providers that configure Angular Material's date handling
 * to use the DayJS library instead of the default date adapter. It sets up both the date adapter
 * itself and the date formats to be used throughout the application.
 *
 * @returns An array of Angular providers containing:
 *          - DateAdapter configured with DayjsDateAdapter and MAT_DATE_LOCALE dependency
 *          - MAT_DATE_FORMATS configured with DAYJS_DATE_FORMATS value
 *
 * @example
 * ```typescript
 * // In app.config.ts or module providers
 * providers: [
 *   ...provideDayjsDateAdapter()
 * ]
 * ```
 */
export function provideDayjsDateAdapter(): Provider[] {
  return [
    {
      provide: DateAdapter,
      useClass: DayjsDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
    { provide: MAT_DATE_FORMATS, useValue: DAYJS_DATE_FORMATS },
  ];
}
