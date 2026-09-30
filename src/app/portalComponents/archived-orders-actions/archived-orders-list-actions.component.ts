import { Component, inject, signal, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { defaultIfEmpty, map } from 'rxjs/operators';
import { DaySet, OrderType } from '@Ordering/api';

import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { DayNumbersToNamesPipe } from '@Ordering/core/pipes/day-numbers-to-names.pipe';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { ListActionsService } from '@Ordering/shared/services/list-actions.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ArchivedOrderActions } from '@Ordering/data/custom/enum/archived-order-actions.enum';
import { OrderFormComponent, OrderFormData, OrderFormConfig } from '@Ordering/shared/components/order-form';
import { OperatingDaysDialogComponent } from '@Ordering/portalComponents/operating-days/operating-days-dialog/operating-days-dialog.component';
import { DialogAction } from '@Ordering/data/custom/enum/dialog-action.enum';
import { OperatingDaysDialogData } from '@Ordering/portalComponents/operating-days/operating-days.model';
import { ActionDialogData } from '@Ordering/data/custom/action-dialog-data.interface';
import { getDateRangeOfCombinedOperatingDays } from '@Ordering/portalComponents/operating-days/operating-days.util';
import { CancellationType } from '@Ordering/data/custom/enum/cancellation-type.enum';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { TextareaComponent } from '@Ordering/shared/components/textarea/textarea.component';
import { TextareaConfig } from '@Ordering/shared/components/textarea/textarea-config.interface';

@Component({
  selector: 'app-archived-orders-list-actions',
  imports: [
    TranslatePipe,
    DayNumbersToNamesPipe,
    SharedMaterialModule,
    ReactiveFormsModule,
    MatRadioModule,
    OrderFormComponent,
    TextareaComponent,
  ],
  templateUrl: './archived-orders-list-actions.component.html',
  styleUrl: './archived-orders-list-actions.component.scss',
})
export class ArchivedOrdersListActionsComponent {
  private readonly dialog = inject(MatDialog);
  readonly dialogRef = inject(MatDialogRef<ArchivedOrdersListActionsComponent>);
  protected ArchivedOrderActions = ArchivedOrderActions;
  protected CancellationType = CancellationType;
  protected readonly data: ActionDialogData = inject(MAT_DIALOG_DATA);
  protected readonly tr: TranslationsService = inject(TranslationsService);
  readonly notificationService = inject(NotificationService);
  // Form for cancellation process
  protected cancellationForm = new FormGroup({
    cancellationType: new FormControl<CancellationType | undefined>(undefined),
  });

  // Using Control Value Accessor approach with reactive forms
  protected orderForm = new FormGroup({
    orderData: new FormControl<OrderFormData>({ subject: '', orderType: 0 }),
  });

  protected orderFormConfig: OrderFormConfig = {
    subjectRequired: true,
    orderTypeRequired: true,
    showSubject: true,
    showOrderType: true,
  };

  // Signal to track form validity
  protected formValid = signal(false);

  // Properties for operating days selection
  protected selectedOperatingDays: DaySet[] = [];

  // Signal to trigger recomputation when cancellationForm changes
  protected cancellationFormChanged = signal(0);

  // Cancellation reason control
  private _cancellationReasonControl = new FormControl<string>('', { nonNullable: true });

  protected get cancellationReasonControl(): FormControl {
    return this._cancellationReasonControl;
  }

  protected cancellationReasonConfig: TextareaConfig = {
    label: this.tr.translate('lblCancellationReason'),
    placeholder: this.tr.translate('lblEnterCancellationReason'),
  };

  protected isSaveDisabled = computed(() => {
    switch (this.data.action) {
      case ArchivedOrderActions.MODIFY_TRAIN_RUN:
        return !this.formValid(); // Use the reactive signal
      case ArchivedOrderActions.CANCEL_TRAIN_RUN:
        return this.isCancelDisabled(); // Use the reactive signal
      default:
        return true;
    }
  });

  protected isCancelDisabled = computed(() => {
    this.cancellationFormChanged();
    const cancellationType = this.cancellationForm.get('cancellationType')?.value;

    if (cancellationType === CancellationType.FULL) {
      // Check if there are operating days available for full cancellation
      const fullCancellationDays = this.data.trainRunData?.operatingDays || [];
      return fullCancellationDays.length === 0;
    }

    if (cancellationType === CancellationType.PARTIAL) {
      return this.selectedOperatingDays.length === 0; // Partial cancellation requires selected days
    }

    return true;
  });

  constructor(private listActionsService: ListActionsService) {
    this.initializeFormData();
    this.setupFormValidation();

    // Subscribe to cancellationForm changes to trigger signal
    this.cancellationForm.valueChanges.subscribe(() => {
      this.cancellationFormChanged.set(this.cancellationFormChanged() + 1);
    });
  }

  /**
   * Initializes the form data based on the current action type.
   *
   * If the action is MODIFY_TRAIN_RUN, sets the form data with a generated subject
   * for modify train run operations and the default order type from the provided data.
   *
   * @returns {void}
   */
  private initializeFormData(): void {
    if (this.data && this.data.action === ArchivedOrderActions.MODIFY_TRAIN_RUN) {
      this.orderForm.patchValue({
        orderData: {
          subject: this.generateSubjectForModifyTrainRun(),
          orderType: this.data.orderData?.orderType ?? OrderType.STP,
        },
      });
    }
  }

  /**
   * Sets up form validation by subscribing to form changes and updating the formValid signal.
   * This ensures the save button is properly disabled when the form is invalid.
   *
   * @returns {void}
   */
  private setupFormValidation(): void {
    // Initial validation check
    this.updateFormValidation();

    // Subscribe to form changes to update validation state
    this.orderForm.valueChanges.subscribe(() => {
      this.updateFormValidation();
    });
  }

  /**
   * Generates a localized subject line for train run cancellation emails.
   *
   * @returns {string} A formatted string containing the cancellation subject with the order's subject
   *          inserted into the translation template. If no order subject exists, an empty
   *          string is used as fallback.
   */
  private generateSubjectForCancelTrainRun(): string {
    return this.tr.translate('txtPathCancellationFor').replace('{0}', this.data.orderData?.subject ?? '');
  }

  /**
   * Updates the form validation state based on the current form values.
   * Checks if the subject is not empty and orderType is valid.
   *
   * @returns {void}
   */
  private updateFormValidation(): void {
    const orderData = this.orderForm.get('orderData')?.value;
    const hasValidSubject = orderData?.subject?.trim() !== '';
    const hasValidOrderType = orderData?.orderType !== null && orderData?.orderType !== undefined;
    this.formValid.set(hasValidSubject && hasValidOrderType);
  }

  /**
   * Generates a localized subject string for train run modification.
   *
   * @returns {string} A translated subject string with the order data subject interpolated,
   *          or empty string if no subject is available
   * @private
   */
  private generateSubjectForModifyTrainRun(): string {
    return this.tr.translate('txtPathModificationFor').replace('{0}', this.data.orderData?.subject ?? '');
  }

  /**
   * Handles the save operation by executing the appropriate action based on the current data action type.
   * Currently supports modifying train runs and cancelling train runs, with logging for unknown actions.
   *
   * @returns {void}
   */
  protected handleSave(): void {
    switch (this.data.action) {
      case ArchivedOrderActions.CANCEL_TRAIN_RUN:
        this.cancelTrainRun();
        break;
      case ArchivedOrderActions.MODIFY_TRAIN_RUN:
        this.modifyTrainRun();
        break;
      default:
        console.warn('Unknown action:', this.data.action);
    }
  }

  /**
   * Handles the train run cancellation process based on the selected cancellation type.
   *
   * For full cancellation: cancels the entire train run
   * For partial cancellation: cancels the train run for the selected operating days
   *
   * @returns {void}
   */
  protected cancelTrainRun(): void {
    const cancellationType = this.cancellationForm.get('cancellationType')?.value;
    const subject = this.generateSubjectForCancelTrainRun();
    const trainNumber = this.data.trainRunData?.trainNumber || '';
    const cancellationDays = this.getCancellationDays(cancellationType);
    const operatingCompany = this.data.trainRunData?.operatingCompany || '';

    this.listActionsService
      .cancelTrainRun(subject, OrderType.STP, {
        cancellationDays,
        trainNumber,
        operatingCompany,
        cancellationReason: this.cancellationReasonControl.value || undefined,
      })
      .pipe(
        // Success path: next emits → map to true.
        // Error path: service returns EMPTY (no next) → defaultIfEmpty injects false.
        // Either way a single boolean reaches the subscriber and the dialog closes.
        map(() => true as boolean),
        defaultIfEmpty(false as boolean),
      )
      .subscribe(succeeded => this.dialogRef.close(succeeded));
  }

  /**
   * Determines the cancellation days based on the provided cancellation type.
   *
   * @param {CancellationType | undefined | null} cancellationType - The type of cancellation (FULL, PARTIAL, or undefined/null)
   * @returns {DaySet[]} An array of DaySet objects representing the days to be cancelled.
   *          - For FULL cancellation: returns all operating days from train run data
   *          - For PARTIAL cancellation: returns selected operating days if any are selected
   *          - For other cases: returns an empty array
   */
  private getCancellationDays(cancellationType: CancellationType | undefined | null): DaySet[] {
    let cancellationDays: DaySet[] = [];

    if (cancellationType === CancellationType.FULL) {
      cancellationDays = this.data.trainRunData?.operatingDays || [];
    } else if (cancellationType === CancellationType.PARTIAL && this.selectedOperatingDays.length > 0) {
      cancellationDays = this.selectedOperatingDays;
    }
    return cancellationDays;
  }

  /**
   * Opens the operating days dialog to allow the user to select the duration for train run cancellation.
   *
   * The dialog is populated with the operating days from the train run data and allows the user
   * to select which days to cancel the train run for.
   *
   * @returns {void}
   */
  protected openOperatingDaysDialog(): void {
    const dialogRef = this.dialog.open(OperatingDaysDialogComponent, {
      maxWidth: '60vw',
      data: this.getDialogData(),
    });

    dialogRef.afterClosed().subscribe((result: DaySet) => {
      if (result) {
        this.selectedOperatingDays = [result];
        // Trigger signal to update button state
        this.cancellationFormChanged.set(this.cancellationFormChanged() + 1);
      }
    });
  }

  private getDialogData(): Partial<OperatingDaysDialogData> {
    const parentOperatingDays: DaySet[] | undefined = this.data.trainRunData?.operatingDays;
    const operatingDays = this.selectedOperatingDays.length ? this.selectedOperatingDays : parentOperatingDays;

    const { beginDate, endDate } = getDateRangeOfCombinedOperatingDays(operatingDays);

    const dialogData: Partial<OperatingDaysDialogData> = {
      action: DialogAction.UPDATE,
      beginDate,
      endDate,
      daysBitmap: this.selectedOperatingDays?.[0]?.daysBitmap,
      selectedDays: this.selectedOperatingDays?.[0]?.selectedDays,
      deselectedDays: this.selectedOperatingDays?.[0]?.deselectedDays,
      isSubsetMode: true,
      message: this.tr.translate('lblPathCancellationODTDialog'),
      parentOperatingDays,
    };
    return dialogData;
  }

  /**
   * Gets the selected operating days information for display.
   *
   * @returns {object|null} Object containing date range and day arrays, or null if no selection
   */
  protected getSelectedOperatingDaysInfo(): {
    beginDate: string;
    endDate: string;
    selectedDays: number[];
    deselectedDays: number[];
  } | null {
    if (this.selectedOperatingDays.length === 0) {
      return null;
    }

    const selectedDaySet = this.selectedOperatingDays[0];
    if (!this.isValidDaySet(selectedDaySet)) {
      return null;
    }

    const { beginDate, endDate } = getDateRangeOfCombinedOperatingDays([selectedDaySet]);
    const fromDate = beginDate ? new Date(beginDate).toLocaleDateString() : '';
    const toDate = endDate ? new Date(endDate).toLocaleDateString() : '';

    return {
      beginDate: fromDate,
      endDate: toDate,
      selectedDays: selectedDaySet.selectedDays || [],
      deselectedDays: selectedDaySet.deselectedDays || [],
    };
  }

  /**
   * Validates whether a DaySet object contains the required properties for processing.
   *
   * @param {DaySet} daySet - The DaySet object to validate
   * @returns {boolean} True if the daySet has both beginDate and daysBitmap properties, false otherwise
   */
  private isValidDaySet(daySet: DaySet): boolean {
    return !!(daySet && daySet.beginDate && daySet.daysBitmap);
  }

  /**
   * Modifies a train run using the current order form data and train run data.
   *
   * This method calls the list actions service to perform the train run modification
   * using the subject and order type from the order form data, along with the
   * train run data from the component's data property.
   *
   * @returns {void}
   */
  protected modifyTrainRun(): void {
    const orderData = this.orderForm.get('orderData')?.value;
    if (orderData) {
      this.listActionsService.modifyTrainRun(orderData.subject, orderData.orderType, this.data);
    }
  }
}
