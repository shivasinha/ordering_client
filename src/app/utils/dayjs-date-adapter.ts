import { Injectable } from '@angular/core';
import { DateAdapter } from '@angular/material/core';

import dayjs, { Dayjs } from 'dayjs';

import 'dayjs/locale/da'; // Danish
import 'dayjs/locale/en'; // English
import 'dayjs/locale/sl'; // Slovenian
import 'dayjs/locale/sr'; // Serbian

/**
 * Value object representing date components (day, month, year) with validation and formatting.
 */
class DateComponents {
  constructor(
    public readonly day: number,
    public readonly month: number,
    public readonly year: number,
  ) {}

  /**
   * Parses a date string in DD/MM/YYYY format into DateComponents.
   *
   * @param {string} dateString - The date string to parse
   * @returns {DateComponents | null} The parsed components, or null if format is invalid
   */
  static fromDateString(dateString: string): DateComponents | null {
    const parts = dateString.split('/');
    if (parts.length !== 3) {
      return null;
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    return new DateComponents(day, month, year);
  }

  /**
   * Checks if all components are valid numbers.
   *
   * @returns {boolean} True if all components are valid numbers, false if any is NaN
   */
  hasValidNumbers(): boolean {
    return !isNaN(this.day) && !isNaN(this.month) && !isNaN(this.year);
  }

  /**
   * Checks if day and month are within their valid ranges.
   *
   * @returns {boolean} True if month is 1-12 and day is 1-31, false otherwise
   */
  isInValidRange(): boolean {
    return this.month >= 1 && this.month <= 12 && this.day >= 1 && this.day <= 31;
  }

  /**
   * Checks if the day is valid for the specific month and year.
   *
   * @returns {boolean} True if the day doesn't exceed the days in the month, false otherwise
   */
  isDayValidForMonth(): boolean {
    const testDate = dayjs(`${this.year}-${String(this.month).padStart(2, '0')}-01`);
    if (!testDate.isValid()) {
      return false;
    }

    const daysInMonth = testDate.daysInMonth();
    return this.day <= daysInMonth;
  }

  /**
   * Performs complete validation of the date components.
   *
   * @returns {boolean} True if all validations pass, false otherwise
   */
  isValid(): boolean {
    return this.hasValidNumbers() && this.isInValidRange() && this.isDayValidForMonth();
  }

  /**
   * Formats the date components as a zero-padded DD/MM/YYYY string.
   *
   * @returns {string} The formatted date string
   */
  toFormattedString(): string {
    return `${String(this.day).padStart(2, '0')}/${String(this.month).padStart(2, '0')}/${this.year}`;
  }
}

export enum DateStyle {
  Long = 'long',
  Short = 'short',
  Narrow = 'narrow',
}

@Injectable()
export class DayjsDateAdapter extends DateAdapter<Dayjs> {
  private localeData!: {
    firstDayOfWeek: number;
    longMonths: string[];
    shortMonths: string[];
    dates: string[];
    longDaysOfWeek: string[];
    shortDaysOfWeek: string[];
    narrowDaysOfWeek: string[];
  };

  /**
   * Sets the locale for the date adapter and updates locale-specific data.
   *
   * This method overrides the parent class implementation to configure dayjs locale settings
   * and populate locale-specific formatting data including:
   * - First day of the week
   * - Month names (long and short formats)
   * - Day names (long, short, and narrow formats)
   * - Date numbers (1-31)
   *
   * @param {string} locale - The locale string to set (e.g., 'en-US', 'de-DE')
   * @override
   */
  override setLocale(locale: string): void {
    super.setLocale(locale);
    const localeDataObj = dayjs().locale(locale).localeData();

    this.localeData = {
      firstDayOfWeek: localeDataObj.firstDayOfWeek(),
      longMonths: localeDataObj.months(),
      shortMonths: localeDataObj.monthsShort(),
      dates: Array.from({ length: 31 }, (_, i) => String(i + 1)),
      longDaysOfWeek: localeDataObj.weekdays(),
      shortDaysOfWeek: localeDataObj.weekdaysShort(),
      narrowDaysOfWeek: localeDataObj.weekdaysMin(),
    };
  }

