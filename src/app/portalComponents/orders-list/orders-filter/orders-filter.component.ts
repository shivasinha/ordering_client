import { Component, inject, input, OnInit, output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { KeyValue } from '@angular/common';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import dayjs from 'dayjs';

import { OrderFilters, OrderState, OrderType } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { CustomValidationService } from '@Ordering/shared/services/custom-validation.service';
import { INITIAL_ORDER_FILTER } from '@Ordering/portalComponents/orders-list/models/order-list-filter.model';
import { OrderDateTimeEnum } from '@Ordering/data/custom/enum/orderDateTime';
import { DateRangeField } from '@Ordering/data/custom/enum/date-range-field.enum';
import { DateTimeFormat, normalizeToAPIDate } from '@Ordering/utils/dates';
import { getLocaleDateFormat } from '@Ordering/utils/dayjs-config';
import {
  CustomDateRangePickerComponent,
  DateRangeValue,
} from '@Ordering/shared/components/custom-date-range-picker/custom-date-range-picker.component';

/**
 * Signal-based filter component for the Order list (both current and archived tabs).
 * Receives initial filter state from the container and emits filter changes.
 */
@Component({
  selector: 'app-orders-filter',
  standalone: true,
  imports: [ReactiveFormsModule, SharedMaterialModule, TranslatePipe, CustomDateRangePickerComponent],
  templateUrl: './orders-filter.component.html',
  styleUrl: './orders-filter.component.scss',
})
export class OrdersFilterComponent implements OnInit {
  /** Initial filter values restored from saved state */
  readonly initialFilters = input<OrderFilters>(INITIAL_ORDER_FILTER);

  /** Available order states to show in the state dropdown (passed in by container) */
  readonly orderStates = input<KeyValue<number | undefined, string>[]>([]);

  /** Available order types to show in the type dropdown (passed in by container) */
  readonly orderTypes = input<KeyValue<number | undefined, string>[]>([]);

  /** Emitted whenever the filter changes (debounced) */
  readonly filterChange = output<OrderFilters>();

  /** Tracks the last emitted filter as JSON to deduplicate back-to-back identical emissions */
  private lastEmittedFilterJson: string | undefined;

  private readonly fb = inject(FormBuilder);
  private readonly tr = inject(TranslationsService);

  protected readonly DateRangeField = DateRangeField;
  protected readonly localeDateFormat = getLocaleDateFormat();

  protected readonly dateFilters: KeyValue<string, string>[] = [
    { key: OrderDateTimeEnum.CREATION_DATETIME, value: this.tr.translate('lblCreationDateTime') },
    { key: OrderDateTimeEnum.EXPIRATION_DATETIME, value: this.tr.translate('lblExpirtionDateTime') },
    { key: OrderDateTimeEnum.LAST_MODIFIED_DATETIME, value: this.tr.translate('lblLastChanged') },
  ];

  protected filterForm = new FormGroup({
    searchString: new FormControl<string | undefined>(INITIAL_ORDER_FILTER.searchString),
    dateRange: new FormControl<DateRangeValue>({ beginDate: undefined, endDate: undefined }, { nonNullable: true }),
    dateRangeType: new FormControl<string>(INITIAL_ORDER_FILTER.dateRangeType ?? OrderDateTimeEnum.CREATION_DATETIME, {
      nonNullable: true,
    }),
    orderState: new FormControl<OrderState | undefined>(undefined),
    orderType: new FormControl<OrderType | undefined>(undefined),
  });

  protected get dateRange(): FormControl<DateRangeValue> {
    return this.filterForm.get('dateRange') as FormControl<DateRangeValue>;
  }

  constructor() {
    // Real-time filtering with debounce
    this.filterForm.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      this.emitFilterChange();
    });
  }

  ngOnInit(): void {
    // Seed the form once from persisted state. Using ngOnInit (not effect) is intentional:
    // the container passes [initialFilters]="currentFilters()" as a live signal binding, so
    // an effect() would re-run every time this component emits a valid filter, echoing the
    // state back and wiping any partially-typed input. Since the component is destroyed and
    // recreated on every tab switch (portal-list uses @if), a one-time read on init is correct.
    const filters = this.initialFilters();
    const beginDateValue = filters.dateRange?.beginDate ? this.parseDate(filters.dateRange.beginDate) : null;
    const endDateValue = filters.dateRange?.endDate ? this.parseDate(filters.dateRange.endDate) : null;
    this.filterForm.patchValue(
      {
        searchString: filters.searchString ?? undefined,
        dateRange: { beginDate: beginDateValue ?? undefined, endDate: endDateValue ?? undefined },
        dateRangeType: filters.dateRangeType ?? OrderDateTimeEnum.CREATION_DATETIME,
        orderState: filters.orderState?.[0] ?? undefined,
        orderType: filters.orderType?.[0] ?? undefined,
      },
      { emitEvent: false },
    );
    // Seed the deduplication baseline so that the first form change is also
    // compared against the real initial state. Without this, lastEmittedFilterJson
    // is `undefined` and any first emission (e.g. changing dateRangeType with no
    // date range selected) would bypass the duplicate check and trigger a spurious API call.
    this.lastEmittedFilterJson = JSON.stringify(this.buildOrderFilters());
  }

  /**
   * Validates the date input string and updates form control errors accordingly.
   *
   * @param {Event} event - The input event containing the date string
   * @param {DateRangeField} fieldName - The date field to validate
   */
  protected validate(event: Event, fieldName: DateRangeField): void {
    const input = (event.target as HTMLInputElement).value;
    const control = this.dateRange.get(fieldName);

    if (!control) return;

    CustomValidationService.validateInputString(input, control);
  }

  /**
   * Clears the date range selection.
   *
   * @param {MouseEvent} event
   */
  protected clearDateRange(event: MouseEvent): void {
    event.stopPropagation();
    this.dateRange.reset();
  }

  /**
   * Emits normalized filter values from the current form state.
   * Skips emission if only one date of the range is selected (incomplete range).
   */
  private emitFilterChange(): void {
    if (!this.isDateRangeValid()) {
      return;
    }

    const filters = this.buildOrderFilters();
    const newFiltersJson = JSON.stringify(filters);
    if (newFiltersJson === this.lastEmittedFilterJson) {
      return;
    }
    this.lastEmittedFilterJson = newFiltersJson;
    this.filterChange.emit(filters);
  }

  /**
   * Constructs the OrderFilters object from form values and date range.
   */
  private buildOrderFilters(): OrderFilters {
    const rawValues = this.filterForm.getRawValue();
    const { beginDate, endDate } = rawValues.dateRange;
    const hasDateRange = !!beginDate && !!endDate;
    return {
      searchString: rawValues.searchString?.trim() || undefined,
      dateRange: hasDateRange ? this.normalizeDateRange(beginDate as Date, endDate as Date) : undefined,
      dateRangeType: hasDateRange ? rawValues.dateRangeType : undefined,
      orderState: rawValues.orderState != null ? [rawValues.orderState] : [],
      orderType: rawValues.orderType != null ? [rawValues.orderType] : undefined,
    };
  }

  /**
   * Normalizes the date range to API format.
   */
  private normalizeDateRange(beginDate: Date, endDate: Date) {
    return {
      beginDate: normalizeToAPIDate(beginDate),
      endDate: normalizeToAPIDate(endDate),
    };
  }

  /**
   * Determines whether the selected date range is valid for filtering.
   *
   * Validation rules:
   * - Returns `false` if either begin or end control contains any non-required validation errors.
   * - Returns `true` when both dates are empty (interpreted as "no date filter").
   * - Returns `false` when only one of the two dates is provided (partial range).
   * - Returns `true` only when both dates are provided and the date range group has no non-required errors.
   *
   * @returns `true` if the date range is considered valid for use; otherwise, `false`.
   */
  private isDateRangeValid(): boolean {
    if (this.hasNonRequiredErrors(this.dateRange)) return false;

    const currentRange = this.dateRange.value;
    const hasBegin = this.hasDateValue(currentRange?.beginDate);
    const hasEnd = this.hasDateValue(currentRange?.endDate);

    // Both empty → no date filter, allow
    if (!hasBegin && !hasEnd) return true;

    // Partial → block until both are filled
    if (hasBegin !== hasEnd) return false;

    return true;
  }

  /**
   * Determines whether a form control currently has any validation errors other than `required`.
   *
   * @param {AbstractControl | null} control - The Angular form control to inspect. If `null`/`undefined`, this returns `false`.
   * @returns {boolean} `true` when at least one non-`required` error exists on the control; otherwise `false`.
   */
  private hasNonRequiredErrors(control: AbstractControl | null): boolean {
    if (!control?.errors) return false;
    return Object.keys(control.errors).some(key => key !== 'required');
  }

  /**
   * Determines whether the provided value is a `Date` instance.
   *
   * Acts as a type guard, narrowing `value` from `unknown` to `Date` when `true`.
   *
   * @param {unknown} value - The value to evaluate.
   * @returns `true` if `value` is an instance of `Date`; otherwise, `false`.
   */
  private hasDateValue(value: unknown): value is Date {
    return value instanceof Date;
  }

  /**
   * Parses a YYYY-MM-DD date string into a Date object.
   *
   * @param {string} dateString - Date string in YYYY-MM-DD format
   * @returns {Date | null}
   */
  private parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    const parsed = dayjs(dateString, DateTimeFormat.API_DATE_FORMAT);
    return parsed.isValid() ? parsed.toDate() : null;
  }
}
