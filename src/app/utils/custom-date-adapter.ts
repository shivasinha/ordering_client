import { Inject, Injectable, Optional } from '@angular/core';
import { MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { dayjs, getEnvironmentLocale, getLocaleDateFormat } from '@Ordering/utils/dayjs-config';
import { DateTimeFormat } from '@Ordering/utils/dates';

/**
 * Custom date adapter that extends Angular Material's NativeDateAdapter
 * to use the locale-aware date format for display and parsing.
 *
 * - **Formatting locale** (from environment): Controls structural formatting rules like
 *   date format (DD/MM/YYYY vs DD.MM.YYYY). Determined by `window.environment.locale`.
 * - **Language** (for display names): Month names, day-of-week names, etc. are driven
 *   by the global dayjs locale, which is set by TranslationsService.setLanguage().
 *
 * The actual date *format* is determined at runtime by `getLocaleDateFormat()` from
 * `dayjs-config.ts`, which reads the 'L' (short date) format from dayjs locale data.
 */
@Injectable()
export class CustomDateAdapter extends NativeDateAdapter {
  constructor(@Optional() @Inject(MAT_DATE_LOCALE) matDateLocale?: string) {
    super(matDateLocale || getEnvironmentLocale());
  }

  /**
   * Format a date for display in input fields using the locale-aware date format.
   * Uses dayjs which respects the user's language for localized tokens (e.g., MMMM).
   */
  override format(date: Date, displayFormat?: unknown): string {
    if (!this.isValid(date)) {
      return '';
    }
    if (displayFormat) {
      return dayjs(date).format(displayFormat as string);
    }
    // Format with the locale-aware date format from environment
    return dayjs(date).format(getLocaleDateFormat());
  }

  /**
   * Get the day of month for display in calendar (1-31).
   * Override to use plain numbers without locale-specific formatting (no dots).
   */
  override getDateNames(): string[] {
    return Array.from({ length: 31 }, (_, i) => String(i + 1));
  }

  /**
   * Get the year name for display (e.g., "2025").
   * Override to remove trailing dots from year formatting (common in Serbian locale).
   */
  override getYearName(date: Date): string {
    const year = dayjs(date).format('YYYY');
    return year.replace(/\.$/, '');
  }

  /**
   * Get localized month names using dayjs, which uses the **user's language** (not formatting locale).
   * dayjs locale is set to the user's language by TranslationsService.setLanguage(),
   * so month names appear in the user's chosen language.
   */
  override getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    const format = style === 'long' ? 'MMMM' : style === 'short' ? 'MMM' : 'MMMMM';
    return Array.from({ length: 12 }, (_, i) => dayjs().month(i).format(format).replace(/\.$/, ''));
  }

  /**
   * Get localized day-of-week names using dayjs, which uses the **user's language**.
   * This ensures calendar headers (Mo, Tu, We...) appear in the user's chosen language.
   */
  override getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
    const format = style === 'long' ? 'dddd' : style === 'short' ? 'ddd' : 'dd';
    return Array.from({ length: 7 }, (_, i) => {
      return dayjs().day(i).format(format).replace(/\.$/, '');
    });
  }

  /**
   * Parse user input and convert it to a Date object.
   * Supports locale-aware format and ISO format.
   *
   * All formats are tried in strict mode to prevent dayjs from guessing ambiguous
   * inputs (e.g. swapping month and day when a partial date is entered).
   * The lenient `dayjs(value)` fallback is intentionally avoided because it can
   * misinterpret locale-formatted dates (e.g. '02/03/2026' parsed as Feb 3 instead of Mar 2).
   */
  override parse(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      // Try formats in strict mode only — order matters: locale format first, then ISO.
      const formats = [
        getLocaleDateFormat(), // e.g. 'DD/MM/YYYY', 'D. M. YYYY.', 'DD.MM.YYYY'
        DateTimeFormat.ISO_DATE_FORMAT, // 'YYYY-MM-DD'  — unambiguous API/ISO format
      ];

      for (const format of formats) {
        const parsed = dayjs(value, format, true);
        if (parsed.isValid()) {
          return parsed.toDate();
        }
      }
    }

    return null;
  }
}