  /**
   * Gets the year component of the given date.
   *
   * @param {Dayjs} date - The Dayjs date object to extract the year from
   * @returns {number} The year as a number (e.g., 2023)
   */
  getYear(date: Dayjs): number {
    return date.year();
  }

  /**
   * Gets the month of the given date.
   *
   * @param {Dayjs} date - The Dayjs date object to extract the month from.
   * @returns {number} The month as a zero-based number (0 = January, 11 = December).
   */
  getMonth(date: Dayjs): number {
    return date.month();
  }

  /**
   * Gets the day of the month for the specified date.
   *
   * @param {Dayjs} date - The Dayjs object to extract the day from
   * @returns {number} The day of the month as a number (1-31)
   */
  getDate(date: Dayjs): number {
    return date.date();
  }

  /**
   * Gets the day of the week for the provided date.
   *
   * @param {Dayjs} date - The date to get the day of week from
   * @returns {number} A number representing the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   */
  getDayOfWeek(date: Dayjs): number {
    return date.day();
  }

  /**
   * Gets an array of month names in the specified style.
   *
   * @param {DateStyle} style - The formatting style for month names (Long or Short).
   * @returns {string[]} An array of month names. Returns long month names if style is DateStyle.Long,
   *                     otherwise returns short month names.
   */
  getMonthNames(style: DateStyle): string[] {
    return style === DateStyle.Long ? this.localeData.longMonths : this.localeData.shortMonths;
  }

  /**
   * Gets an array of localized date names.
   *
   * @returns {string[]} An array of strings representing the localized names of dates (typically day names of the month from 1-31).
   */
  getDateNames(): string[] {
    return this.localeData.dates;
  }

  /**
   * Gets the names of the days of the week in the specified style format.
   *
   * @param {DateStyle} style - The style format for the day names (Long, Short, or Narrow).
   * @returns {string[]} An array of strings representing the days of the week in the requested style.
   *
   * @example
   * ```ts
   * // Returns full day names like ["Monday", "Tuesday", ...]
   * getDayOfWeekNames(DateStyle.Long);
   *
   * // Returns abbreviated day names like ["Mon", "Tue", ...]
   * getDayOfWeekNames(DateStyle.Short);
   *
   * // Returns single-character day names like ["M", "T", ...]
   * getDayOfWeekNames(DateStyle.Narrow);
   * ```
   */
  getDayOfWeekNames(style: DateStyle): string[] {
    switch (style) {
      case DateStyle.Long:
        return this.localeData.longDaysOfWeek;
      case DateStyle.Short:
        return this.localeData.shortDaysOfWeek;
      case DateStyle.Narrow:
        return this.localeData.narrowDaysOfWeek;
      default:
        return this.localeData.longDaysOfWeek;
    }
  }

  /**
   * Gets the year name from a Dayjs date object.
   * @param {Dayjs} date - The Dayjs date object to extract the year from.
   * @returns {string} The year as a four-digit string (e.g., "2023").
   */
  getYearName(date: Dayjs): string {
    return date.format('YYYY');
  }

  /**
   * Gets the first day of the week for the current locale.
   *
   * @returns {number} The day of the week that should be considered the first day (0 = Sunday, 1 = Monday, etc.)
   */
  getFirstDayOfWeek(): number {
    return this.localeData.firstDayOfWeek;
  }

  /**
   * Gets the number of days in the month of the provided date.
   *
   * @param {Dayjs} date - The date object to get the number of days from
   * @returns {number} The total number of days in the month (28-31)
   */
  getNumDaysInMonth(date: Dayjs): number {
    return date.daysInMonth();
  }

  /**
   * Creates a clone of the provided Dayjs date object with the current locale applied.
   *
   * @param {Dayjs} date - The Dayjs date object to clone
   * @returns {Dayjs} A new Dayjs instance that is a clone of the input date with the adapter's locale set
   */
  clone(date: Dayjs): Dayjs {
    return date.clone().locale(this.locale);
  }

  /**
   * Creates a new Dayjs date object with the specified year, month, and date.
   * The time is set to the start of the day (00:00:00) and uses the current locale.
   *
   * @param {number} year - The full year (e.g., 2023)
   * @param {number} month - The month (0-11, where 0 is January and 11 is December)
   * @param {number} date - The day of the month (1-31)
   * @returns {Dayjs} A Dayjs object representing the specified date at the start of the day
   */
  createDate(year: number, month: number, date: number): Dayjs {
    const instance = dayjs().year(year).month(month).date(date).startOf('day');
    return this.locale ? instance.locale(this.locale) : instance;
  }

