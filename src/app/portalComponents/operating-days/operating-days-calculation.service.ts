import { Injectable, effect, inject, signal } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';
import { DaySet, OrderItemAction } from '@Ordering/api';
import { DateTimeFormat } from '@Ordering/utils/dates';
import {
  CalendarDisplayData,
  CalendarMonth,
  CalendarMonthDays,
  DayOption,
  DayOptionTypes,
} from '@Ordering/portalComponents/operating-days/operating-days.model';
import { getDateRangeOfCombinedOperatingDays } from '@Ordering/portalComponents/operating-days/operating-days.util';
import { MasterDataHandlingService } from '@Ordering/shared/services/master-data-handling.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';

export interface DateRange {
  start: Dayjs | undefined;
  end: Dayjs | undefined;
}

export interface StrictDateRange {
  start: Dayjs;
  end: Dayjs;
}

export interface BitmapData {
  bitmap: string;
  bitmapStartDate: dayjs.Dayjs;
}

export interface DaysSelectionsData {
  selectedDays: number[];
  deselectedDays: number[];
}

export interface BitmapValidationResult {
  isValid: boolean;
  invalidDays?: number[];
}

@Injectable({
  providedIn: 'root',
})
export class OperatingDaysCalculationService {
  private masterDataHandlingService = inject(MasterDataHandlingService);
  private orderActionsService = inject(OrderActionsService);
  private holidaysList: string[] = [];
  public readonly isSubsetModeSig = signal<boolean>(false);

