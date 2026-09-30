import { CommonModule } from '@angular/common';
import { Component, signal, computed, OnDestroy, output, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Subject, takeUntil } from 'rxjs';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import {
  CustomDateRangePickerComponent,
  DateRangeValue,
} from '@Ordering/shared/components/custom-date-range-picker/custom-date-range-picker.component';
import { PresavedTemplateFilterCriteria } from '@Ordering/portalComponents/operating-days/presaved-template/models/presaved-template-filter.interface';
import { DateTimeFormat, dayjs } from '@Ordering/utils/dates';

@Component({
  selector: 'app-presaved-template-filter',
  standalone: true,
  imports: [CommonModule, MatSlideToggleModule, SharedMaterialModule, ReactiveFormsModule, TranslatePipe, CustomDateRangePickerComponent],
  templateUrl: './presaved-template-filter.component.html',
  styleUrl: './presaved-template-filter.component.scss',
})
export class PresavedTemplateFilterComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // Signal-based output events
  public filterApplied = output<PresavedTemplateFilterCriteria>();

  // Form state signals for reactive computed properties
  protected readonly formState = signal<any>({});

  // Form
  protected filterForm = new FormGroup({
    searchString: new FormControl(''),
    dateRange: new FormControl<DateRangeValue>({ beginDate: undefined, endDate: undefined }, { nonNullable: true }),
    matchAnyDate: new FormControl(false),
  });

  /**
   * Computed signal that determines whether the filter can be applied based on the current form state.
   *
   * The filter can be applied when:
   * - A begin date is present in the date range
   * - An end date is present in the date range
   *
   * @returns {boolean} `true` if all conditions are met and the filter can be applied, `false` otherwise
   */
  protected readonly canApplyFilter = computed(() => {
    const formState = this.formState();
    const hasBeginDate = formState?.dateRange?.beginDate;
    const hasEndDate = formState?.dateRange?.endDate;
    const hasValidDateRange = hasBeginDate && hasEndDate;

    return Boolean(hasValidDateRange);
  });

  protected readonly DateTimeFormat = DateTimeFormat;

  ngOnInit(): void {
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Sets up form value change subscriptions to track filter form state.
   * Subscribes to form value changes and updates the form state signal accordingly.
   * The subscription is automatically cleaned up when the component is destroyed.
   *
   * @return {void}
   */
  private setupFormSubscriptions(): void {
    this.filterForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.formState.set(value);
    });
  }

  /**
   * Applies the current filter criteria to get the presaved templates.
   *
   * Validates that the filter can be applied before proceeding. If validation passes,
   * extracts values from the filter form and constructs a filter criteria object
   * containing search string, date range, and match options. Emits the criteria
   * through the filterApplied event for parent components to handle.
   *
   * - Returns early if `canApplyFilter()` returns false
   * - Uses default values for optional form fields (empty string for searchString, false for matchAnyDate)
   * - Requires filterForm to have searchString, dateRange, and matchAnyDate controls
   *
   * @returns {void} - Does not return a value, but emits filterApplied event
   */
  protected applyFilter(): void {
    if (!this.canApplyFilter()) {
      return;
    }

    const formValue = this.filterForm.value;
    const criteria: PresavedTemplateFilterCriteria = {
      searchString: formValue.searchString || '',
      beginDate: dayjs(formValue.dateRange?.beginDate).format(DateTimeFormat.API_DATE_FORMAT),
      endDate: dayjs(formValue.dateRange?.endDate).format(DateTimeFormat.API_DATE_FORMAT),
      matchAnyDate: formValue.matchAnyDate || false,
    };

    this.filterApplied.emit(criteria);
  }
}