  /**
   * Returns the current date at the start of the day (00:00:00.000).
   * The returned date is localized according to the adapter's current locale setting.
   *
   * @returns {Dayjs} A Dayjs object representing today's date at midnight in the current locale.
   */
  today(): Dayjs {
    const instance = dayjs().startOf('day');
    return this.locale ? instance.locale(this.locale) : instance;
  }

  /**
   * Adds the specified number of years to the given date.
   *
   * @param {Dayjs} date - The base date to add years to
   * @param {number} years - The number of years to add (can be negative to subtract years)
   * @returns {Dayjs} A new Dayjs instance representing the date with the added years
   */
  addCalendarYears(date: Dayjs, years: number): Dayjs {
    return date.add(years, 'year');
  }

  /**
   * Adds a specified number of months to a given date.
   *
   * @param {Dayjs} date - The Dayjs date object to which months will be added.
   * @param {number} months - The number of months to add. Can be negative to subtract months.
   * @returns {Dayjs} A new Dayjs object representing the date after adding the specified months.
   */
  addCalendarMonths(date: Dayjs, months: number): Dayjs {
    return date.add(months, 'month');
  }

  /**
   * Parses a value into a Dayjs date object using the specified format.
   *
   * @param {any} value - The value to parse (typically a string representation of a date)
   * @param {any} parseFormat - The format string to use for parsing (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY')
   * @returns {Dayjs | null} A Dayjs object if parsing is successful, null otherwise
   *
   * @example
   * ```typescript
   * const date = parse('2023-12-25', 'YYYY-MM-DD');
   * const date2 = parse('25/12/2023', 'DD/MM/YYYY');
   * ```
   */
  override parse(value: any, parseFormat: any): dayjs.Dayjs | null {
    if (value == null || value === '') {
      return null;
    }

    const valueToUse = typeof value === 'string' ? this.normalizeAndValidateDateString(value.trim()) : value;

    if (valueToUse === null) {
      return null;
    }

    const parsed = dayjs(valueToUse, parseFormat, this.locale, true);

    if (!parsed.isValid()) {
      return null;
    }

    return parsed;
  }

  /**
   * Normalizes and validates a date string in DD/MM/YYYY format.
   *
   * @private
   * @param {string} value - The trimmed date string to normalize and validate
   * @returns {string | null} The normalized date string with zero-padded components, or null if invalid
   */
  private normalizeAndValidateDateString(value: string): string | null {
    const components = DateComponents.fromDateString(value);

    if (!components) {
      return value;
    }

    if (!components.isValid()) {
      return null;
    }

    return components.toFormattedString();
  }

  /**
   * Formats a Dayjs date object into a string using the specified display format.
   *
   * @param {Dayjs} date - The Dayjs date object to format
   * @param {any} displayFormat - The format string to use for display (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY', 'MMM D, YYYY')
   * @returns {string} The formatted date string
   *
   * @example
   * ```typescript
   * const formatted = format(dayjs(), 'YYYY-MM-DD'); // "2023-12-25"
   * const formatted2 = format(dayjs(), 'MMM D, YYYY'); // "Dec 25, 2023"
   * ```
   */
  override format(date: dayjs.Dayjs, displayFormat: any): string {
    return date.format(displayFormat);
  }

  /**
   * Adds a specified number of calendar days to a date.
   *
   * @param {Dayjs} date - The base date to add days to
   * @param {number} days - The number of days to add (can be negative to subtract days)
   * @returns {Dayjs} A new Dayjs instance with the added days
   *
   * @example
   * ```typescript
   * const today = dayjs();
   * const tomorrow = addCalendarDays(today, 1);
   * const yesterday = addCalendarDays(today, -1);
   * ```
   */
  addCalendarDays(date: Dayjs, days: number): Dayjs {
    return date.add(days, 'day');
  }

