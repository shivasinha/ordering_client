import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

import { RestrictionTimeSlots } from '@Ordering/api';
import {
  CustomDateRangePickerComponent,
  DateRangeValue,
} from '@Ordering/shared/components/custom-date-range-picker/custom-date-range-picker.component';
import { CustomDateRangePickerConfig } from '@Ordering/shared/components/custom-date-range-picker/custom-date-range-picker-config.interface';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { dayjs } from '@Ordering/utils/dayjs-config';
import { normalizeToAPIDate } from '@Ordering/utils/dates';

/**
 * Data passed into the add/edit time-slot dialog.
 */
interface AddTimeSlotDialogData {
  initialValue?: RestrictionTimeSlots;
}

@Component({
  selector: 'app-add-time-slot-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    MatDialogModule,
    TranslatePipe,
    NgxMaskDirective,
    CustomDateRangePickerComponent,
  ],
  providers: [provideNgxMask()],
  templateUrl: './add-time-slot-dialog.component.html',
  styleUrl: './add-time-slot-dialog.component.scss',
})
/**
 * Dialog for adding or editing a single restriction time slot.
 */
export class AddTimeSlotDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<AddTimeSlotDialogComponent, RestrictionTimeSlots | undefined>);
  private readonly dialogData = inject<AddTimeSlotDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private readonly tr = inject(TranslationsService);
  private readonly configDataService = inject(ConfigDataService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isEditMode = computed(() => !!this.dialogData.initialValue);
  protected readonly dateRangePickerConfig = computed<CustomDateRangePickerConfig>(() => this.configDataService.getSelectedProjectPeriod());

  protected readonly form = new FormGroup({
    dateRange: new FormControl<DateRangeValue>({} as DateRangeValue, [Validators.required]),
    fromTime: new FormControl<string>('00:00', {
      nonNullable: true,
      validators: [Validators.required, AddTimeSlotDialogComponent.timeFormatValidator()],
    }),
    toTime: new FormControl<string>('00:00', {
      nonNullable: true,
      validators: [Validators.required, AddTimeSlotDialogComponent.timeFormatValidator()],
    }),
    separated: new FormControl<boolean>(false, { nonNullable: true }),
  });

  /**
   * Creates the dialog form and pre-fills it when editing an existing slot.
   * Also wires up the logic to disable the "Separated" checkbox whenever the
   * selected date range spans a single day, because a separation between start
   * and end date is meaningless in that case.
   */
  constructor() {
    const initial = this.dialogData.initialValue;
    if (initial) {
      const beginDate = AddTimeSlotDialogComponent.parseIsoDate(initial.beginDate);
      const endDate = AddTimeSlotDialogComponent.parseIsoDate(initial.endDate);
      this.form.patchValue({
        dateRange: { beginDate, endDate },
        fromTime: initial.fromTime,
        toTime: initial.toTime,
        separated: initial.broken,
      });
      this.updateSeparatedState({ beginDate, endDate });
    }

    this.form
      .get('dateRange')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(val => this.updateSeparatedState(val as DateRangeValue | null));
  }

  /**
   * Disables the "Separated" checkbox and resets it to false when both dates
   * in the range refer to the same calendar day.  Re-enables it otherwise.
   *
   * @param {DateRangeValue | null | undefined} value - Current date-range value.
   */
  private updateSeparatedState(value: DateRangeValue | null | undefined): void {
    const separatedCtrl = this.form.get('separated')!;
    const { beginDate, endDate } = value ?? {};
    if (beginDate && endDate && dayjs(beginDate).isSame(dayjs(endDate), 'day')) {
      separatedCtrl.setValue(false);
      separatedCtrl.disable();
    } else {
      separatedCtrl.enable();
    }
  }

  /**
   * Closes the dialog without returning a value.
   */
  protected onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Validates and returns the edited time slot.
   */
  protected onAdd(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const { beginDate, endDate } = value.dateRange as DateRangeValue;
    const result: RestrictionTimeSlots = {
      beginDate: normalizeToAPIDate(beginDate),
      endDate: normalizeToAPIDate(endDate),
      fromTime: value.fromTime,
      toTime: value.toTime,
      broken: value.separated,
    };

    this.dialogRef.close(result);
  }

  /**
   * Builds the translated required-field error message.
   *
   * @param {string} labelKey - Translation key for the field label.
   * @returns {string} Localised validation text.
   */
  protected requiredMessage(labelKey: string): string {
    return this.tr.translate('msgNotEmpty').replace('{0}', this.tr.translate(labelKey as any));
  }

  /**
   * Builds the translated invalid-time-format error message.
   *
   * @returns {string} Localised validation text.
   */
  protected invalidTimeFormatMessage(): string {
    return this.tr.translate('msgInvalidTimeFormat').replace('{0}', this.tr.translate('msgTimeFormatInvalidHM'));
  }

  /**
   * Validates that the control holds a time in HH:mm (24-hour) format.
   *
   * The `Hh:m0` input mask always emits a colon-separated value, so only the
   * HH:mm form needs to be accepted here; empty values are left to the
   * `Validators.required` rule.
   *
   * @returns {ValidatorFn} Validator that accepts HH:mm (24-hour) values.
   */
  private static timeFormatValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = (control.value as string | null)?.trim() ?? '';
      if (!value) {
        return null;
      }

      return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value) ? null : { timeFormat: true };
    };
  }

  /**
   * Parses a strict ISO date string into a Date instance.
   *
   * @param {string} value - ISO date string in YYYY-MM-DD format.
   * @returns {Date | undefined} Parsed date or undefined when the input is invalid.
   */
  private static parseIsoDate(value: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = dayjs(value, 'YYYY-MM-DD', true);
    return parsed.isValid() ? parsed.toDate() : undefined;
  }
}
