import { TranslationsService } from '@Ordering/core/services/translations.service';
import { Component, Inject, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import dayjs, { Dayjs } from 'dayjs';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { DaySet, OrderType, TrainRun, TrainRunListItem, Source } from '@Ordering/api';
import { CancellationType } from '@Ordering/data/custom/enum/cancellation-type.enum';
import { TrainListActions } from '@Ordering/data/custom/enum/train-list-actions.enum';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { MatRadioModule } from '@angular/material/radio';
import { ActionDialogData } from '@Ordering/data/custom/action-dialog-data.interface';
import { ListActionsService } from '@Ordering/shared/services/list-actions.service';
import { FormControl, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { OrderFormComponent, OrderFormData, OrderFormConfig } from '@Ordering/shared/components/order-form/order-form.component';
import { isNonNegativeNumber } from '@Ordering/utils/type-guards/common';
import { SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';
import { TrainDateTimeEnum } from '@Ordering/data/custom/enum/trainDateTime';
import { getDateRangeOfCombinedOperatingDays } from '@Ordering/portalComponents/operating-days/operating-days.util';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { normalizeToAPIDate } from '@Ordering/utils/dates';
import { ScheduleActionService } from '@Ordering/shared/services/schedule-action.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { TextareaComponent } from '@Ordering/shared/components/textarea/textarea.component';
import { TextareaConfig } from '@Ordering/shared/components/textarea/textarea-config.interface';
import { defaultIfEmpty, map } from 'rxjs/operators';
import { isTrainRunWithStops } from '@Ordering/utils/type-guards/data';

export interface CancellationRequest {
  cancellationType: CancellationType;
  singleDayToCancel?: DaySet[];
  cancellationReason?: string;
}

export interface CopyTrainRunRequest {
  subject: string;
  orderType: number;
  newTrainNumber: string;
}

@Component({
  selector: 'app-train-list-actions',
  imports: [SharedMaterialModule, TranslatePipe, MatRadioModule, ReactiveFormsModule, FormsModule, OrderFormComponent, TextareaComponent],
  templateUrl: './train-list-actions.component.html',
  styleUrl: './train-list-actions.component.scss',
})
export class TrainListActionsComponent {
  private filterService = inject(FilterService);
  private listActionsService = inject(ListActionsService);
  private scheduleActionService = inject(ScheduleActionService);
  private configDataService = inject(ConfigDataService);
  private notificationService = inject(NotificationService);
  private trainData: TrainRun | TrainRunListItem | undefined;
  protected tr = inject(TranslationsService);

  // Common properties
  protected currentAction!: TrainListActions;
  protected readonly TrainListActions = TrainListActions;
  protected readonly CancellationType = CancellationType;

  // Cancellation-specific properties
  protected selectedCancellationType: CancellationType = CancellationType.FULL;
  protected selectedCancellationDate: DaySet[] = [];
  protected selectedDate: Date | null = null; // Internal UI state for date picker
  protected runningDays: Date[] = [];
  protected dateError: string | null = null;
  protected isDateValid = true;
  protected trainNumber: string = '';
  protected minDate: Date | null = null;
  protected maxDate: Date | null = null;

  // Copy train run-specific properties
  protected orderFormControl = new FormControl<OrderFormData>({ subject: '', orderType: 0 }, { nonNullable: true });
  protected orderFormConfig: OrderFormConfig = {
    subjectRequired: true,
    orderTypeRequired: true,
    showSubject: true,
    showOrderType: true,
  };
  protected newTrainNumberControl = new FormControl('', [Validators.required, Validators.pattern(/^\d+$/)]);

  // Cancellation reason control
  private _cancellationReasonControl = new FormControl<string>('', { nonNullable: true });

  protected get cancellationReasonControl(): FormControl {
    return this._cancellationReasonControl;
  }

  protected cancellationReasonConfig: TextareaConfig = {
    label: this.tr.translate('lblCancellationReason'),
    placeholder: this.tr.translate('lblEnterCancellationReason'),
  };

  private preservedDateSignal = signal<Date | null>(null);
  private userClearedDate = false; // Track if user manually cleared the date
  private filterStartDate: Dayjs | undefined = undefined;
  private filterEndDate: Dayjs | undefined = undefined;
  private filterDateRangeType: TrainDateTimeEnum | undefined = undefined;

  // Action texts for dialog box
  private actionTexts = {
    [TrainListActions.CANCEL_TRAIN_PATH]: {
      title: this.tr.translate('lblCancelTrainRun'),
      confirm: this.tr.translate('lblCancelTrainRun'),
      abort: this.tr.translate('lblAbortCancellation'),
    },
    [TrainListActions.COPY_TRAIN_RUN]: {
      title: this.tr.translate('lblCopyTrainRun'),
      confirm: this.tr.translate('lblSave'),
      abort: this.tr.translate('lblCancel'),
    },
    [TrainListActions.MODIFY_TRAIN_RUN]: {
      title: this.tr.translate('lblModifyTrainRun'),
      confirm: this.tr.translate('lblSave'),
      abort: this.tr.translate('lblCancel'),
    },
  } as const;

  constructor(
    private dialogRef: MatDialogRef<TrainListActionsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ActionDialogData,
  ) {
    // Set the current action from dialog data
    this.currentAction = data.action as TrainListActions;
    this.trainData = data.trainRunData || data.trainRunListItemData || undefined;
    // Initialize action-specific data
    this.initializeActionData();
  }

  /**
   * Initializes data based on the current action
   */
  private initializeActionData(): void {
    if (this.currentAction === TrainListActions.CANCEL_TRAIN_PATH) {
      this.initializeCancellationData();
    } else if (this.currentAction === TrainListActions.COPY_TRAIN_RUN) {
      this.initializeCopyTrainRunData();
    } else if (this.currentAction === TrainListActions.MODIFY_TRAIN_RUN) {
      this.initializeModifyTrainRunData();
    }
  }

  /**
   * Initializes data for train path cancellation
   */
  private initializeCancellationData(): void {
    this.initializeFilterData();
    this.initializeTrainData();
    this.setMinMaxDates();
    this.checkSameFilterDates();
  }

  /**
   * Initializes filter-related data
   */
  private initializeFilterData(): void {
    const filterState = this.filterService.trainFilterState?.value;
    if (!filterState) {
      return;
    }

    const { beginDate, endDate } = filterState['dateRange'] || {};
    const dateRangeType = filterState['dateRangeType'];

    if (this.hasValidFilterDates(beginDate, endDate, dateRangeType)) {
      this.filterStartDate = dayjs(beginDate);
      this.filterEndDate = dayjs(endDate);
      this.filterDateRangeType = dateRangeType;
    }
  }

  /**
   * Initializes train-specific data
   */
  private initializeTrainData(): void {
    this.runningDays = this.convertToDateArray(this.trainData?.operatingDays || []);
    this.trainNumber = this.trainData?.trainNumber || '';
  }

  /**
   * Validates if filter dates are present and valid
   */
  private hasValidFilterDates(startDate: any, endDate: any, dateRangeType: any): boolean {
    return !!(startDate && endDate && dateRangeType);
  }

  /**
   * Initializes data for copy train run
   */
  private initializeCopyTrainRunData(): void {
    // Set default values for order form control
    const defaultSubject = this.generateSubjectForCopyTrainRun();
    this.orderFormControl.setValue({
      subject: defaultSubject,
      orderType: this.data.orderData?.orderType || 0,
    });
    this.newTrainNumberControl.setValue('');
  }

  /**
   * Initializes data for modify train run
   */
  private initializeModifyTrainRunData(): void {
    const defaultSubject = this.generateSubjectForModifyTrainRun();
    this.orderFormControl.setValue({
      subject: defaultSubject,
      orderType: this.data.orderData?.orderType ?? 0,
    });
  }

  /**
   * Gets the dialog title based on the current action
   * @returns {string} - The dialog title
   */
  protected get dialogTitle(): string {
    return this.actionTexts[this.currentAction]?.title ?? this.tr.translate('lblAction');
  }

  /**
   * Gets the text for the confirm button based on the current action
   * @returns {string} - The confirm button text
   */
  protected get confirmButtonText(): string {
    return this.actionTexts[this.currentAction]?.confirm ?? this.tr.translate('lblConfirm');
  }

  /**
   * Gets the text for the abort button based on the current action
   * @returns {string} - The abort button text
   */
  protected get abortButtonText(): string {
    return this.actionTexts[this.currentAction]?.abort ?? this.tr.translate('lblCancel');
  }

  /**
   * Checks if the dates selected from running date filter are same
   * Then selects single day cancellation radio automatically
   * If not, selects full cancellation radio
   * For railway undertaking users, always defaults to single day cancellation
   * @returns {void}
   */
  private checkSameFilterDates(): void {
    // For railway undertaking users or PATH_COORDINATION_SYSTEM train source, always default to single day cancellation
    if (this.isRunningDateFilterWithValidDates()) {
      this.handleRunningDateFilter();
    } else if (this.shouldHideFullCancellation()) {
      this.selectedCancellationType = CancellationType.SINGLE;
    } else {
      this.selectedCancellationType = CancellationType.FULL;
    }
    this.validateDate();
  }

  /**
   * Checks if filter has valid running dates
   */
  private isRunningDateFilterWithValidDates(): boolean {
    return !!(this.filterStartDate && this.filterEndDate && this.filterDateRangeType === TrainDateTimeEnum.RUNNING_DATE);
  }

  /**
   * Handles logic for running date filters
   */
  private handleRunningDateFilter(): void {
    const isSameDay = this.filterStartDate!.isSame(this.filterEndDate!, 'day');
    this.selectedCancellationType = isSameDay ? CancellationType.SINGLE : CancellationType.FULL;

    if (isSameDay) {
      this.selectedDate = this.filterStartDate!.toDate();
      this.selectedCancellationDate = this.createSingleDayCancellationDaySet(this.selectedDate);
    }
  }

  /**
   * Sets the minimum and maximum dates for the date picker based on operating days
   * @returns {void}
   */
  private setMinMaxDates(): void {
    const operatingDays = this.trainData?.operatingDays;
    if (!operatingDays) {
      return;
    }
    const dateRange = getDateRangeOfCombinedOperatingDays(operatingDays);
    if (dateRange.beginDate && dateRange.endDate) {
      this.minDate = dayjs(dateRange.beginDate).toDate();
      this.maxDate = dayjs(dateRange.endDate).toDate();
    }
  }

  /**
   * Converts DaySet array or Date array to Date array
   * @param {Date[] | DaySet[]} runningDays - The array of running days to convert
   * @returns {Date[]} - The converted array of dates
   */
  private convertToDateArray(runningDays: Date[] | DaySet[]): Date[] {
    if (!runningDays || runningDays.length === 0) {
      return [];
    }

    // Check if it's already a Date array
    if (runningDays[0] instanceof Date) {
      return runningDays as Date[];
    }

    // Convert DaySet array to Date array
    const daySetArray = runningDays as DaySet[];
    const dates: Date[] = [];

    daySetArray.forEach(daySet => {
      if (daySet.beginDate && daySet.daysBitmap) {
        const beginDate = dayjs(daySet.beginDate);
        const bitmap = daySet.daysBitmap;

        for (let i = 0; i < bitmap.length; i++) {
          if (bitmap[i] === '1') {
            const date = beginDate.add(i, 'day').toDate();
            dates.push(date);
          }
        }
      }
    });

    return dates;
  }

  /**
   * To close the dialog and return false.
   * @returns {void}
   */
  protected onCancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Handles cancellation type change
   * @returns {void}
   */
  protected onCancellationTypeChange(): void {
    if (this.selectedCancellationType === CancellationType.SINGLE) {
      this.handleSingleDaySelection();
    } else {
      this.handleFullCancellationSelection();
    }
    this.validateDate();
  }

  /**
   * Handles logic when switching to single day cancellation
   */
  private handleSingleDaySelection(): void {
    const preservedDate = this.preservedDateSignal();

    if (preservedDate) {
      this.restorePreservedDate(preservedDate);
    } else if (this.shouldAutoFillFilterDate()) {
      this.autoFillFromFilterDate();
    } else {
      this.clearSelectedDate();
    }
  }

  /**
   * Handles logic when switching to full cancellation
   */
  private handleFullCancellationSelection(): void {
    this.selectedDate = null;
    this.selectedCancellationDate = [];
    this.dateError = null;
    this.isDateValid = true;
  }

  /**
   * Restores a previously preserved date
   */
  private restorePreservedDate(preservedDate: Date): void {
    this.selectedDate = preservedDate;
    this.selectedCancellationDate = this.createSingleDayCancellationDaySet(preservedDate);
  }

  /**
   * Determines if filter date should be auto-filled
   */
  private shouldAutoFillFilterDate(): boolean {
    return !this.userClearedDate && this.filterDateRangeType === TrainDateTimeEnum.RUNNING_DATE;
  }

  /**
   * Auto-fills date from filter if conditions are met
   */
  private autoFillFromFilterDate(): void {
    if (this.areFilterDatesEqual()) {
      this.selectedDate = this.filterStartDate!.toDate();
      this.selectedCancellationDate = this.createSingleDayCancellationDaySet(this.selectedDate);
    } else {
      this.clearSelectedDate();
    }
  }

  /**
   * Checks if filter start and end dates are equal
   */
  private areFilterDatesEqual(): boolean {
    return !!(this.filterStartDate && this.filterEndDate && this.filterStartDate.isSame(this.filterEndDate, 'day'));
  }

  /**
   * Clears the selected date and related data
   */
  private clearSelectedDate(): void {
    this.selectedDate = null;
    this.selectedCancellationDate = [];
  }

  /**
   * Handles date selection change
   * @returns {void}
   */
  protected onDateChange(): void {
    if (this.selectedDate) {
      // Preserve the newly selected date in the signal
      this.preservedDateSignal.set(this.selectedDate);
      this.userClearedDate = false; // Reset the flag since user selected a date
      // Convert the selected date to DaySet format
      this.selectedCancellationDate = this.createSingleDayCancellationDaySet(this.selectedDate);
    } else {
      // User cleared the date - clear the preserved date as well and mark it as manually cleared
      this.preservedDateSignal.set(null);
      this.userClearedDate = true; // Track that user manually cleared the date
      this.selectedCancellationDate = [];
    }
    this.validateDate();
  }

  /**
   * Validates the selected date or date range against running days
   * @returns {void}
   */
  protected validateDate(): void {
    if (this.selectedCancellationType === CancellationType.FULL) {
      this.isDateValid = true;
      this.dateError = null;
      return;
    }

    // Single day validation
    if (!this.selectedDate) {
      this.isDateValid = false;
      this.dateError = null; // Don't show error until user selects a date
      return;
    }

    if (this.runningDays.length === 0) {
      this.isDateValid = true;
      this.dateError = null;
      return;
    }

    // If runningDays is not empty, only allow dates in runningDays
    const selectedDateStr = normalizeToAPIDate(this.selectedDate);
    const isValidRunningDay = this.runningDays.some(runningDay => normalizeToAPIDate(runningDay) === selectedDateStr);

    // Show error only if user has selected a date and it's not in runningDays
    if (this.selectedDate && !isValidRunningDay) {
      this.isDateValid = false;
      this.dateError = this.tr.translate('msgWrongSelectedDayForTrainCancellation');
    } else {
      this.isDateValid = true;
      this.dateError = null;
    }
  }

  /**
   * Checks if the confirm button should be enabled
   * @returns {boolean}
   */
  protected get isConfirmEnabled(): boolean {
    if (this.currentAction === TrainListActions.CANCEL_TRAIN_PATH) {
      return this.isCancellationConfirmEnabled();
    } else if (this.currentAction === TrainListActions.COPY_TRAIN_RUN) {
      return this.isCopyTrainRunEnabled();
    } else if (this.currentAction === TrainListActions.MODIFY_TRAIN_RUN) {
      return this.isModificationConfirmEnabled();
    }
    return false;
  }

  /**
   * Checks if copy train run confirm is enabled
   * @returns {boolean}
   */
  private isCopyTrainRunEnabled(): boolean {
    const orderFormValue = this.orderFormControl.value;
    const newTrainNumber = this.newTrainNumberControl.value;

    return (
      orderFormValue.subject.trim() !== '' &&
      isNonNegativeNumber(orderFormValue.orderType) &&
      this.newTrainNumberControl.valid &&
      newTrainNumber?.trim() !== ''
    );
  }

  /**
   * Checks if cancellation confirm is enabled
   * @returns {boolean}
   */
  private isCancellationConfirmEnabled(): boolean {
    if (this.selectedCancellationType === CancellationType.FULL) {
      return true;
    }
    return this.isDateValid && this.selectedDate !== null;
  }

  /**
   * Checks if modification confirm is enabled
   * @returns {boolean}
   */
  private isModificationConfirmEnabled(): boolean {
    return this.orderFormControl.valid;
  }

  /**
   * Formats date to YYYY-MM-DD string for comparison
   * Uses Day.js for consistent date formatting
   * @param {Date} date - The date to format
   * @returns {string} - The formatted date string
   */
  private formatDate(date: Date): string {
    return dayjs(date).format('YYYY-MM-DD');
  }

  /**
   * To close the dialog and return the request based on action.
   * @returns {void}
   */
  protected onConfirm(): void {
    if (!this.isConfirmEnabled) {
      return;
    }

    if (this.currentAction === TrainListActions.CANCEL_TRAIN_PATH) {
      this.handleCancellationConfirm();
    } else if (this.currentAction === TrainListActions.COPY_TRAIN_RUN) {
      this.handleCopyTrainRunConfirm();
    } else if (this.currentAction === TrainListActions.MODIFY_TRAIN_RUN) {
      this.handleModifyTrainRunConfirm();
    }
  }

  /**
   * Handles cancellation confirmation
   * @returns {void}
   */
  private handleCancellationConfirm(): void {
    this.cancelTrainRun();
  }

  /**
   * Handles copy train run confirmation
   * @returns {void}
   */
  private handleCopyTrainRunConfirm(): void {
    const orderFormValue = this.orderFormControl.value;
    const request: CopyTrainRunRequest = {
      subject: orderFormValue.subject,
      orderType: orderFormValue.orderType,
      newTrainNumber: this.newTrainNumberControl.value || '',
    };

    this.copyTrainRun(request);
    this.dialogRef.close(request);
  }

  /**
   * Handles modify train run confirmation.
   * If trainRunData is already available (e.g., from train-run component), uses it directly.
   * If only trainRunListItemData is available (e.g., from trains list), fetches the full TrainRun first.
   */
  private handleModifyTrainRunConfirm(): void {
    // If trainRun is already available, use it directly (e.g., from train-run component)
    if (isTrainRunWithStops(this.trainData)) {
      this.executeModifyTrainRun(this.trainData);
      return;
    }

    // Otherwise, fetch from trainRunListItemData (e.g., from trains list)
    const trainRunListItem = this.data.trainRunListItemData;
    if (trainRunListItem) {
      this.scheduleActionService.getTrainRun(trainRunListItem).subscribe({
        next: trainRun => {
          this.executeModifyTrainRun({
            ...trainRun,
            trainId: trainRunListItem.trainId,
            schedVersionId: trainRunListItem.schedVersionId,
          });
        },
        error: () => {
          this.notificationService.pushNotification(this.tr.translate('msgErrorGetTrainRun'), SNACKBARCONFIG_ERROR);
          this.dialogRef.close(false);
        },
      });
    }
  }

  /**
   * Executes the modify train run action with the given TrainRun data.
   * @param trainRun - The train run data to modify
   */
  private executeModifyTrainRun(trainRun: TrainRun): void {
    const dialogData: ActionDialogData = {
      action: TrainListActions.MODIFY_TRAIN_RUN,
      trainRunData: trainRun,
    };
    this.listActionsService.modifyTrainRun(this.orderFormControl.value.subject, this.orderFormControl.value.orderType, dialogData);
    this.dialogRef.close();
  }

  /**
   * Generates the subject for the cancellation of a train run
   * @returns {string}
   */
  private generateSubjectForCancelTrainRun(): string {
    return this.tr.translate('txtPathCancellationFor').replace('{0}', this.trainData?.trainNumber ?? '');
  }

  /**
   * Generates the subject for copying a train run
   * @returns {string}
   */
  private generateSubjectForCopyTrainRun(): string {
    // Use a simple fallback since translation key may not exist
    return `${this.tr.translate('lblcopy')} ${this.trainData?.trainNumber ?? ''}`;
  }

  /**
   * Generates the subject for modifying a train run list item
   * @returns {string}
   */
  private generateSubjectForModifyTrainRun(): string {
    return this.tr.translate('txtPathModificationFor').replace('{0}', this.trainData?.trainNumber ?? '');
  }

  /**
   * Cancels the train run
   * @returns {void}
   */
  private cancelTrainRun(): void {
    const cancellationType = this.selectedCancellationType;
    const subject = this.generateSubjectForCancelTrainRun();
    const trainNumber = this.trainData?.trainNumber || '';
    const cancellationDays = this.getCancellationDays(cancellationType);
    const trainRunCancellation = {
      trainNumber,
      cancellationDays,
      operatingCompany: this.trainData?.operatingCompany || '',
      cancellationReason: this._cancellationReasonControl.value || undefined,
    };

    this.listActionsService
      .cancelTrainRun(subject, OrderType.STP, trainRunCancellation)
      .pipe(
        map(() => true as boolean),
        defaultIfEmpty(false as boolean),
      )
      .subscribe(succeeded => this.dialogRef.close(succeeded));
  }

  /**
   * Copies the train run
   * @param {CopyTrainRunRequest} request - The copy train run request
   * @returns {void}
   */
  private copyTrainRun(request: CopyTrainRunRequest): void {
    if (!this.trainData) {
      return;
    }
    // Convert TrainRun to TrainRunListItem format expected by the service
    // Use unknown as intermediate type for safe conversion
    const trainRunListItem: TrainRunListItem = this.trainData as unknown as TrainRunListItem;

    this.listActionsService.copyTrainRun(trainRunListItem, request.subject, request.orderType, request.newTrainNumber);
  }

  /**
   * Gets the cancellation days based on the selected cancellation type
   * @param {CancellationType | undefined | null} cancellationType - The selected cancellation type
   * @returns {DaySet[]} - The cancellation days
   */
  private getCancellationDays(cancellationType: CancellationType | undefined | null): DaySet[] {
    let cancellationDays: DaySet[] = [];

    if (cancellationType === CancellationType.FULL) {
      cancellationDays = this.trainData?.operatingDays || [];
    } else if (cancellationType === CancellationType.SINGLE) {
      cancellationDays = this.selectedCancellationDate;
    }
    return cancellationDays;
  }

  /**
   * Creates a DaySet for single day cancellation based on the selected date and original operating days
   * @param selectedDate The date to cancel
   * @returns Array containing a single DaySet with the bitmap modified for the selected date
   */
  private createSingleDayCancellationDaySet(selectedDate: Date): DaySet[] {
    const originalOperatingDays = this.trainData?.operatingDays || [];

    if (originalOperatingDays.length === 0) {
      return [];
    }

    // Find the DaySet that contains the selected date
    for (const daySet of originalOperatingDays) {
      const result = this.createDaySetForSelectedDate(daySet, selectedDate);
      if (result) {
        return [result];
      }
    }

    return [];
  }

  /**
   * Helper method to create a DaySet for a specific selected date within a given DaySet
   * @param daySet The original DaySet to check
   * @param selectedDate The date to create the DaySet for
   * @returns DaySet if the date is found, null otherwise
   */
  private createDaySetForSelectedDate(daySet: DaySet, selectedDate: Date): DaySet | null {
    if (!this.isDaySetValid(daySet)) {
      return null;
    }

    const beginDate = dayjs(daySet.beginDate);
    const daysDiff = dayjs(selectedDate).diff(beginDate, 'day');

    if (!this.isDateInDaySetRange(daysDiff, daySet.daysBitmap!)) {
      return null;
    }

    if (!this.isRunningDayInBitmap(daySet.daysBitmap!, daysDiff)) {
      return null;
    }

    return this.buildNewDaySet(daySet, daysDiff);
  }

  /**
   * Validates if a DaySet has required properties
   */
  private isDaySetValid(daySet: DaySet): boolean {
    return !!(daySet.beginDate && daySet.daysBitmap);
  }

  /**
   * Checks if the date difference is within the DaySet range
   */
  private isDateInDaySetRange(daysDiff: number, bitmap: string): boolean {
    return daysDiff >= 0 && daysDiff < bitmap.length;
  }

  /**
   * Checks if the selected date is a running day in the bitmap
   */
  private isRunningDayInBitmap(bitmap: string, daysDiff: number): boolean {
    return bitmap[daysDiff] === '1';
  }

  /**
   * Builds a new DaySet with only the selected date marked as running
   */
  private buildNewDaySet(originalDaySet: DaySet, daysDiff: number): DaySet {
    const newBitmap = originalDaySet
      .daysBitmap!.split('')
      .map((bit, index) => (index === daysDiff ? '1' : '0'))
      .join('');

    return {
      beginDate: originalDaySet.beginDate,
      daysBitmap: newBitmap,
      selectedDays: originalDaySet.selectedDays || [],
      deselectedDays: originalDaySet.deselectedDays || [],
    };
  }

  /**
   * Checks if full cancellation should be hidden (single day only)
   * @returns {boolean}
   */
  protected shouldHideFullCancellation(): boolean {
    return this.configDataService.isRailwayUndertakingUser() && this.trainData?.trainSource === Source.PATH_COORDINATION_SYSTEM;
  }
}
