import { Component, DestroyRef, effect, forwardRef, inject, input, OnInit, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  FormGroup,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  ValidationErrors,
  Validator,
  Validators,
} from '@angular/forms';

import { DateRangeValidityFixerDirective } from '@Ordering/core/directives/date-range-validity-fixer.directive';
import { RestrictYearLengthDirective } from '@Ordering/core/directives/restrict-year-length.directive';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { DateRangeField } from '@Ordering/data/custom/enum/date-range-field.enum';
import { CustomValidationService } from '@Ordering/shared/services/custom-validation.service';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { DateTimeFormat } from '@Ordering/utils/dates';
import { CustomDateRangePickerConfig } from './custom-date-range-picker-config.interface';
import { dayjs, getLocaleDateFormat } from '@Ordering/utils/dayjs-config';

export interface DateRangeValue {
  beginDate?: Date;
  endDate?: Date;
}

@Component({
  selector: 'app-custom-date-range-picker',
  imports: [ReactiveFormsModule, SharedMaterialModule, TranslatePipe, RestrictYearLengthDirective, DateRangeValidityFixerDirective],
  templateUrl: './custom-date-range-picker.component.html',
  styleUrl: './custom-date-range-picker.component.scss',
  host: {
    '[class.full-width]': 'config()?.fullWidth',
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomDateRangePickerComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => CustomDateRangePickerComponent),
      multi: true,
    },
  ],
})
export class CustomDateRangePickerComponent implements ControlValueAccessor, OnInit, Validator {
  readonly config = input<CustomDateRangePickerConfig>();

  /**
   * Legacy (non-reactive-forms) input API.
   *
   * When the component is used with `formControlName` / `formControl`, this input is ignored.
   */
  readonly dateRangeValue = input<DateRangeValue>();

  /**
   * Legacy (non-reactive-forms) output API.
   *
   * When the component is used as a form control, value propagation happens via the
   * ControlValueAccessor callbacks; this output is still emitted for backwards compatibility.
   */
  readonly dateRangeChange = output<DateRangeValue>();

  private readonly destroyRef = inject(DestroyRef);
  protected readonly tr = inject(TranslationsService);

  protected readonly DateTimeFormat = DateTimeFormat;
  protected readonly DateRangeField = DateRangeField;

  protected dateRange = new FormGroup(
    {
      beginDate: new FormControl<Date | undefined>(
        {
          value: undefined,
          disabled: false,
        },
        Validators.required,
      ),
      endDate: new FormControl<Date | undefined>(
        {
          value: undefined,
          disabled: false,
        },
        Validators.required,
      ),
    },
    {
      validators: [
        CustomValidationService.dateRangeStartIsBeforeEndValidator({
          beginDateControlName: DateRangeField.BEGIN_DATE,
          endDateControlName: DateRangeField.END_DATE,
          error: { dateRangeInvalid: true },
        }),
        // Read min/max from the config signal at validation time: the config input is
        // not yet resolved when this FormGroup is constructed, so reading it eagerly
        // would permanently capture undefined bounds and the out-of-bounds error
        // would never fire (Material's matDatepickerMin/Max hint would show instead).
        control =>
          CustomValidationService.dateRangeOutOfBoundsValidator({
            beginDateControlName: DateRangeField.BEGIN_DATE,
            endDateControlName: DateRangeField.END_DATE,
            minDate: this.config()?.minDate,
            maxDate: this.config()?.maxDate,
            error: { dateRangeOutOfBounds: true },
          })(control),
      ],
    },
  );