  constructor() {
    effect(() => {
      if (this.masterDataHandlingService.masterDataHolidaysListSig()?.length > 0) {
        this.holidaysList = this.masterDataHandlingService.masterDataHolidaysListSig().map(holiday => holiday.date);
      }
    });
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  //  Generation of bitmap string from operating days selections start here
  //
  //  Each character in the bitmap string represents a day within the specified date range:
  ///////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Generates a bitmap string representing selected operating days within a date range.
   *
   * @param {string} beginDate - The start date in string format for the bitmap calculation
   * @param {string} endDate - The end date in string format for the bitmap calculation
   * @param {DaysSelectionsData} daysSelectionsData - Object containing the selected days configuration data
   * @returns {string} A string bitmap where each character represents whether a day is selected ('1') or not ('0').
   *          Returns an empty string if the input validation fails.
   *
   * @example
   * ```typescript
   * const bitmap = generateBitmap('2023-01-01', '2023-01-07', daysSelections);
   * // Returns something like "1010101" for alternating selected days
   * ```
   */
  public generateBitmap(beginDate: string, endDate: string, daysSelectionsData: DaysSelectionsData): string {
    if (!this.isValidBitmapInput(beginDate, endDate, daysSelectionsData.selectedDays)) {
      return '';
    }

    const start = dayjs(beginDate);
    const totalDays = dayjs(endDate).diff(start, 'day') + 1;

    const bitmap: string[] = [];
    for (let i = 0; i < totalDays; i++) {
      const dayBit = this.calculateDayBit(start, i, daysSelectionsData);
      bitmap.push(dayBit);
    }

    return bitmap.join('');
  }

  /**
   * Validates the input parameters required for bitmap calculation.
   *
   * @param {string} beginDate - The start date string for the operating period
   * @param {string} endDate - The end date string for the operating period
   * @param {number[]} selectedDays - Array of selected day numbers
   * @returns {boolean} True if all required parameters are provided and valid, false otherwise
   */
  private isValidBitmapInput(beginDate: string, endDate: string, selectedDays: number[]): boolean {
    return !!(beginDate && endDate && selectedDays?.length);
  }

  /**
   * Calculates the bit value for a specific day based on day selections and deselections.
   *
   * The method first determines if a day is selected based on day of week and holiday status,
   * then applies any deselection overrides. Deselected days always take precedence over selections.
   * @param {Dayjs} startDate - The base date from which to calculate the target date
   * @param {number} dayIndex - The number of days to add to the start date (0-based index)
   * @param {DaysSelectionsData} daysSelectionsData - Object containing selected and deselected days data
   * @returns {string} A string containing either '1' if the day is active or '0' if inactive
   */
  private calculateDayBit(startDate: Dayjs, dayIndex: number, daysSelectionsData: DaysSelectionsData): string {
    const currentDate = startDate.add(dayIndex, 'day');
    const dayOfWeek = this.convertDayJsToDayOption(currentDate.day());
    const isHoliday = this.holidaysList?.includes(currentDate.format(DateTimeFormat.ISO_DATE_FORMAT)) ?? false;

    let isActive = this.isDaySelected(daysSelectionsData.selectedDays, dayOfWeek, isHoliday);

    // Override with deselected days
    if (this.isDayDeselected(daysSelectionsData.deselectedDays, dayOfWeek, isHoliday)) {
      isActive = false;
    }

    return isActive ? '1' : '0';
  }

  /**
   * Converts Day.js day index to DayOption day index.
   * Day.js: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
   * DayOption: Daily=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6, Sunday=7
   *
   * @param {number} dayJsDay - The Day.js day index (0-6)
   * @returns {number} The DayOption day index (1-7)
   */
  private convertDayJsToDayOption(dayJsDay: number): number {
    // Convert Day.js Sunday (0) to DayOption Sunday (7)
    // All other days map directly: Monday(1)->Monday(1), Tuesday(2)->Tuesday(2), etc.
    return dayJsDay === 0 ? 7 : dayJsDay;
  }

  /**
   * Determines if a specific day is selected based on various criteria.
   *
   * @param {number[] | null | undefined} selectedDays - An array of selected days as numbers, or null/undefined.
   * @param {number} dayToConvert - The numeric representation of the day to check.
   * @param {boolean} isHoliday - A boolean indicating whether the day is a holiday.
   * @returns {boolean} A boolean indicating whether the specified day is selected.
   */
  private isDaySelected(selectedDays: number[] | null | undefined, dayToConvert: number, isHoliday: boolean): boolean {
    return (
      this.isDailyOptionChosen(selectedDays) ||
      this.isSingleDayChosen(selectedDays, dayToConvert) ||
      this.isWeekdayOptionChosen(selectedDays, dayToConvert) ||
      this.isWeekendOptionChosen(selectedDays, dayToConvert) ||
      this.isHolidayOptionChosen(selectedDays, isHoliday)
    );
  }

  /**
   * Determines if a specific day is deselected based on various criteria.
   *
   * @param {number[] | null | undefined} deselectedDays - An array of deselected days, which can be null or undefined.
   * @param {number} dayToConvert - The numeric representation of the day to check.
   * @param {boolean} isHoliday - A boolean indicating whether the day is a holiday.
   * @returns {boolean} A boolean indicating whether the specified day is deselected.
   */
  private isDayDeselected(deselectedDays: number[] | null | undefined, dayToConvert: number, isHoliday: boolean): boolean {
    return (
      this.isDailyOptionChosen(deselectedDays) ||
      this.isSingleDayChosen(deselectedDays, dayToConvert) ||
      this.isWeekdayOptionChosen(deselectedDays, dayToConvert) ||
      this.isWeekendOptionChosen(deselectedDays, dayToConvert) ||
      this.isHolidayOptionChosen(deselectedDays, isHoliday)
    );
  }

  /**
   * Checks if the "Daily" option is chosen in the provided list.
   *
   * @param {number[] | null | undefined} targetList - The list of day options to check. It can be an array of numbers, null, or undefined.
   * @returns {boolean} `true` if the "Daily" option is included in the list, otherwise `false`.
   */
  private isDailyOptionChosen(targetList: number[] | null | undefined): boolean {
    if (!targetList) return false;
    return targetList.includes(DayOptionTypes.Daily) || false;
  }

  /**
   * Checks if a single day, represented by `dayToConvert`, is included in the `targetList`.
   *
   * @param {number[] | null | undefined} targetList - An array of numbers representing the days to check against. It can be undefined or null.
   * @param {number} dayToConvert - A number representing the day to be converted and checked.
   * @returns {boolean} A boolean indicating whether the converted day is included in the `targetList`.
   */
  private isSingleDayChosen(targetList: number[] | undefined | null, dayToConvert: number): boolean {
    if (!targetList) return false;

    return targetList.includes(dayToConvert);
  }

  /**
   * Checks if the "Weekday" option is chosen in the target list and if the given day index corresponds to a weekday.
   *
   * @param {number[] | null | undefined} targetList - The list of selected day options, which can be an array of numbers, undefined, or null.
   * @param {number} dayOptionIndex - The DayOption index of the day to check.
   * @returns {boolean} `true` if the "Weekday" option is included in the target list and the day index corresponds to a weekday, otherwise `false`.
   */
  private isWeekdayOptionChosen(targetList: number[] | undefined | null, dayOptionIndex: number): boolean {
    if (!targetList) return false;
    // DayOption weekdays: Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5
    return targetList.includes(DayOptionTypes.Weekday) && dayOptionIndex >= 1 && dayOptionIndex <= 5;
  }

  /**
   * Checks if the weekend option is chosen and if the given day index corresponds to a weekend day.
   *
   * @param {number[] | null | undefined} targetList - The list of selected day options, which can be a number array, undefined, or null.
   * @param {number} dayOptionIndex - The DayOption index of the day to check.
   * @returns {boolean} `true` if the weekend option is chosen and the day index corresponds to a weekend day, otherwise `false`.
   */
  private isWeekendOptionChosen(targetList: number[] | undefined | null, dayOptionIndex: number): boolean {
    if (!targetList) return false;
    // DayOption weekends: Saturday=6, Sunday=7
    return targetList.includes(DayOptionTypes.Weekend) && (dayOptionIndex === 6 || dayOptionIndex === 7);
  }

  /**
   * Checks if the holiday option is chosen for a given date.
   *
   * @param {number[] | null | undefined} targetList - The list of day options to check against.
   * @param {string} dateStringToConvert - The date string to check if it is a holiday.
   * @returns {boolean} `true` if the holiday option is chosen and the date is a holiday, otherwise `false`.
   */
  private isHolidayOptionChosen(targetList: number[] | undefined | null, isHoliday: boolean): boolean {
    if (!targetList) return false;
    return targetList.includes(DayOptionTypes.Holiday) && isHoliday;
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  //  Combination of multiple operating day sets into a single bitmap start here to highlight them in subset mode
  //  This process involves merging the bitmaps of individual day sets into a unified bitmap
  //  that represents the combined operating days across all sets.
  ///////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Combines multiple operating day sets into a single consolidated operating days data structure.
   *
   * - Returns empty bitmap and start date if input array is null, undefined, or empty
   * - For single operating day set, returns the original bitmap and start date
   * - For multiple sets, creates a unified bitmap spanning from earliest begin date to latest end date
   * - Each bit in the resulting bitmap represents whether service operates on that specific day
   * - The start date is formatted using the display US date format
   *
   * @param {DaySet[]} operatingDays - Array of DaySet objects containing operating day information with bitmaps and date ranges
   * @returns {DaySet} Combined operating days data containing a consolidated bitmap and the earliest start date
   *
   * @example
   * ```typescript
   * const operatingDays = [
   *   { daysBitmap: '1010101', beginDate: '2023-01-01', endDate: '2023-01-07' },
   *   { daysBitmap: '0101010', beginDate: '2023-01-03', endDate: '2023-01-09' }
   * ];
   * const result = combineOperatingDays(operatingDays);
   * // Returns consolidated bitmap covering the full date range
   * ```
   */
  public combineOperatingDays(operatingDays: DaySet[]): DaySet {
    if (!operatingDays || operatingDays.length === 0) {
      return { daysBitmap: '', beginDate: '' };
    }

    if (operatingDays.length === 1) {
      return {
        daysBitmap: operatingDays[0].daysBitmap,
        beginDate: operatingDays[0].beginDate,
      };
    }

    // Find the earliest start date and latest end date
    const { beginDate, endDate } = getDateRangeOfCombinedOperatingDays(operatingDays);

    // Calculate total days needed
    const totalDays = dayjs(endDate).diff(dayjs(beginDate), 'day') + 1;

    // Initialize bitmap with all zeros
    const combinedBitmap = new Array(totalDays).fill('0');

    // Fill in the bitmap based on each operating day set
    operatingDays.forEach(daySet => {
      this.mergeDaySetIntoBitmap(daySet, beginDate, combinedBitmap);
    });

    return {
      daysBitmap: combinedBitmap.join(''),
      beginDate: dayjs(beginDate).format(DateTimeFormat.UI_DATE_FORMAT),
    };
  }

  private mergeDaySetIntoBitmap(daySet: DaySet, earliestStart: string, combinedBitmap: string[]): void {
    const daySetStart = dayjs(daySet.beginDate);
    const offset = daySetStart.diff(dayjs(earliestStart), 'day');

    for (let i = 0; i < daySet.daysBitmap.length; i++) {
      if (daySet.daysBitmap[i] === '1') {
        combinedBitmap[offset + i] = '1';
      }
    }
  }

  /**
   * Validates that a new bitmap is a subset of its parent bitmap within the specified date ranges.
   *
   * If any required parameters are missing, the validation is considered valid by default.
   * The method calculates the day offset between start dates and checks if the new bitmap
   * represents a valid subset of the parent bitmap for the corresponding time period.
   *
   * @param {string} newBitmap - The bitmap string representing the new operating days pattern
   * @param {string} newStartDate - The start date for the new bitmap in ISO string format
   * @param {string} parentBitmap - The parent bitmap string that the new bitmap should be a subset of
   * @param {string} parentStartDate - The start date for the parent bitmap in ISO string format
   * @returns {BitmapValidationResult} A validation result object containing validity status and any invalid days found
   */
  public validateBitmapSubset(
    newBitmap: string,
    newStartDate: string,
    parentBitmap: string,
    parentStartDate: string,
  ): BitmapValidationResult {
    const hasRequiredParameters = newBitmap && newStartDate && parentBitmap && parentStartDate;
    if (!hasRequiredParameters) {
      return { isValid: true };
    }

    const parentStart = dayjs(parentStartDate);
    const newStart = dayjs(newStartDate);
    const dayOffset = newStart.diff(parentStart, 'day');

    const invalidDays = this.findInvalidDaysInBitmap(newBitmap, parentBitmap, dayOffset);

    return {
      isValid: invalidDays.length === 0,
      invalidDays: invalidDays.length > 0 ? invalidDays : undefined,
    };
  }

  /**
   * Finds invalid days in a bitmap by comparing it against a parent bitmap.
   *
   * This method iterates through each bit in the newBitmap and for each '1' bit,
   * checks if the corresponding day (adjusted by dayOffset) is invalid in the parent bitmap.
   * Only days marked as '1' in newBitmap are validated.
   *
   * @param {string} newBitmap - The bitmap string to validate, where '1' represents active days
   * @param {string} parentBitmap - The parent bitmap string used as validation reference
   * @param {number} dayOffset - The offset to apply when checking against the parent bitmap
   * @returns {number[]} An array of indices representing invalid days in the newBitmap
   */
  private findInvalidDaysInBitmap(newBitmap: string, parentBitmap: string, dayOffset: number): number[] {
    const invalidDays: number[] = [];

    for (let i = 0; i < newBitmap.length; i++) {
      if (newBitmap[i] === '1') {
        const parentBitmapIndex = dayOffset + i;

        if (this.isDayInvalidInParentBitmap(parentBitmapIndex, parentBitmap)) {
          invalidDays.push(i);
        }
      }
    }

    return invalidDays;
  }

  /**
   * Checks if a day is invalid in the parent bitmap by verifying the bit at the specified index.
   *
   * @param {number} parentBitmapIndex - The index position to check in the parent bitmap
   * @param {string} parentBitmap - The bitmap string where '1' represents valid days and '0' represents invalid days
   * @returns {boolean} `true` if the day is invalid (index out of bounds or bit is not '1'), `false` if the day is valid
   */
  private isDayInvalidInParentBitmap(parentBitmapIndex: number, parentBitmap: string): boolean {
    if (parentBitmapIndex < 0) {
      return true;
    }

    if (parentBitmapIndex >= parentBitmap.length) {
      return true;
    }

    return parentBitmap[parentBitmapIndex] !== '1';
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  //  Generation of complete calendar display data with styling attributes start here
  //  This makes the calendar component truly pure presentation
  ///////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Generates calendar display data for the specified date range using bitmap data.
   *
   * This method handles two modes:
   * - Subset mode: Uses generateSubsetCalendarDisplayData for specialized subset calendar generation
   * - Standard mode: Uses populateCalendarMonths for regular calendar population
   *
   * Returns empty calendar structure if date range is invalid or bitmap data is missing in standard mode.
   * @param {StrictDateRange} formDateRange - The date range containing start and end dates for calendar generation
   * @param {BitmapData} generatedBitmap - The primary bitmap data containing date mappings and bitmap information
   * @param {BitmapData} parentBitmapData - The parent bitmap data used for reference in subset mode
   * @returns {CalendarDisplayData} CalendarDisplayData object containing populated months and day names, or empty structure if invalid input
   */
  public generateCalendarDisplayData(
    formDateRange: StrictDateRange,
    generatedBitmap: BitmapData,
    parentBitmapData: BitmapData,
  ): CalendarDisplayData {
    if (!formDateRange.start || !formDateRange.end) {
      return { months: [], allDaysNames: DayOption.getAllDaysNames() };
    }

    let dayIdCounter = 1;
    // Helper to get next day ID
    const getNextDayId = (): number => {
      const currentId = dayIdCounter;
      dayIdCounter = currentId + 1;
      return currentId;
    };

    // Subset mode
    if (this.isSubsetModeSig()) {
      return this.generateSubsetCalendarDisplayData(formDateRange, generatedBitmap, parentBitmapData, getNextDayId);
    }

    // Standard mode
    if (!generatedBitmap.bitmapStartDate) {
      return { months: [], allDaysNames: DayOption.getAllDaysNames() };
    }

    const months = this.populateCalendarMonths(formDateRange, generatedBitmap, parentBitmapData, getNextDayId);

    return { months, allDaysNames: DayOption.getAllDaysNames() };
  }

  /**
   * Generates calendar display data for a subset of dates within the specified range.
   *
   * If the generated bitmap is empty or unavailable, falls back to using the form date range
   * with an empty bitmap starting from the range start date.
   * @param {StrictDateRange} formDateRange - The date range to generate calendar data for
   * @param {BitmapData} generatedBitmap - The bitmap data representing selected dates
   * @param {BitmapData} parentBitmapData - The parent bitmap data for reference
   * @param {() => number} getNextDayId - Optional function to generate next day ID
   * @returns Calendar display data containing months and day names
   */
  private generateSubsetCalendarDisplayData(
    formDateRange: StrictDateRange,
    generatedBitmap: BitmapData,
    parentBitmapData: BitmapData,
    getNextDayId?: () => number,
  ): CalendarDisplayData {
    let newBitmapData = generatedBitmap;

    // Use form range when bitmap is empty or not available
    if (!generatedBitmap.bitmap || generatedBitmap.bitmap.length === 0) {
      newBitmapData = {
        bitmap: '',
        bitmapStartDate: formDateRange.start,
      };
    }

    const months = this.populateCalendarMonths(formDateRange, newBitmapData, parentBitmapData, getNextDayId);

    return { months, allDaysNames: DayOption.getAllDaysNames() };
  }

  /**
   * Populates calendar months with days for a given date range.
   *
   * This method iterates through each month in the specified date range, starting from the
   * beginning of the start month and continuing through the end of the end month. For each
   * month, it generates the appropriate days and creates a CalendarMonth object with the
   * formatted month name and days array.
   * @param {StrictDateRange} dateRange - The start and end date range to generate calendar months for
   * @param {BitmapData} generatedBitmap - Bitmap data used for generating day information
   * @param {BitmapData | undefined} parentBitmap - Optional parent bitmap data for inheritance or reference
   * @param {() => number} getNextDayId - Optional function to generate unique day IDs, defaults to Math.random()
   * @returns An array of CalendarMonth objects containing month names and their respective days
   */
  private populateCalendarMonths(
    dateRange: StrictDateRange,
    generatedBitmap: BitmapData,
    parentBitmap: BitmapData | undefined,
    getNextDayId?: () => number,
  ): CalendarMonth[] {
    const months: CalendarMonth[] = [];
    let currentDate = dateRange.start.startOf('month');
    const endMonth = dateRange.end.startOf('month');

    const dayIdGenerator = getNextDayId || (() => Math.random());

    while (currentDate.isBefore(endMonth) || currentDate.isSame(endMonth, 'month')) {
      const monthStart = currentDate;
      const days = this.generateDaysForMonth({ monthStart, dateRange, generatedBitmap, parentBitmap, getNextDayId: dayIdGenerator });
      const monthName = monthStart.format(DateTimeFormat.monthYear);
      // Capitalize first letter of month name (e.g., "avgust 2024" -> "Avgust 2024")
      const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      months.push({
        name: capitalizedMonthName,
        days,
      });
      currentDate = currentDate.add(1, 'month');
    }

    return months;
  }

  /**
   * Generates calendar day data for a specific month, including padding days and actual month days.
   *
   * - Adds padding days at the beginning to align the month start with the correct weekday
   * - Uses Monday as the first day of the week (Sunday becomes day 6)
   * - Each actual day is created using the createDayData method with provided options
   * @param {Object} data - Configuration object containing month generation parameters
   * @param {Dayjs} data.monthStart - The first day of the month to generate
   * @param {StrictDateRange} data.dateRange - The valid date range for the calendar
   * @param {BitmapData} data.generatedBitmap - Bitmap data for generated operating days
   * @param {BitmapData | undefined} data.parentBitmap - Optional parent bitmap data for inheritance
   * @param {() => number} data.getNextDayId - Function to generate unique day identifiers
   *
   * @returns Array of calendar month days including padding days at the start and all days of the month
   */
  private generateDaysForMonth(data: {
    monthStart: Dayjs;
    dateRange: StrictDateRange;
    generatedBitmap: BitmapData;
    parentBitmap: BitmapData | undefined;
    getNextDayId: () => number;
  }): CalendarMonthDays[] {
    const daysToDisplay: CalendarMonthDays[] = [];
    const monthEnd = data.monthStart.endOf('month');
    const firstDayOfMonth = (data.monthStart.day() + 6) % 7; // Adjust Sunday (0) to be last

    // Add padding days at the start of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      daysToDisplay.push({
        id: data.getNextDayId(),
        date: '',
        active: false,
        isPaddingDay: true,
        cssClasses: ['padding-day'],
      });
    }

    // Add actual days of the month
    for (let d = data.monthStart; d.isBefore(monthEnd) || d.isSame(monthEnd, 'day'); d = d.add(1, 'day')) {
      const options = {
        date: d,
        dateRange: data.dateRange,
        generatedBitmap: data.generatedBitmap,
        parentBitmap: data.parentBitmap,
        getNextDayId: data.getNextDayId,
      };
      daysToDisplay.push(this.createDayData(options));
    }

    return daysToDisplay;
  }

