import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { dayjs, getLocaleDateFormat } from '@Ordering/utils/dayjs-config';
import { isOperatorResponse, isStationsResponse, isTrainTypeResponse } from '@Ordering/utils/type-guards/data';

/**
 * Type alias for validation error objects.
 */
type ValidatorErrorField = { [key: string]: boolean };

/**
 * Constants for validation-related strings and formats.
 */
export const ValidationConstants = {
  SEPARATORS: {
    COMMA: ',',
  },
  ERROR_KEYS: {
    INVALID_DATE_INPUT: 'invalidDateInput',
    INVALID_NUMERIC_LIST: 'invalidNumericList',
    SELECTION_REQUIRED: 'selectionRequired',
    DATE_RANGE_INVALID: 'dateRangeInvalid',
  },
  NUMERIC_PATTERN: /^\d+$/,
  RADIX: 10,
} as const;

/**
 * Validates a date input string against the current locale's date format using dayjs strict parsing.
 * Returns true if the string is a valid date for the locale format, false otherwise.
 * An empty or whitespace-only string is considered valid (not an error — required validators handle that).
 */
function isValidLocaleDate(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) {
    return true;
  }
  const format = getLocaleDateFormat();
  return dayjs(trimmed, format, true).isValid();
}

/**
 * Value object representing a date range with validation logic.
 */
class DateRange {
  constructor(
    public readonly startDate: Date | null,
    public readonly endDate: Date | null,
  ) {}

  isValid(): boolean {
    if (!this.startDate || !this.endDate) {
      return true;
    }
    return !dayjs(this.endDate).isBefore(dayjs(this.startDate));
  }
}

/**
 * Interface for configuration of the date range validator.
 * Groups together the control names for the begin and end dates,
 * and the error object to be returned on failure.
 */
export interface DateRangeValidatorConfig {
  /** The name of the form control containing the begin date. */
  beginDateControlName: string;
  /** The name of the form control containing the end date. */
  endDateControlName: string;
  /** The error object to return when validation fails. */
  error: ValidatorErrorField;
}

export interface DateRangeOutOfBoundsValidatorConfig extends DateRangeValidatorConfig {
  /** The minimum allowed date. */
  minDate?: Date;
  /** The maximum allowed date. */
  maxDate?: Date;
}

/**
 * Interface for configuring how to update control errors.
 */
interface ControlErrorUpdateConfig {
  /** The specific error key to add or remove from the control's errors. */
  errorKey: string;
  /** The validation error object to add (if not null) or to indicate removal (if null). */
  validationError: ValidationErrors | null;
}

@Injectable({
  providedIn: 'root',
})
export class CustomValidationService {
  /**
   * Validator function that checks if a comma-separated list contains only valid numeric values.
   *
   * @param {Object} validatorField - The error object to return when validation fails
   * @returns {ValidatorFn} A validator function that returns an error if the list contains non-numeric values
   *
   * @example
   * const control = new FormControl('1,2,3');
   * const validator = CustomValidationService.isNumericList({ invalidNumericList: true });
   */
  public static isNumericList(validatorField: ValidatorErrorField): ValidatorFn {
    return (control: AbstractControl): ValidatorErrorField | null => {
      const value = control.value;
      if (!value) return null;

      const numbers = value.toString().split(ValidationConstants.SEPARATORS.COMMA);
      return this.areAllNumbersValid(numbers) ? null : validatorField;
    };
  }

  /**
   * Checks if all items in an array are valid numeric strings.
   *
   * @private
   * @param {string[]} numbers - Array of strings to validate
   * @returns {boolean} True if all items are valid numbers, false otherwise
   */
  private static areAllNumbersValid(numbers: string[]): boolean {
    return numbers.every(num => this.isValidNumericString(num));
  }

  /**
   * Checks if a string is a valid numeric value (all characters are digits).
   *
   * @private
   * @param {string} value - The string to validate
   * @returns {boolean} True if the string represents a valid number, false otherwise
   */
  private static isValidNumericString(value: string): boolean {
    const parsed = parseInt(value, ValidationConstants.RADIX);
    if (isNaN(parsed)) {
      return false;
    }
    return ValidationConstants.NUMERIC_PATTERN.test(value);
  }

  public static selectionRequiredValidator(validatorField: ValidatorErrorField): ValidatorFn {
    return (control: AbstractControl): ValidatorErrorField | null => {
      const value = control.value;

      // If the value is empty, return null (no error)
      if (!value) {
        return null;
      }

      // Check if the value matches any of the expected response types
      if (isOperatorResponse(value) || isTrainTypeResponse(value) || isStationsResponse(value)) {
        return null;
      }

      // If the value is not valid, return the error
      return validatorField;
    };
  }

