import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import dayjs from 'dayjs';

import { SpareCapacityFilters } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import {
  CustomDateRangePickerComponent,
  DateRangeValue,
} from '@Ordering/shared/components/custom-date-range-picker/custom-date-range-picker.component';
import { INITIAL_SPARE_CAPACITY_FILTER } from '@Ordering/portalComponents/spare-capacity/models/spare-capacity-filter.model';
import { DateTimeFormat, normalizeToAPIDate } from '@Ordering/utils/dates';

/**
 * Filter component for Spare Capacity list
 * Emits filter changes in real-time with debounce
 */
@Component({
  selector: 'app-spare-capacity-filter',
  imports: [CommonModule, SharedMaterialModule, ReactiveFormsModule, TranslatePipe, CustomDateRangePickerComponent],
  templateUrl: './spare-capacity-filter.component.html',
  styleUrl: './spare-capacity-filter.component.scss',
})
export class SpareCapacityFilterComponent {
  // Input signal for initial filter values from saved state
  readonly initialFilters = input<SpareCapacityFilters>(INITIAL_SPARE_CAPACITY_FILTER);

  readonly filterChange = output<SpareCapacityFilters>();

  protected filterForm = new FormGroup({
    trainId: new FormControl<string | undefined>(INITIAL_SPARE_CAPACITY_FILTER.trainId),
    dateRange: new FormControl<DateRangeValue>({ beginDate: undefined, endDate: undefined }, { nonNullable: true }),
    fromStation: new FormControl<string | undefined>(INITIAL_SPARE_CAPACITY_FILTER.fromStation),
    toStation: new FormControl<string | undefined>(INITIAL_SPARE_CAPACITY_FILTER.toStation),
  });

  constructor() {
    // Populate form with initial filter values when they change
    effect(() => {
      const filters = this.initialFilters();
      // Convert date string from storage back to Date object for datepicker
      const beginDateValue = filters.dateRange?.beginDate ? this.parseDate(filters.dateRange.beginDate) : null;
      const endDateValue = filters.dateRange?.endDate ? this.parseDate(filters.dateRange.endDate) : null;
      this.filterForm.patchValue(
        {
          ...filters,
          dateRange: {
            beginDate: beginDateValue ?? undefined,
            endDate: endDateValue ?? undefined,
          },
        },
        { emitEvent: false },
      );
    });

    // Real-time filtering with debounce
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.emitFilterChange();
      });
  }

  /**
   * Emits the current filter values from the filter form after normalizing them.
   *
   * Retrieves raw values from the filter form, converts any null, undefined, or empty string values to `undefined`
   * to match the `SpareCapacityFilters` type requirements. Trims whitespace from station fields.
   * Converts Date objects to YYYY-MM-DD format strings to prevent timezone issues in storage and API calls.
   * Only emits if both dates are provided or both are empty (prevents partial date range).
   * Finally, emits the normalized filter values via the `filterChange` event emitter.
   */
  private emitFilterChange(): void {
    const rawValues = this.filterForm.getRawValue();
    const beginDate = rawValues.dateRange.beginDate;
    const endDate = rawValues.dateRange.endDate;

    // Don't emit if only one date is selected (incomplete date range)
    const hasBeginDate = !!beginDate;
    const hasEndDate = !!endDate;
    if (hasBeginDate !== hasEndDate) {
      return;
    }

    const filterValues: SpareCapacityFilters = {
      trainId: rawValues.trainId ?? undefined,
      dateRange: {
        beginDate: beginDate ? normalizeToAPIDate(beginDate) : undefined,
        endDate: endDate ? normalizeToAPIDate(endDate) : undefined,
      },
      fromStation: rawValues.fromStation?.trim() || undefined,
      toStation: rawValues.toStation?.trim() || undefined,
    };
    this.filterChange.emit(filterValues);
  }

  /**
   * Resets the filter form to its initial state using the predefined filter values.
   */
  protected resetFilters(): void {
    this.filterForm.reset({
      trainId: INITIAL_SPARE_CAPACITY_FILTER.trainId,
      dateRange: { beginDate: undefined, endDate: undefined },
      fromStation: INITIAL_SPARE_CAPACITY_FILTER.fromStation,
      toStation: INITIAL_SPARE_CAPACITY_FILTER.toStation,
    });
  }

  /**
   * Parses a YYYY-MM-DD date string into a Date object.
   * Creates date at midnight in local timezone to prevent date shifts.
   *
   * @param {string} dateString - Date string in YYYY-MM-DD format
   * @returns {Date | undefined} Parsed Date object or undefined if invalid
   */
  private parseDate(dateString: string): Date | undefined {
    if (!dateString) return undefined;
    const parsed = dayjs(dateString, DateTimeFormat.API_DATE_FORMAT);
    return parsed.isValid() ? parsed.toDate() : undefined;
  }
}
