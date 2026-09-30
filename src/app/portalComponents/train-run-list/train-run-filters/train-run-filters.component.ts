import { Component, inject, input, OnInit, output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { KeyValue } from '@angular/common';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Source, TrainState } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { CustomValidationService } from '@Ordering/shared/services/custom-validation.service';
import { normalizeToAPIDate } from '@Ordering/utils/dates';
import { getLocaleDateFormat } from '@Ordering/utils/dayjs-config';
import { TrainDateTimeEnum } from '@Ordering/data/custom/enum/trainDateTime';
import { DateRangeField } from '@Ordering/data/custom/enum/date-range-field.enum';
import { INITIAL_TRAIN_RUN_FILTER, TrainRunListFilter } from '@Ordering/portalComponents/train-run-list/models/train-run-list-filter.model';
import {
  CustomDateRangePickerComponent,
  DateRangeValue,
} from '@Ordering/shared/components/custom-date-range-picker/custom-date-range-picker.component';

/**
 * Signal-based filter component for the Train Run list.
 * Receives initial filter state from the container and emits debounced filter changes.
 */
@Component({
  selector: 'app-train-run-filters',
  standalone: true,
  imports: [ReactiveFormsModule, SharedMaterialModule, TranslatePipe, CustomDateRangePickerComponent],
  templateUrl: './train-run-filters.component.html',
  styleUrl: './train-run-filters.component.scss',
})
export class TrainRunFiltersComponent implements OnInit {
  /** Initial filter values restored from saved state. */
  readonly initialFilters = input<TrainRunListFilter>(INITIAL_TRAIN_RUN_FILTER);

  /** Emitted whenever the filter changes (debounced). */
  readonly filterChange = output<TrainRunListFilter>();

  /** Tracks the last emitted filter as JSON to deduplicate back-to-back identical emissions. */
  private lastEmittedFilterJson: string | undefined;

  private readonly fb = inject(FormBuilder);
  private readonly tr = inject(TranslationsService);
  private readonly filterService = inject(FilterService);

  protected readonly DateRangeField = DateRangeField;
  protected readonly localeDateFormat = getLocaleDateFormat();
  protected readonly ALL_PROJECTS = 'allProjects';

  protected readonly dateFilters: KeyValue<string, string>[] = [
    { key: TrainDateTimeEnum.BEGIN_DATE, value: this.tr.translate('lblBeginDate') },
    { key: TrainDateTimeEnum.LAST_MODIFIED_DATETIME, value: this.tr.translate('lblLastChanged') },
    { key: TrainDateTimeEnum.CANCELLATION_DATE, value: this.tr.translate('lblCancellationDate') },
    { key: TrainDateTimeEnum.RUNNING_DATE, value: this.tr.translate('lblRunningDate') },
  ];

  protected readonly trainStateOptions: KeyValue<TrainState | undefined, string>[] = [
    { key: undefined, value: this.tr.translate('lblAllStates') },
    { key: TrainState.PUBLISHED, value: this.tr.translate('lblPublished') },
    { key: TrainState.CANCELLED, value: this.tr.translate('lblCancelled') },
  ];

  protected readonly trainSourceOptions = this.filterService.trainSources;

  protected readonly projectOptions: KeyValue<string, string>[] = [
    { key: '', value: localStorage.getItem('project') || '' },
    { key: this.ALL_PROJECTS, value: this.tr.translate('lblAllProjects') },
  ];

  protected filterForm = new FormGroup({
    searchString: new FormControl<string | undefined>(INITIAL_TRAIN_RUN_FILTER.searchString),
    dateRange: new FormControl<DateRangeValue>({ beginDate: undefined, endDate: undefined }, { nonNullable: true }),
    dateRangeType: new FormControl<string>(INITIAL_TRAIN_RUN_FILTER.dateRangeType ?? TrainDateTimeEnum.BEGIN_DATE, { nonNullable: true }),
    trainState: new FormControl<TrainState | undefined>(undefined),
    trainSource: new FormControl<Source | undefined>(undefined),
    projectList: new FormControl<string>('', { nonNullable: true }),
  });

  protected get dateRange(): FormControl<DateRangeValue> {
    return this.filterForm.get('dateRange') as FormControl<DateRangeValue>;
  }

  constructor() {
    this.filterForm.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      this.emitFilterChange();
    });
  }

  ngOnInit(): void {
    const filters = this.initialFilters();
    const beginDateValue = filters.dateRange?.beginDate ? new Date(filters.dateRange.beginDate) : undefined;
    const endDateValue = filters.dateRange?.endDate ? new Date(filters.dateRange.endDate) : undefined;

    this.filterForm.patchValue(
      {
        searchString: filters.searchString ?? undefined,
        dateRange: { beginDate: beginDateValue, endDate: endDateValue },
        dateRangeType: filters.dateRangeType ?? TrainDateTimeEnum.BEGIN_DATE,
        trainState: filters.state?.[0] !== undefined ? (filters.state[0] as TrainState) : undefined,
        trainSource: filters.trainSource !== undefined ? (filters.trainSource as Source) : undefined,
        projectList: filters.showAllProjects ? this.ALL_PROJECTS : '',
      },
      { emitEvent: false },
    );
    this.lastEmittedFilterJson = JSON.stringify(this.buildFilters());
  }

  /**
   * Validates a date input value and sets errors on the corresponding date range field.
   *
   * @param {Event} event - The input event from the date field.
   * @param {DateRangeField} fieldName - Which date range field to validate.
   */
  protected validate(event: Event, fieldName: DateRangeField): void {
    const input = (event.target as HTMLInputElement).value;
    const control = this.dateRange.get(fieldName);
    if (!control) return;
    CustomValidationService.validateInputString(input, control);
  }

  /**
   * Builds a TrainRunListFilter object from the current form values.
   *
   * @returns {TrainRunListFilter} The current filter state.
   */
  private buildFilters(): TrainRunListFilter {
    const value = this.filterForm.value;
    const beginDate = value.dateRange?.beginDate ? normalizeToAPIDate(value.dateRange.beginDate) : undefined;
    const endDate = value.dateRange?.endDate ? normalizeToAPIDate(value.dateRange.endDate) : undefined;
    const hasDateRange = !!beginDate && !!endDate;

    return {
      searchString: value.searchString || undefined,
      dateRange: hasDateRange ? { beginDate, endDate } : undefined,
      dateRangeType: hasDateRange ? (value.dateRangeType ?? TrainDateTimeEnum.BEGIN_DATE) : undefined,
      state: value.trainState !== undefined && value.trainState !== null ? [value.trainState as number] : [],
      trainSource: value.trainSource !== undefined && value.trainSource !== null ? (value.trainSource as number) : undefined,
      showAllProjects: value.projectList === this.ALL_PROJECTS,
    };
  }

  /**
   * Emits the current filter state if it has changed since the last emission.
   */
  private emitFilterChange(): void {
    const filters = this.buildFilters();
    const json = JSON.stringify(filters);
    if (json === this.lastEmittedFilterJson) return;
    this.lastEmittedFilterJson = json;
    this.filterChange.emit(filters);
  }
}
