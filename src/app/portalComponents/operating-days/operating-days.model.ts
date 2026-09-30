import { DaySet, OrderItemAction } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { DialogAction } from '@Ordering/data/custom/enum/dialog-action.enum';

export interface CalendarMonth {
  name: string;
  days: CalendarMonthDays[];
}

export interface CalendarMonthDays {
  id: number;
  date: string;
  active: boolean;
  isSelectedOrSavedBitmap?: boolean;
  isDeselectedOrInvalidSelection?: boolean;
  isNewBitMap?: boolean;
  // Styling attributes for pure presentation
  cssClasses?: string[];
  isPaddingDay?: boolean;
  displayText?: string;
}

export interface CalendarDisplayData {
  months: CalendarMonth[];
  allDaysNames: DayOption[];
}

export interface DaySetListItem extends DaySet {
  id: number;
  endDate: string;
  isSubsetMode?: boolean;
}

export interface OperatingDaysDialogData extends DaySetListItem {
  action: DialogAction;
  parentOperatingDays?: DaySet[];
  message?: string;
  contentType?: OrderItemAction;
}

export enum DayOptionTypes {
  Daily = 0,
  Mon = 1,
  Tue = 2,
  Wed = 3,
  Thu = 4,
  Fri = 5,
  Sat = 6,
  Sun = 7,
  Weekday = 8,
  Weekend = 9,
  Holiday = 10,
}

export class DayOption {
  static tr = new TranslationsService();
  constructor(
    public index: number,
    public label: string,
  ) {}

  /**
   * Returns an array of DayOption objects representing different day options.
   * Each DayOption is initialized with a name and a translated label.
   *
   * @returns {DayOption[]} An array of DayOption objects.
   */
  static getDayOptions(): DayOption[] {
    return [
      new DayOption(DayOptionTypes.Daily, this.tr.translate('lblDaily')),
      new DayOption(DayOptionTypes.Mon, this.tr.translate('lblMon')),
      new DayOption(DayOptionTypes.Tue, this.tr.translate('lblTue')),
      new DayOption(DayOptionTypes.Wed, this.tr.translate('lblWed')),
      new DayOption(DayOptionTypes.Thu, this.tr.translate('lblThu')),
      new DayOption(DayOptionTypes.Fri, this.tr.translate('lblFri')),
      new DayOption(DayOptionTypes.Sat, this.tr.translate('lblSat')),
      new DayOption(DayOptionTypes.Sun, this.tr.translate('lblSun')),
      new DayOption(DayOptionTypes.Weekday, this.tr.translate('lblWeekday')),
      new DayOption(DayOptionTypes.Weekend, this.tr.translate('lblWeekend')),
      new DayOption(DayOptionTypes.Holiday, this.tr.translate('lblHoliday')),
    ];
  }

  /**
   * Retrieves an array of `DayOption` objects representing all days of the week.
   * Each `DayOption` includes a day name and its corresponding translated label.
   *
   * @returns {DayOption[]} An array of `DayOption` objects for each day of the week.
   */
  static getAllDaysNames(): DayOption[] {
    return [
      new DayOption(DayOptionTypes.Mon, this.tr.translate('lblMon')),
      new DayOption(DayOptionTypes.Tue, this.tr.translate('lblTue')),
      new DayOption(DayOptionTypes.Wed, this.tr.translate('lblWed')),
      new DayOption(DayOptionTypes.Thu, this.tr.translate('lblThu')),
      new DayOption(DayOptionTypes.Fri, this.tr.translate('lblFri')),
      new DayOption(DayOptionTypes.Sat, this.tr.translate('lblSat')),
      new DayOption(DayOptionTypes.Sun, this.tr.translate('lblSun')),
    ];
  }
}