  /**
   * Creates calendar day data for a specific date within the operating days calculation context.
   *
   * This method processes bitmap states, validates selections against parent bitmaps,
   * and generates appropriate CSS classes for calendar day rendering.
   * @param {Object} options - Configuration object containing date information and bitmap data
   * @param {Dayjs} options.date - The specific date to create day data for
   * @param {StrictDateRange} options.dateRange - The valid date range for calculations
   * @param {BitmapData} options.generatedBitmap - The current bitmap data being generated
   * @param {BitmapData | undefined} options.parentBitmap - Optional parent bitmap data for inheritance checking
   * @param {() => number} options.getNextDayId - Function to generate unique day identifiers
   *
   * @returns CalendarMonthDays object containing the processed day information including:
   *   - Unique identifier and formatted date
   *   - Active state and bitmap inheritance status
   *   - Validation state and CSS styling classes
   *   - Display text for calendar rendering
   */
  private createDayData(options: {
    date: Dayjs;
    dateRange: StrictDateRange;
    generatedBitmap: BitmapData;
    parentBitmap: BitmapData | undefined;
    getNextDayId: () => number;
  }): CalendarMonthDays {
    const bitmapStates = this.calculateBitmapStates(options);

    const isInvalidSelection = this.isInvalidSelection(
      bitmapStates.isCurrentBitmapActive,
      bitmapStates.isFromParentBitmap,
      !!(options.parentBitmap?.bitmap && options.parentBitmap.bitmapStartDate),
    );
    const isSelectedBitmap = bitmapStates.isCurrentBitmapActive;
    const isDeselectedBitmap = bitmapStates.isFromParentBitmap && !isSelectedBitmap;

    const isFromSavedBitmap = bitmapStates.isFromParentBitmap && !isInvalidSelection;

    const isNewBitMap = isInvalidSelection && isSelectedBitmap;

    const contentAction = this.orderActionsService.contentActionSig();
    const isTrainRunReplacement = contentAction === OrderItemAction.REPLACEMENT;
    return {
      id: options.getNextDayId(),
      date: options.date.format(DateTimeFormat.UI_DATE_FORMAT),
      active: bitmapStates.isCurrentBitmapActive,

      isSelectedOrSavedBitmap: isTrainRunReplacement ? isSelectedBitmap : isFromSavedBitmap,
      isDeselectedOrInvalidSelection: isTrainRunReplacement ? isDeselectedBitmap : isInvalidSelection,
      isNewBitMap: isTrainRunReplacement ? isNewBitMap : false,
      isPaddingDay: false,
      displayText: options.date.format('D'),
    };
  }