  private onChange: (value: DateRangeValue) => void = () => {};
  private onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};
  private hasBeenTouched = false;

  protected get minDateFormated(): string {
    return dayjs(this.config()?.minDate).format(getLocaleDateFormat());
  }
  protected get maxDateFormated(): string {
    return dayjs(this.config()?.maxDate).format(getLocaleDateFormat());
  }
  protected get localeDateFormat(): string {
    return getLocaleDateFormat();
  }

  /**
   * Internal flag to avoid patching from the legacy `dateRangeValue` input once the component
   * is being driven by Angular Forms (i.e. `writeValue` has been called).
   */
  private isControlledByFormsApi = false;

  constructor() {
    effect(() => {
      if (this.isControlledByFormsApi) return;
      const value = this.dateRangeValue();
      if (value) {
        this.dateRange.patchValue(value, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.dateRange.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      if (this.dateRange.hasError('dateRangeInvalid') || this.dateRange.hasError('dateRangeOutOfBounds')) {
        return;
      }

      const normalized: DateRangeValue = {
        beginDate: value.beginDate ?? undefined,
        endDate: value.endDate ?? undefined,
      };

      this.onChange(normalized);
      this.dateRangeChange.emit(normalized);
    });

    this.dateRange.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.onValidatorChange();
    });
  }

  /**
   * ControlValueAccessor: writes a value coming from Angular Forms into the internal `FormGroup`.
   *
   * Notes:
   * - Uses `emitEvent: false` to avoid echoing the write back to the parent form.
   * - Marks the component as "forms-controlled" so the legacy `dateRangeValue` input will no longer patch.
   *
   * @param {DateRangeValue | null | undefined} value - The new value to write to the form, which may be null or undefined to indicate no value
   * @returns {void}
   */
  writeValue(value: DateRangeValue | null | undefined): void {
    this.isControlledByFormsApi = true;
    this.hasBeenTouched = false;
    if (!value) {
      this.dateRange.reset(undefined, { emitEvent: false });
      return;
    }

    this.dateRange.patchValue(
      {
        beginDate: value.beginDate ?? undefined,
        endDate: value.endDate ?? undefined,
      },
      { emitEvent: false },
    );
  }

  /**
   * ControlValueAccessor: registers a callback to notify Angular Forms when the value changes.
   *
   * @param {function} fn - The callback function to register, which takes the new value as an argument
   * @returns {void}
   */
  registerOnChange(fn: (value: DateRangeValue) => void): void {
    this.onChange = fn;
  }

  /**
   * ControlValueAccessor: registers a callback to notify Angular Forms when the control is touched.
   *
   * @param {function} fn - The callback function to register
   * @returns {void}
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * ControlValueAccessor: updates disabled state coming from Angular Forms.
   *
   * @param {boolean} isDisabled - Whether the control should be disabled
   * @returns {void}
   */
  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.dateRange.disable({ emitEvent: false });
    } else {
      this.dateRange.enable({ emitEvent: false });
    }
    this.onValidatorChange();
  }

  /**
   * Validator: exposes internal form validation to the parent form control.
   *
   * Aggregates group-level and child-control errors so consumers can use standard
   * form APIs like `control.invalid` and check errors on the form control.
   *
   * @returns {ValidationErrors | null} An object containing validation errors if the control is invalid, or null if it is valid.
   */
  validate(): ValidationErrors | null {
    const errors: ValidationErrors = {
      ...(this.dateRange.errors ?? {}),
      ...this.getChildErrors(),
    };

    return Object.keys(errors).length ? errors : null;
  }

  /**
   * Collects and merges all validation errors from the begin and end date child controls.
   *
   * Aggregates specific validation errors from both begin and end date controls.
   *
   * @returns {ValidationErrors} Merged validation errors from both child controls,
   *          or an empty object if neither control has errors.
   */
  private getChildErrors(): ValidationErrors {
    const beginErrors = this.dateRange.get(DateRangeField.BEGIN_DATE)?.errors;
    const endErrors = this.dateRange.get(DateRangeField.END_DATE)?.errors;

    return {
      ...beginErrors,
      ...endErrors,
    };
  }

  /**
   * Validator: registers a callback so Angular Forms can re-run validation when internal
   * validation state changes.
   *
   * @param {function} fn - The callback function to register
   * @return {void}
   */
  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  /**
   * Validates the date input string and updates the form control errors accordingly.
   *
   * This method is triggered on input events and performs custom validation on date input strings.
   * It preserves existing validation errors while adding or removing the `invalidDateInput` error
   * based on the validation result. After updating the control's errors, it triggers validation
   * on the parent FormGroup to ensure all related validators are updated.
   *
   * @param {Event} event - The input event containing the date string to validate
   * @param {DateRangeField} fieldName - The name of the date field to validate (DateRangeField enum)
   *
   * @remarks
   * - If the input is invalid, adds an `invalidDateInput` error to the control while preserving other errors
   * - If the input is valid, removes the `invalidDateInput` error while preserving other errors
   * - Triggers `updateValueAndValidity()` on the parent FormGroup to update cross-field validation
   *
   */
  protected validateDateInput(event: Event, fieldName: DateRangeField): void {
    const input = (event.target as HTMLInputElement).value;
    const control = this.dateRange.get(fieldName);

    if (!control) return;

    CustomValidationService.validateInputString(input, control);

    // Trigger validation on the parent FormGroup to update dateRangeInvalid
    this.dateRange.updateValueAndValidity();
  }

  /**
   * Marks the control as touched exactly once and notifies Angular Forms.
   * Called from blur handlers and on clear action.
   *
   * @returns {void}
   */
  protected markAsTouched(): void {
    if (this.hasBeenTouched) return;
    this.hasBeenTouched = true;
    this.onTouched();
  }

  /**
   * Clear the date range selection
   *
   * @param {MouseEvent} event
   * @returns {void}
   */
  protected clearDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.dateRange.reset();
    this.markAsTouched();
  }
}
