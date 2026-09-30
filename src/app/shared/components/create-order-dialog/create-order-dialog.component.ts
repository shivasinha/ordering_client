import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { OrderFormComponent, OrderFormData, OrderFormConfig } from '@Ordering/shared/components/order-form';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ActionDialogData } from '@Ordering/data/custom/action-dialog-data.interface';

export interface CreateOrderDialogData {
  initialSubject?: string;
  initialOrderType?: number;
  initialDescription?: string;
  initialTrainNo?: string;
  dialogTitle?: string;
  showDescription?: boolean;
  showTrainNo?: boolean;
  trainNoRequired?: boolean;
  actionDialogData?: Partial<ActionDialogData>;
}

@Component({
  selector: 'app-create-order-dialog',
  standalone: true,
  imports: [OrderFormComponent, TranslatePipe, SharedMaterialModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>{{ dialogTitle }}</h2>

    <mat-dialog-content>
      <form [formGroup]="orderForm">
        <app-order-form formControlName="orderData" [orderFormConfig]="orderFormConfig"> </app-order-form>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">{{ 'lblCancel' | translate }}</button>
      <button mat-raised-button color="primary" [disabled]="!formValid()" (click)="handleSave()">
        {{ 'lblSave' | translate }}
      </button>
    </mat-dialog-actions>
  `,
})
export class CreateOrderDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CreateOrderDialogComponent>);
  readonly data: CreateOrderDialogData = inject(MAT_DIALOG_DATA);
  readonly tr = inject(TranslationsService);

  protected dialogTitle = this.data.dialogTitle || 'Create Order';

  protected orderForm = new FormGroup({
    orderData: new FormControl<OrderFormData>({
      subject: this.data.initialSubject || '',
      orderType: this.data.initialOrderType || 0,
      description: this.data.initialDescription || '',
      trainNo: this.data.initialTrainNo || '',
    }),
  });

  protected orderFormConfig: OrderFormConfig = {
    showSubject: true,
    showOrderType: true,
    showDescription: this.data.showDescription ?? true,
    showTrainNo: this.data.showTrainNo ?? false,
    subjectRequired: true,
    orderTypeRequired: true,
    trainNoRequired: this.data.trainNoRequired ?? false,
    descriptionMaxLength: 2000,
  };

  protected formValid = signal(false);

  constructor() {
    this.setupFormValidation();
  }

  /**
   * Initializes and manages the form validation logic for the order form.
   *
   * This method sets up the initial validation state by calling `updateFormValidation()`
   * and subscribes to the form's value changes to re-validate the form whenever its values change.
   *
   * @returns {void}
   */
  private setupFormValidation(): void {
    this.updateFormValidation();
    this.orderForm.valueChanges.subscribe(() => {
      this.updateFormValidation();
    });
  }

  /**
   * Updates the form validation state by checking if the required fields in the order form are valid.
   * Specifically, it verifies that the 'subject' field is a non-empty string and that the 'orderType' field is not null or undefined.
   * Sets the result to the `formValid` observable.
   *
   * @returns {void}
   */
  private updateFormValidation(): void {
    const orderData = this.orderForm.get('orderData')?.value;
    this.formValid.set(this.isValidSubject(orderData) && this.isValidOrderType(orderData) && this.isValidTrainNo(orderData));
  }

  /**
   * Checks whether the subject in the provided order data is valid.
   *
   * @param {OrderFormData | null | undefined} orderData - The order form data to validate.
   * @returns {boolean} `true` if the subject is a non-empty string; otherwise, `false`.
   */
  private isValidSubject(orderData: OrderFormData | null | undefined): boolean {
    return orderData?.subject?.trim() !== '';
  }

  /**
   * Checks whether the order type in the provided order data is valid.
   *
   * @param {OrderFormData | null | undefined} orderData - The order form data to validate.
   * @returns {boolean} `true` if the order type is not null or undefined; otherwise, `false`.
   */
  private isValidOrderType(orderData: OrderFormData | null | undefined): boolean {
    return orderData?.orderType !== null && orderData?.orderType !== undefined;
  }

  /**
   * Checks whether the train number in the provided order data is valid.
   *
   * The train number is considered valid if either:
   * - The `trainNoRequired` flag in the order form configuration is `false`, or
   * - The `trainNoRequired` flag is `true` and the `trainNo` field in `orderData` is a non-empty, non-whitespace string.
   *
   * @param {OrderFormData | null | undefined} orderData - The order form data to validate, which may be `null` or `undefined`.
   * @returns {boolean} `true` if the train number is valid according to the configuration; otherwise, `false`.
   */
  private isValidTrainNo(orderData: OrderFormData | null | undefined): boolean {
    return !this.orderFormConfig.trainNoRequired || orderData?.trainNo?.trim() !== '';
  }

  /**
   * Handles the save action for the order form.
   *
   * Retrieves the `orderData` from the form. If `orderData` is present,
   * closes the dialog and returns an object containing both the order data
   * and any associated action dialog data.
   *
   * @returns {void}
   */
  protected handleSave(): void {
    const orderData = this.orderForm.get('orderData')?.value;
    if (!orderData) return;

    // Return both order data and action dialog data
    this.dialogRef.close({
      orderData,
      actionDialogData: this.data.actionDialogData,
    });
  }
}