  /**
   * Calculates the bitmap states for a given date, determining whether the current bitmap
   * is active and whether the state is inherited from a parent bitmap.
   *
   * The calculation method depends on the current mode - either subset mode or standard mode.
   *
   * @param {Object} options - Configuration object containing:
   *   - date: The target date to calculate states for
   *   - generatedBitmap: The bitmap data generated for the current context
   *   - parentBitmap: Optional parent bitmap data for inheritance calculations
   *
   * @returns {Object} An object containing:
   *   - isCurrentBitmapActive: Whether the current bitmap is active for the given date
   *   - isFromParentBitmap: Whether the active state is inherited from the parent bitmap
   */
  private calculateBitmapStates(options: { date: Dayjs; generatedBitmap: BitmapData; parentBitmap: BitmapData | undefined }): {
    isCurrentBitmapActive: boolean;
    isFromParentBitmap: boolean;
  } {
    if (this.isSubsetModeSig()) {
      return this.calculateSubsetModeBitmapStates(options);
    }
    return this.calculateStandardModeBitmapStates(options);
  }

  /**
   * Calculates the bitmap states for subset mode by determining if a specific date
   * is active in both the current generated bitmap and the parent bitmap.
   *
   * @param {Object} options - Configuration object containing date and bitmap data
   * @param {Dayjs} options.date - The date to check for bitmap activity
   * @param {BitmapData} options.generatedBitmap - The current generated bitmap data to evaluate
   * @param {BitmapData | undefined} options.parentBitmap - The parent bitmap data to check against (optional)
   * @returns {Object} An object containing the bitmap state information
   * @returns {boolean} returns.isCurrentBitmapActive - Whether the date is active in the current generated bitmap
   * @returns {boolean} returns.isFromParentBitmap - Whether the date is active in the parent bitmap
   */
  private calculateSubsetModeBitmapStates(options: { date: Dayjs; generatedBitmap: BitmapData; parentBitmap: BitmapData | undefined }): {
    isCurrentBitmapActive: boolean;
    isFromParentBitmap: boolean;
  } {
    let isCurrentBitmapActive = false;
    let isFromParentBitmap = false;

    if (options.generatedBitmap.bitmap && options.generatedBitmap.bitmapStartDate) {
      isCurrentBitmapActive = this.isCurrentBitmapActiveForDay(options.date, options.generatedBitmap);
    }

    if (options.parentBitmap?.bitmap && options.parentBitmap?.bitmapStartDate) {
      isFromParentBitmap = this.isDateActiveInParentBitmap(options.date, options.parentBitmap);
    }

    return { isCurrentBitmapActive, isFromParentBitmap };
  }