  /**
   * Converts a Dayjs date object to an ISO 8601 formatted string.
   *
   * @param {Dayjs} date - The Dayjs date object to convert
   * @returns {string} The ISO 8601 string representation of the date (e.g., "2023-12-25T10:30:00.000Z")
   */
  toIso8601(date: Dayjs): string {
    return date.toISOString();
  }

  /**
   * Checks if the provided object is a Day.js date instance.
   *
   * @param {any} obj - The object to check.
   * @returns {boolean} `true` if the object is a Day.js instance, `false` otherwise.
   */
  isDateInstance(obj: any): boolean {
    return dayjs.isDayjs(obj);
  }

  /**
   * Checks if the provided Dayjs date object is valid.
   *
   * @param {Dayjs} date - The Dayjs date object to validate
   * @returns {boolean} `true` if the date is valid, `false` otherwise
   */
  isValid(date: Dayjs): boolean {
    return date.isValid();
  }

  /**
   * Creates an invalid Dayjs instance.
   *
   * @returns {Dayjs} A Dayjs object representing an invalid date.
   */
  invalid(): Dayjs {
    return dayjs(null as any);
  }

  /**
   * Deserializes a value into a Dayjs object.
   *
   * @param {any} value - The value to deserialize. Can be a string, number, Dayjs object, Date object, null, or undefined.
   * @returns {Dayjs | null} A Dayjs object with the current locale applied, or null if the value is invalid or cannot be parsed.
   *
   * @remarks
   * This method handles multiple input types:
   * - Returns null for null or empty string values
   * - Parses string or number values using dayjs and returns null if invalid
   * - Applies the current locale to existing Dayjs objects
   * - Converts Date objects to Dayjs objects with the current locale
   */
  override deserialize(value: any): Dayjs | null {
    if (this.isNullOrEmpty(value)) {
      return null;
    }

    if (this.isPrimitiveType(value)) {
      return this.deserializePrimitive(value);
    }

    if (this.isDayjsInstance(value)) {
      return this.applyLocale(value);
    }

    if (this.isNativeDateInstance(value)) {
      return this.deserializeDate(value);
    }

    return null;
  }

  /**
   * Checks if a value is null or empty string.
   *
   * @private
   * @param {any} value - The value to check
   * @returns {boolean} True if value is null, undefined, or empty string
   */
  private isNullOrEmpty(value: any): boolean {
    return value == null || value === '';
  }

  /**
   * Checks if a value is a string or number (primitive types for parsing).
   *
   * @private
   * @param {any} value - The value to check
   * @returns {boolean} True if value is a string or number
   */
  private isPrimitiveType(value: any): boolean {
    return typeof value === 'string' || typeof value === 'number';
  }

  /**
   * Checks if a value is a Dayjs instance.
   *
   * @private
   * @param {any} value - The value to check
   * @returns {boolean} True if value is a Dayjs instance
   */
  private isDayjsInstance(value: any): boolean {
    return dayjs.isDayjs(value);
  }

  /**
   * Checks if a value is a native Date instance.
   *
   * @private
   * @param {any} value - The value to check
   * @returns {boolean} True if value is a Date instance
   */
  private isNativeDateInstance(value: any): boolean {
    return value instanceof Date;
  }

  /**
   * Deserializes a primitive value (string or number) into a Dayjs object.
   *
   * @private
   * @param {string | number} value - The primitive value to parse
   * @returns {Dayjs | null} A Dayjs object with locale applied, or null if invalid
   */
  private deserializePrimitive(value: string | number): Dayjs | null {
    const parsed = dayjs(value);
    if (!parsed.isValid()) {
      return null;
    }
    return this.applyLocale(parsed);
  }

  /**
   * Deserializes a native Date object into a Dayjs object.
   *
   * @private
   * @param {Date} value - The Date object to convert
   * @returns {Dayjs} A Dayjs object with locale applied
   */
  private deserializeDate(value: Date): Dayjs {
    const parsed = dayjs(value);
    return this.applyLocale(parsed);
  }

  /**
   * Applies the current locale to a Dayjs object if locale is set.
   *
   * @private
   * @param {Dayjs} date - The Dayjs object to apply locale to
   * @returns {Dayjs} The Dayjs object with locale applied
   */
  private applyLocale(date: Dayjs): Dayjs {
    return this.locale ? date.locale(this.locale) : date;
  }
}
