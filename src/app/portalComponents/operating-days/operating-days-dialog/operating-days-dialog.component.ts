import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { Component, Inject, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntil, Subject } from 'rxjs';
import dayjs from 'dayjs';

import { DaySet, OrderItemAction, PresavedODTTemplate } from '@Ordering/api';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { DayOption, OperatingDaysDialogData, CalendarDisplayData } from '@Ordering/portalComponents/operating-days/operating-days.model';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import {
  CustomDateRangePickerComponent,
  DateRangeValue,
} from '@Ordering/shared/components/custom-date-range-picker/custom-date-range-picker.component';
import { OperatingDaysCalendarComponent } from '@Ordering/portalComponents/operating-days/operating-days-calendar/operating-days-calendar.component';
import { cloneDeep } from '@Ordering/utils/clone-deep';
import { DialogAction } from '@Ordering/data/custom/enum/dialog-action.enum';
import {
  sortDayNumbersByEnumOrder,
  isValidDateRange,
  getDateRangeOfCombinedOperatingDays,
  arraysEqual,
} from '@Ordering/portalComponents/operating-days/operating-days.util';
import { EnumNameList } from '@Ordering/data/custom/enum-name-list';
import { PresavedTemplateDialogComponent } from '@Ordering/portalComponents/operating-days/presaved-template/presaved-template-dialog/presaved-template-dialog.component';
import { SaveTemplateDialogComponent } from '@Ordering/portalComponents/operating-days/save-template/save-template-dialog/save-template-dialog.component';
import {
  BitmapData,
  DaysSelectionsData,
  OperatingDaysCalculationService,
  StrictDateRange,
} from '@Ordering/portalComponents/operating-days/operating-days-calculation.service';
import { TranslatableEnumPipe } from '@Ordering/core/pipes/translatable-enum.pipe';
import { DateTimeFormat } from '@Ordering/utils/dates';
import { CustomDateRangePickerConfig } from '@Ordering/shared/components/custom-date-range-picker/custom-date-range-picker-config.interface';

export const ValidationErrors = {
  INVALID_DATE_INPUT: 'invalidDateInput',
  START_AFTER_END: 'startAfterEnd',
  DATE_RANGE_INVALID: 'dateRangeInvalid',
} as const;