  /**
   * Validator function that checks if the start date in a date range is before the end date.
   *
   * @param {DateRangeValidatorConfig} config - Configuration object containing the begin and end date control names and the error object.
   * @returns {ValidatorFn} A validator function that returns a ValidationErrors object if the end date is before the begin date,
   *     or null if the date range is valid or if either date is missing.
   *
   * @remarks
   * This validator expects a form group with two controls specified by the field name parameters.
   * Both controls should contain Date objects or null values.
   *
   * @example
   * const formGroup = new FormGroup({
   *  beginDate: new FormControl(new Date('2023-01-01')),
   *  endDate: new FormControl(new Date('2023-12-31'))
   * }, { validators: CustomValidationService.dateRangeStartIsBeforeEndValidator(
   *  {
   *   beginDateControlName: 'beginDate',
   *   endDateControlName: 'endDate',
   *   error: { dateRangeInvalid: true }
   *  }
   * ) });
   */
  public static dateRangeStartIsBeforeEndValidator(config: DateRangeValidatorConfig): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const beginDate = control.get(config.beginDateControlName)?.value as Date | null;
      const endDate = control.get(config.endDateControlName)?.value as Date | null;

      const dateRange = new DateRange(beginDate, endDate);
      if (!dateRange.isValid()) {
        return config.error;
      }

      return null;
    };
  }

  /**
   * Validator function that checks if both dates in a date range fall within the configured bounds.
   *
   * @param {DateRangeOutOfBoundsValidatorConfig} config - Configuration object containing control names, min/max dates, and the error object.
   * @returns {ValidatorFn} A validator function that returns the configured error if either date is outside the bounds,
   *     or null if the range is valid or if either date is missing.
   */
  public static dateRangeOutOfBoundsValidator(config: DateRangeOutOfBoundsValidatorConfig): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const beginDate = control.get(config.beginDateControlName)?.value as Date | null;
      const endDate = control.get(config.endDateControlName)?.value as Date | null;

      if (!beginDate || !endDate) {
        return null;
      }

      if (config.minDate && config.maxDate) {
        const isOutOfBounds = [beginDate, endDate].some(date => this.isDateOutOfBounds(date, config.minDate!, config.maxDate!));
        return isOutOfBounds ? config.error : null;
      }

      return null;
    };
  }

  /**
   * Checks whether a date falls outside the given min/max boundaries.
   *
   * @param {Date} date - The date to check.
   * @param {Date} minDate - The earliest allowed date.
   * @param {Date} maxDate - The latest allowed date.
   * @returns {boolean} True if the date is before minDate or after maxDate.
   */
  private static isDateOutOfBounds(date: Date, minDate: Date, maxDate: Date): boolean {
    const d = dayjs(date);
    return d.isBefore(dayjs(minDate)) || d.isAfter(dayjs(maxDate));
  }

  /**
   * Validates an input string against date input requirements and updates the control's error state.
   *
   * This method validates the provided input string using `validateDateInputString` and manages
   * the control's errors by adding or removing the `invalidDateInput` error while preserving
   * any other existing validation errors.
   *
   * @param {string} input - The string to validate as a date input
   * @param {AbstractControl} control - The AbstractControl instance whose error state will be updated
   *
   * @returns {void}
   *
   * @remarks
   * - If the control is null or undefined, the method returns early without performing validation
   * - Existing errors on the control are preserved when adding or removing the `invalidDateInput` error
   * - If validation fails, the `invalidDateInput` error is added to the control's errors
   * - If validation passes, the `invalidDateInput` error is removed, and the control's errors are set to null if no other errors remain
   */
  public static validateInputString(input: string, control: AbstractControl): void {
    if (!control) return;

    const validationError = this.validateDateInputString(input, { [ValidationConstants.ERROR_KEYS.INVALID_DATE_INPUT]: true });
    this.updateControlErrors(control, {
      errorKey: ValidationConstants.ERROR_KEYS.INVALID_DATE_INPUT,
      validationError: validationError,
    });
  }

  /**
   * Updates a control's errors by adding or removing a specific error key while preserving other errors.
   *
   * @private
   * @param {AbstractControl} control - The control to update
   * @param {ControlErrorUpdateConfig} config - Configuration object specifying the error key and the validation error to apply.
   */
  private static updateControlErrors(control: AbstractControl, config: ControlErrorUpdateConfig): void {
    const currentErrors = control.errors || {};

    if (config.validationError) {
      control.setErrors({ ...currentErrors, ...config.validationError });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [config.errorKey]: _removed, ...remainingErrors } = currentErrors;
      control.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
    }
  }

  /**
   * Validates a date input string against the current locale's date format.
   * Uses strict dayjs parsing with the format returned by `getLocaleDateFormat()`.
   *
   * @param {string} input - The date string to validate (locale-aware format, e.g. DD/MM/YYYY, MM/DD/YYYY)
   * @param {Object} validatorField - The error object to return when validation fails
   * @returns {ValidationErrors | null} The validation error object if invalid, null if valid or empty
   *
   * @example
   * const error = CustomValidationService.validateDateInputString(
   *  '05/99/2026',
   *  { invalidDateInput: true }
   * );
   * // Returns { invalidDateInput: true } because month 99 is invalid
   */
  private static validateDateInputString(input: string, validatorField: ValidatorErrorField): ValidationErrors | null {
    const trimmedInput = input.trim();

    if (!trimmedInput) {
      return null;
    }

    if (!isValidLocaleDate(trimmedInput)) {
      return validatorField;
    }

    return null;
  }
}