  /**
   * Calculates the bitmap states for standard mode operation.
   *
   * This method determines if a given date falls within an active bitmap period
   * and whether the bitmap is active for that specific date.
   *
   * - The bitmap is a string where '1' represents an active day and '0' represents an inactive day
   * - The method calculates the day index by finding the difference between the target date and bitmap start date
   * - If the date falls outside the bitmap range, the bitmap is considered inactive
   * @param {Object} options - Configuration object containing date and bitmap data
   * @param {Dayjs} options.date - The target date to check against the bitmap
   * @param {BitmapData} options.generatedBitmap - The bitmap data containing the bitmap string and start date
   * @param {string} options.generatedBitmap.bitmap - Binary string representing active/inactive days
   * @param {Dayjs} options.generatedBitmap.bitmapStartDate - The start date of the bitmap period
   * @returns {Object} An object containing the bitmap state information
   * @returns {boolean} returns.isCurrentBitmapActive - True if the bitmap is active for the given date
   * @returns {boolean} returns.isFromParentBitmap - Always false for standard mode (indicates bitmap inheritance)
   */
  private calculateStandardModeBitmapStates(options: { date: Dayjs; generatedBitmap: BitmapData }): {
    isCurrentBitmapActive: boolean;
    isFromParentBitmap: boolean;
  } {
    let isCurrentBitmapActive = false;

    if (options.generatedBitmap.bitmap && options.generatedBitmap.bitmapStartDate) {
      const bitmapStart = options.generatedBitmap.bitmapStartDate;
      const bitmapEnd = bitmapStart.add(options.generatedBitmap.bitmap.length - 1, 'day');

      if (options.date.isSameOrAfter(bitmapStart, 'day') && options.date.isSameOrBefore(bitmapEnd, 'day')) {
        const dayIndex = options.date.diff(bitmapStart, 'day');
        isCurrentBitmapActive =
          dayIndex >= 0 && dayIndex < options.generatedBitmap.bitmap.length && options.generatedBitmap.bitmap[dayIndex] === '1';
      }
    }

    return { isCurrentBitmapActive, isFromParentBitmap: false };
  }