@Component({
  selector: 'app-operating-days-dialog',
  standalone: true,
  imports: [
    CommonModule,
    SharedMaterialModule,
    ReactiveFormsModule,
    TranslatePipe,
    CustomDateRangePickerComponent,
    OperatingDaysCalendarComponent,
    TranslatableEnumPipe,
  ],
  templateUrl: './operating-days-dialog.component.html',
  styleUrl: './operating-days-dialog.component.scss',
})
export class OperatingDaysDialogComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  protected tr = inject(TranslationsService);
  private readonly dialog = inject(MatDialog);
  protected operatingDaysCalculationService = inject(OperatingDaysCalculationService);

  protected dayOptions: DayOption[] = DayOption.getDayOptions();
  protected isEditMode: boolean = false;
  protected EnumNameList = EnumNameList;

  protected dateRangePickerConfig: CustomDateRangePickerConfig = {
    minDate: new Date(2000, 0, 1),
    maxDate: new Date(2049, 11, 31),
    fullWidth: true,
  };

  // Signals for state management
  protected readonly daysBitmap = signal<string>('');
  protected readonly bitmapStartDate = signal<string>('');
  protected readonly formValues = signal<any>({});
  protected readonly parentOperatingDays = signal<DaySet[]>([]);
  protected readonly isPresavedTemplateSelected = signal<boolean>(false);
  private readonly dialogReferenceData = signal<OperatingDaysDialogData>({} as OperatingDaysDialogData);

  protected readonly DateTimeFormat = DateTimeFormat;

  /** Converts a Date to an ISO date string (YYYY-MM-DD), or returns the fallback. */
  private toDateString(date: Date | undefined, fallback = ''): string {
    return date ? dayjs(date).format(DateTimeFormat.API_DATE_FORMAT) : fallback;
  }

  /**
   * A computed property that returns the combined bitmap string for parent operating days.
   *
   * When parent operating days are available, it combines them using the calculation service
   * and returns the resulting days bitmap. If no parent operating days exist, it falls back
   * to the parent bitmap signal value.
   *
   * @returns {string} The combined bitmap string representing operating days, or the fallback parent bitmap
   */
  protected readonly combinedParentBitmap = computed<string>(() => {
    if (this.parentOperatingDays().length > 0) {
      const combinedData = this.operatingDaysCalculationService.combineOperatingDays(this.parentOperatingDays());
      return combinedData.daysBitmap;
    }
    return '';
  });

  /**
   * Computed property that returns the combined start date for parent operating days.
   *
   * If parent operating days exist, it calculates and returns the begin date from the
   * combined date range of all parent operating days. Otherwise, it falls back to
   * the parent start date.
   *
   * @returns {string} The combined start date as a string, or the parent start date if no
   *          parent operating days are available
   */
  protected readonly combinedParentStartDate = computed<string>(() => {
    if (this.parentOperatingDays().length > 0) {
      const combinedData = getDateRangeOfCombinedOperatingDays(this.parentOperatingDays());
      return combinedData.beginDate;
    }
    return '';
  });

  /**
   * A computed signal that determines whether both begin and end dates are selected in the date range.
   *
   * @returns {boolean} `true` if both `beginDate` and `endDate` are truthy values in the form's range object,
   * `false` otherwise
   */
  protected readonly isDateRangeSelectedSig = computed(() => {
    const formValues = this.formValues();
    return !!formValues.dateRange?.beginDate && !!formValues.dateRange?.endDate;
  });

  /**
   * A computed signal that determines if the date range selection is out of bounds.
   *
   * Checks if either begin or end date falls outside the allowed MIN_DATE/MAX_DATE range.
   *
   * @returns {boolean} True if any date in the range exceeds the minimum or maximum allowed bounds
   */
  protected readonly rangeOutOfBoundsSig = computed(() => {
    const formValues = this.formValues();
    const beginDate = formValues.dateRange?.beginDate;
    const endDate = formValues.dateRange?.endDate;
    if (!beginDate || !endDate) return false;
    const begin = dayjs(beginDate);
    const end = dayjs(endDate);
    const min = dayjs(this.dateRangePickerConfig.minDate);
    const max = dayjs(this.dateRangePickerConfig.maxDate);
    return begin.isBefore(min) || begin.isAfter(max) || end.isBefore(min) || end.isAfter(max);
  });

  /**
   * A computed signal that determines if the start date is before the end date in the date range.
   *
   * @returns {boolean} True if the start date is before the end date, false otherwise
   */
  protected readonly isStartBeforeEndSig = computed(() => {
    const formValues = this.formValues();
    const beginDate = formValues.dateRange?.beginDate;
    const endDate = formValues.dateRange?.endDate;
    if (!beginDate || !endDate) return true;
    return dayjs(beginDate).isBefore(dayjs(endDate)) || dayjs(beginDate).isSame(dayjs(endDate));
  });

  /**
   * A computed signal that determines whether the current date range selection is valid.
   *
   * @returns {boolean} True if the begin date and end date form a valid date range, false otherwise.
   *
   * @remarks
   * This signal automatically recomputes whenever the form values change, specifically
   * when the range's beginDate or endDate properties are modified.
   */
  protected readonly isValidDateRangeSig = computed(() => {
    const formValues = this.formValues();
    return isValidDateRange(this.toDateString(formValues.dateRange?.beginDate), this.toDateString(formValues.dateRange?.endDate));
  });

  /**
   * Signal that determines whether the user can toggle selection in the operating days dialog.
   *
   * @returns {boolean} True if all of the following conditions are met:
   * - A date range is selected
   * - The selected date range is valid
   * - The date range is not out of bounds
   * - The component is in edit mode
   *
   * @readonly
   */
  private readonly canGenerateBitmap = computed(() => {
    return this.isDateRangeSelectedSig() && this.isValidDateRangeSig() && !this.rangeOutOfBoundsSig() && this.isEditMode;
  });

  /**
   * Computed property that returns the appropriate bitmap for the current state.
   *
   * For existing entries (UPDATE/VIEW mode), it uses the original bitmap unless the form
   * has been modified. For new entries (ADD mode) or when form values change, it generates
   * a new bitmap based on the current form selections. When no days are selected but a
   * valid date range exists, it generates an empty bitmap to allow calendar display.
   *
   * @returns {string} The bitmap string representing operating days, either original or newly generated
   *
   * @remarks
   * - Uses original bitmap for existing entries when form hasn't changed significantly
   * - Generates new bitmap when form values change or for new entries
   * - Generates empty bitmap (all zeros) when date range is valid but no days selected
   * - Takes holidays into account when generating new bitmaps
   */
  protected readonly generatedBitmap = computed(() => {
    const formValues = this.formValues();
    const beginDate = formValues.dateRange?.beginDate;
    const endDate = formValues.dateRange?.endDate;
    const selectedDays = formValues.selectedDays;
    const deselectedDays = formValues.deselectedDays;

    // For existing entries, return original bitmap if form hasn't changed
    // This allows the calendar to be displayed and calculated without regenerating bitmap
    if (!this.hasFormChanged(formValues)) return this.daysBitmap();

    // Return empty string if bitmap cannot be generated
    // This includes cases where date range is incomplete/invalid, out of bounds, or not in edit mode
    // Calendar will not be shown in this case
    if (!this.canGenerateBitmap()) {
      return '';
    }

    // Generate bitmap even if no days are selected (will result in all zeros)
    // This allows the calendar to be displayed
    const daysSelectionsData: DaysSelectionsData = {
      selectedDays: selectedDays || [],
      deselectedDays: deselectedDays || [],
    };

    return this.operatingDaysCalculationService.generateBitmap(beginDate, endDate, daysSelectionsData);
  });

  /**
   * Determines if the form has been modified from its original state.
   * Only applies to UPDATE and VIEW dialog actions.
   *
   * @param {any} formValues - The current form values to compare against the original state
   * @returns {boolean} True if either the date or selection has changed, false otherwise
   * @private
   */
  private hasFormChanged(formValues: any): boolean {
    if (this.dialogReferenceData().action === DialogAction.ADD) {
      return true;
    }

    const hasDateChanged = this.hasDateChanged(formValues);
    const hasSelectionChanged = this.hasSelectionChanged(formValues);

    return hasDateChanged || hasSelectionChanged;
  }

  /**
   * Checks if the date range in the form has changed compared to the original data.
   *
   * @param {any} formValues - The form values object containing the date range
   * @returns {boolean} True if either the begin date or end date has changed, false otherwise
   */
  private hasDateChanged(formValues: any): boolean {
    const originalData = this.dialogReferenceData();
    return (
      this.toDateString(formValues.dateRange?.beginDate) !== originalData.beginDate ||
      this.toDateString(formValues.dateRange?.endDate) !== originalData.endDate
    );
  }

  /**
   * Determines if the user's selection of days has changed from the original data.
   *
   * @param {any} formValues - The current form values containing selectedDays and deselectedDays arrays
   * @returns {boolean} True if either the selectedDays or deselectedDays arrays have changed from the original dialog data, false otherwise
   */
  private hasSelectionChanged(formValues: any): boolean {
    const originalData = this.dialogReferenceData();
    return (
      !arraysEqual(formValues.selectedDays || [], originalData.selectedDays || []) ||
      !arraysEqual(formValues.deselectedDays || [], originalData.deselectedDays || [])
    );
  }

  /**
   * Computed signal that checks if the generated bitmap contains only zeros.
   *
   * @returns {boolean} True if the bitmap is empty or contains only '0' characters, false otherwise
   */
  protected readonly isBitmapEmpty = computed(() => {
    const bitmap = this.generatedBitmap();
    return !bitmap || bitmap.length === 0 || !bitmap.includes('1');
  });

  /**
   * Computed property that determines whether the operating days form can be saved.
   *
   * The validation logic differs based on the context:
   * - For presaved templates: Requires basic form validation (date range) and subset validation only
   * - For regular mode: Requires all validations including day selection and bitmap data
   *
   * Presaved templates are a special case used when combined operating days serve as templates.
   * Combined operating days do not have selected days, hence the relaxed validation requirements.
   * @returns {boolean} True if the form meets all required validation criteria for saving, false otherwise
   *
   */
  protected readonly canSave = computed(() => {
    const formValues = this.formValues();
    if (
      this.dialogReferenceData().action !== DialogAction.ADD &&
      !this.hasFormChanged(formValues) &&
      !this.operatingDaysCalculationService.isSubsetModeSig()
    ) {
      return true;
    }

    // Basic form validation (always required)
    const isBasicFormValid = this.isDateRangeSelectedSig() && this.isValidDateRangeSig();

    // In regular mode, require day selection and bitmap data as well
    const isSubsetValid = this.isSubsetModeValidSig();
    const hasBitmapData = !this.isBitmapEmpty();
    const hasValidDaySelection = formValues.selectedDays && formValues.selectedDays.length > 0;

    // For presaved templates, only require basic form validation and subset validation
    // This is special case only used when combined operating days are used as a template. Combined operating days do not have selected days
    if (this.isPresavedTemplateSelected() && this.hasFormChanged(formValues)) {
      return isBasicFormValid && isSubsetValid && hasBitmapData;
    }

    return this.form.valid && isBasicFormValid && isSubsetValid && hasBitmapData && hasValidDaySelection;
  });

  /**
   * Computed signal for disabled selection state
   */
  protected readonly isDisabledInSelectionSig = computed(() => {
    const formValues = this.formValues();
    return (dayIndex: number) => formValues.deselectedDays?.includes(dayIndex) || false;
  });

  /**
   * Computed signal for disabled deselection state
   */
  protected readonly isDisabledInDeselectionSig = computed(() => {
    const formValues = this.formValues();
    return (dayIndex: number) => formValues.selectedDays?.includes(dayIndex) || false;
  });

  /**
   * Computed property that generates calendar display data for the operating days dialog.
   *
   * This property validates the form state and only generates calendar data when
   * the basic date range criteria are met. In normal mode, it displays the calendar
   * even when no days are selected. Returns empty calendar data when validation fails
   * to prevent unnecessary computations.
   *
   * @returns {CalendarDisplayData} The computed calendar display data containing
   * all necessary information for rendering the operating days calendar view,
   * or empty data structure when form is invalid
   */
  protected readonly calendarDisplayData = computed<CalendarDisplayData>(() => {
    // Early return with empty data if basic form validation fails
    if (!this.isDateRangeSelectedSig() || !this.isValidDateRangeSig() || this.rangeOutOfBoundsSig()) {
      return { months: [], allDaysNames: DayOption.getAllDaysNames() };
    }

    const formValues = this.formValues();
    const parentBitmapData: BitmapData = {
      bitmap: this.combinedParentBitmap(),
      bitmapStartDate: dayjs(this.combinedParentStartDate()),
    };
    const generatedBitmap: BitmapData = {
      bitmap: this.generatedBitmap(),
      bitmapStartDate: dayjs(this.bitmapStartDate()),
    };

    const formRange: StrictDateRange = {
      start: dayjs(formValues.dateRange.beginDate),
      end: dayjs(formValues.dateRange.endDate),
    };
    return this.operatingDaysCalculationService.generateCalendarDisplayData(formRange, generatedBitmap, parentBitmapData);
  });

  /**
   * Computed signal for subset mode validation
   */
  protected readonly isSubsetModeValidSig = computed(() => {
    if (!this.operatingDaysCalculationService.isSubsetModeSig()) {
      return true;
    }
    if (this.dialogData.contentType === OrderItemAction.REPLACEMENT) {
      return true;
    }
    return this.isNewBitmapSubsetOfSaved();
  });

  protected form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<OperatingDaysDialogComponent>,
    @Inject(MAT_DIALOG_DATA) protected dialogData: OperatingDaysDialogData,
  ) {
    this.dialogReferenceData.set(cloneDeep(dialogData));
    const clonedData = cloneDeep(dialogData);
    // Set edit mode based on dialog action
    this.isEditMode = this.dialogReferenceData().action !== DialogAction.VIEW;
    this.dateRangePickerConfig.isReadonly = !this.isEditMode;

    // Create a deep copy of dialogData to avoid modifying the original data
    this.operatingDaysCalculationService.isSubsetModeSig.set(clonedData.isSubsetMode || false);
    // Store original operating days for combined validation
    this.parentOperatingDays.set(clonedData.parentOperatingDays || []);

    this.daysBitmap.set(clonedData.daysBitmap || '');
    this.bitmapStartDate.set(clonedData.beginDate || '');

    this.form = new FormGroup({
      dateRange: new FormControl<DateRangeValue>({
        value: {
          beginDate: clonedData.beginDate ? new Date(clonedData.beginDate) : undefined,
          endDate: clonedData.endDate ? new Date(clonedData.endDate) : undefined,
        },
        disabled: false,
      }),
      selectedDays: new FormControl<number[]>(
        {
          value: clonedData.selectedDays || [],
          disabled: false,
        },
        Validators.required,
      ),
      deselectedDays: new FormControl<number[]>({
        value: clonedData.deselectedDays || [],
        disabled: false,
      }),
    });
  }

  /**
   * Helper method to check if selection is disabled for a specific day
   */
  protected readonly isSelectionDisabledSig = computed(() => {
    return (dayIndex: number) => this.isDisabledInSelectionSig()(dayIndex) || !this.canGenerateBitmap();
  });

  /**
   * Helper method to check if deselection is disabled for a specific day
   */
  protected readonly isDeselectionDisabledSig = computed(() => {
    return (dayIndex: number) => this.isDisabledInDeselectionSig()(dayIndex) || !this.canGenerateBitmap();
  });

  // Public methods for testing compatibility
  public isDisabledInSelection(dayIndex: number): boolean {
    return this.isDisabledInSelectionSig()(dayIndex);
  }

  public isDisabledInDeselection(dayIndex: number): boolean {
    return this.isDisabledInDeselectionSig()(dayIndex);
  }

  public isDateRangeSelected(): boolean {
    return this.isDateRangeSelectedSig();
  }

  public isValidSubset(): boolean {
    return this.isNewBitmapSubsetOfSaved();
  }

  public get dialogTitle(): string {
    if (this.dialogReferenceData().message) {
      return this.dialogReferenceData().message || '';
    }
    switch (this.dialogReferenceData().action) {
      case DialogAction.ADD:
        return this.tr.translate('lblAddOperatingDays');
      case DialogAction.UPDATE:
        return this.tr.translate('lblUpdateOperatingDays');
      case DialogAction.VIEW:
        return this.tr.translate('lblViewOperatingDays');
      default:
        return '';
    }
  }

  public get actionName(): string {
    switch (this.dialogReferenceData().action) {
      case DialogAction.ADD:
        return this.tr.translate('lblApply');
      case DialogAction.UPDATE:
        return this.tr.translate('lblApply');
      default:
        return '';
    }
  }

  ngOnInit(): void {
    // Initialize form values signal
    this.formValues.set(this.form.value);
    this.form.valueChanges.subscribe(() => {
      this.formValues.set(this.form.value);
      this.bitmapStartDate.set(this.toDateString(this.form.value.dateRange?.beginDate));
    });
  }

  /**
   * Validates whether the newly generated bitmap is a subset of the saved parent bitmap.
   *
   * This method checks if the current form's generated bitmap and date range are valid
   * subsets of the combined parent bitmap and start date. It performs validation by
   * comparing the new bitmap against the parent bitmap using the calculation service.
   *
   * @returns {boolean} True if the new bitmap is a valid subset of the parent bitmap,
   *                   true if parent data is missing (allowing the operation),
   *                   false if new data is missing or validation fails
   *
   * @private
   */
  private isNewBitmapSubsetOfSaved(): boolean {
    const parentBitmap = this.combinedParentBitmap();
    const parentStartDate = this.combinedParentStartDate();

    if (!parentBitmap || !parentStartDate) {
      return true;
    }

    const newBitmap = this.generatedBitmap();
    const newStartDate = this.toDateString(this.form.value.dateRange.beginDate);

    if (!newBitmap || !newStartDate) {
      return false;
    }

    const validationResult = this.operatingDaysCalculationService.validateBitmapSubset(
      newBitmap,
      newStartDate,
      parentBitmap,
      parentStartDate,
    );

    return validationResult.isValid;
  }

  /**
   * Toggles the selection state of a given day
   */
  protected toggleSelection(day: number, isDeselection: boolean = false): void {
    if (!this.form.value.selectedDays || !this.form.value.deselectedDays) {
      return;
    }

    if (isDeselection) {
      this.updateDaysForDeselection(day, this.form.value.selectedDays, this.form.value.deselectedDays);
    } else {
      this.updateDaysForSelection(day, this.form.value.selectedDays, this.form.value.deselectedDays);
    }
  }

  /**
   * Updates days for deselection
   */
  private updateDaysForDeselection(day: number, selectedDays: number[], deselectedDays: number[]): void {
    if (deselectedDays.includes(day)) {
      deselectedDays = deselectedDays.filter(d => d !== day);
    } else {
      deselectedDays.push(day);
      selectedDays = selectedDays.filter(d => d !== day);
    }

    this.form.patchValue({ selectedDays, deselectedDays });
  }

  /**
   * Updates days for selection
   */
  private updateDaysForSelection(day: number, selectedDays: number[], deselectedDays: number[]): void {
    if (selectedDays.includes(day)) {
      selectedDays = selectedDays.filter(d => d !== day);
    } else {
      selectedDays.push(day);
      deselectedDays = deselectedDays.filter(d => d !== day);
    }

    this.form.patchValue({ selectedDays, deselectedDays });
  }

  /**
   * Clears all operating days data by resetting the form to its initial state
   */
  protected clearOperatingDays(): void {
    this.form.patchValue({
      dateRange: { beginDate: undefined, endDate: undefined },
      selectedDays: [],
      deselectedDays: [],
    });
    this.bitmapStartDate.set('');
  }

  /**
   * Saves the current form data and closes the dialog
   */
  protected saveAndClose(): void {
    const daySet: DaySet = {
      beginDate: this.toDateString(this.form.value.dateRange?.beginDate, this.toDateString(new Date())),
      daysBitmap: this.generatedBitmap(),
      selectedDays: sortDayNumbersByEnumOrder(this.form.value.selectedDays),
      deselectedDays: sortDayNumbersByEnumOrder(this.form.value.deselectedDays),
    };
    this.dialogRef.close(daySet);
  }

  /**
   * Creates a PresavedODTTemplate object from the current form data.
   *
   * @returns {PresavedODTTemplate} The template object constructed from current form values
   */
  private createTemplateFromForm(): PresavedODTTemplate {
    return {
      name: '', // Will be set by the dialog
      description: '', // Will be set by the dialog
      endDate: this.toDateString(this.form.value.dateRange.endDate),
      operatingDays: {
        beginDate: this.toDateString(this.form.value.dateRange.beginDate),
        daysBitmap: this.generatedBitmap(),
        selectedDays: sortDayNumbersByEnumOrder(this.form.value.selectedDays || []),
        deselectedDays: sortDayNumbersByEnumOrder(this.form.value.deselectedDays || []),
      },
    };
  }

  /**
   * Opens the save template dialog and handles the result.
   *
   * @param {PresavedODTTemplate} template - The template object to pass to the dialog
   */
  protected saveOperatingDaysTemplate(): void {
    if (!this.canSave()) {
      return;
    }

    const template = this.createTemplateFromForm();
    const dialogRef = this.dialog.open(SaveTemplateDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { template: template },
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe();
  }

  /**
   * Replaces the current form data with values from a presaved operating days template.
   * Updates both the reactive form controls and internal signals with the template's
   * operating days configuration.
   *
   * @param {PresavedODTTemplate} template - The presaved operating days template containing the configuration
   *                   to apply to the form, including date range, selected/deselected days,
   *                   and bitmap representation
   * @returns {void}
   */
  private replaceFormDataWithTemplate(template: PresavedODTTemplate): void {
    const operatingDays = template.operatingDays;

    this.updateFormWithTemplateData(operatingDays, template.endDate);
    this.updateSignalsWithTemplateData(operatingDays, template);
  }

  /**
   * Updates the form controls with template data.
   *
   * @param {DaySet} operatingDays - The operating days data from the template
   * @param {string} endDate - The end date from the template
   * @returns {void}
   */
  private updateFormWithTemplateData(operatingDays: DaySet, endDate: string): void {
    const beginDateValue = operatingDays.beginDate ? new Date(operatingDays.beginDate) : undefined;
    const endDateValue = endDate ? new Date(endDate) : undefined;
    this.form.patchValue({
      dateRange: { beginDate: beginDateValue, endDate: endDateValue },
      selectedDays: operatingDays.selectedDays || [],
      deselectedDays: operatingDays.deselectedDays || [],
    });
  }

  /**
   * Updates the signals with template data.
   *
   * @param {DaySet} operatingDays - The operating days data from the template
   * @param {PresavedODTTemplate} template - The complete template object
   * @returns {void}
   */
  private updateSignalsWithTemplateData(operatingDays: DaySet, template: PresavedODTTemplate): void {
    const dialogReferenceData = this.createDialogReferenceData(operatingDays, template);
    this.dialogReferenceData.set(cloneDeep(dialogReferenceData));
    this.isPresavedTemplateSelected.set(true);
    this.daysBitmap.set(operatingDays.daysBitmap || '');
    this.bitmapStartDate.set(operatingDays.beginDate || '');
  }

  /**
   * Creates the dialog reference data object from template data.
   *
   * @param {DaySet} operatingDays - The operating days data from the template
   * @param {PresavedODTTemplate} template - The complete template object
   * @returns {OperatingDaysDialogData} The constructed dialog reference data
   */
  private createDialogReferenceData(operatingDays: DaySet, template: PresavedODTTemplate): OperatingDaysDialogData {
    return {
      id: this.dialogReferenceData().id,
      message: this.dialogReferenceData().message,
      action: DialogAction.UPDATE,
      daysBitmap: operatingDays.daysBitmap || '',
      beginDate: operatingDays.beginDate || '',
      endDate: template.endDate || '',
      selectedDays: operatingDays.selectedDays || [],
      deselectedDays: operatingDays.deselectedDays || [],
      isSubsetMode: this.dialogReferenceData().isSubsetMode || false,
      parentOperatingDays: this.dialogReferenceData().parentOperatingDays || [],
    };
  }

  /**
   * Opens a dialog to load presaved operating days templates.
   *
   * When a template is selected from the dialog, it replaces the current form data
   * with the selected template's data through the replaceFormDataWithTemplate method.
   *
   * The dialog is configured with:
   * - Width: 1000px (max 90vw)
   * - Height: 80vh
   *
   * @returns {void}
   */
  protected loadPresavedOperatingDays(): void {
    const dialogRef = this.dialog.open(PresavedTemplateDialogComponent, {
      width: '1000px',
      maxWidth: '90vw',
      height: '80vh',
    });

    dialogRef.afterClosed().subscribe((selectedTemplate: PresavedODTTemplate | null) => {
      if (selectedTemplate) {
        // Replace existing form data with selected template data
        this.replaceFormDataWithTemplate(cloneDeep(selectedTemplate));
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