  /**
   * Determines if a bitmap is active for a specific day based on the bitmap data.
   *
   * The method calculates the day index by finding the difference in days between
   * the provided date and the bitmap start date. It returns true only if:
   * - The day index is non-negative (date is not before bitmap start)
   * - The day index is within the bitmap length bounds
   * - The corresponding bitmap character at that index is '1'
   * @param {Dayjs} date - The date to check for bitmap activity
   * @param {BitmapData} bitmapData - The bitmap data containing start date and bitmap string
   * @returns {boolean} True if the bitmap is active for the given day, false otherwise
   */
  private isCurrentBitmapActiveForDay(date: Dayjs, bitmapData: BitmapData): boolean {
    if (!bitmapData?.bitmapStartDate || !bitmapData?.bitmap) return false;

    const start = dayjs(bitmapData.bitmapStartDate);
    const dayIndex = date.diff(start, 'day');

    return dayIndex >= 0 && dayIndex < bitmapData.bitmap.length && bitmapData.bitmap[dayIndex] === '1';
  }

  /**
   * Determines if a given date is marked as active in the parent bitmap.
   *
   * @param {dayjs.Dayjs} date - The date to check for activity status
   * @param {BitmapData} bitmapData - The bitmap data containing the start date and bitmap string
   * @returns {boolean} True if the date is within the bitmap range and marked as active ('1'), false otherwise
   */
  private isDateActiveInParentBitmap(date: dayjs.Dayjs, bitmapData: BitmapData): boolean {
    const dayIndex = date.diff(bitmapData.bitmapStartDate, 'day');

    return dayIndex >= 0 && dayIndex < bitmapData.bitmap.length && bitmapData.bitmap[dayIndex] === '1';
  }

  /**
   * Determines if the current selection is invalid based on subset mode constraints.
   *
   * In subset mode, a selection is considered invalid when a day is active in the current
   * bitmap but not available in the parent bitmap. This prevents users from selecting
   * operating days that are not permitted by the parent configuration.
   *
   * @param {boolean} isCurrentBitmapActive - Whether the day is currently selected/active in the bitmap
   * @param {boolean} isFromParentBitmap - Whether the day is available/selected in the parent bitmap
   * @param {boolean} hasParentBitmap - Whether a parent bitmap exists for comparison
   * @returns {boolean} True if the selection is invalid (active but not in parent), false otherwise
   */
  private isInvalidSelection(isCurrentBitmapActive: boolean, isFromParentBitmap: boolean, hasParentBitmap: boolean): boolean {
    // Invalid selection only applies in subset mode when we have a parent bitmap to compare against
    if (!this.isSubsetModeSig() || !hasParentBitmap) {
      return false;
    }
    return isCurrentBitmapActive && !isFromParentBitmap;
  }
}
