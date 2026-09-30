import { Component, Input, OnInit, OnDestroy, computed, inject, forwardRef } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ValidatorFn,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { MAX_TRAIN_NO_LENGTH } from '@Ordering/shared/constants/train-constants';

export interface OrderFormData {
  subject: string;
  orderType: number;
  description?: string;
  trainNo?: string;
}

export interface OrderFormConfig {
  subjectRequired?: boolean;
  orderTypeRequired?: boolean;
  showSubject?: boolean;
  showOrderType?: boolean;
  showDescription?: boolean;
  descriptionMaxLength?: number;
  showTrainNo?: boolean;
  trainNoRequired?: boolean;
  trainNoMaxLength?: number;
  disabled?: boolean;
}

@Component({
  selector: 'app-order-form',
  imports: [ReactiveFormsModule, SharedMaterialModule, TranslatePipe],
  templateUrl: './order-form.component.html',
  styleUrl: './order-form.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OrderFormComponent),
      multi: true,
    },
  ],
})
export class OrderFormComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() orderFormConfig: OrderFormConfig = {};

  protected filterService = inject(FilterService);
  protected tr = inject(TranslationsService);

  private subscriptions: Subscription[] = [];

  // Control Value Accessor properties
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onChange = (value: OrderFormData) => {};
  private onTouched = () => {};
  private isDisabled = false;

  protected orderForm = new FormGroup({
    subject: new FormControl('', { nonNullable: true }),
    orderType: new FormControl<number>(0, { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    trainNo: new FormControl('', { nonNullable: true }),
  });

  protected formConfig = computed<OrderFormConfig>(() => ({
    subjectRequired: this.orderFormConfig.subjectRequired ?? true,
    orderTypeRequired: this.orderFormConfig.orderTypeRequired ?? true,
    showSubject: this.orderFormConfig.showSubject ?? true,
    showOrderType: this.orderFormConfig.showOrderType ?? true,
    showDescription: this.orderFormConfig.showDescription ?? false,
    descriptionMaxLength: this.orderFormConfig.descriptionMaxLength ?? 2000,
    showTrainNo: this.orderFormConfig.showTrainNo ?? false,
    trainNoRequired: this.orderFormConfig.trainNoRequired ?? false,
    trainNoMaxLength: this.orderFormConfig.trainNoMaxLength ?? MAX_TRAIN_NO_LENGTH,
    disabled: this.orderFormConfig.disabled ?? false,
  }));

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Initializes the order form with configuration-based setup.
   *
   * This method performs the following operations:
   * - Applies conditional validators based on form configuration requirements
   * - Disables the entire form if specified in configuration
   * - Updates form validation state after all changes
   *
   * @returns {void}
   */
  private initializeForm(): void {
    this.applyFormValidators();
    this.setDisabledStateForForm();
    this.orderForm.updateValueAndValidity();
  }

  /**
   * Applies validators to all form controls based on the current configuration.
   *
   * @returns {void}
   */
  private applyFormValidators(): void {
    const config: OrderFormConfig = this.formConfig();

    this.setFieldValidators('subject', this.getSubjectValidators(config));
    this.setFieldValidators('orderType', this.getOrderTypeValidators(config));
    this.setFieldValidators('description', this.getDescriptionValidators(config));
    this.setFieldValidators('trainNo', this.getTrainNoValidators(config));
  }

  /**
   * Sets validators for a specific form field.
   *
   * @param {string} fieldName - The name of the form field
   * @param {ValidatorFn[]} validators - Array of validators to apply
   * @returns {void}
   */
  private setFieldValidators(fieldName: string, validators: ValidatorFn[]): void {
    const control = this.orderForm.get(fieldName);
    control?.setValidators(validators);
    control?.updateValueAndValidity();
  }

  /**
   * Gets validators for the subject field.
   *
   * @param {OrderFormConfig} config - The form configuration
   * @returns {ValidatorFn[]} Array of validators
   */
  private getSubjectValidators(config: OrderFormConfig): ValidatorFn[] {
    return config.subjectRequired ? [Validators.required] : [];
  }

  /**
   * Gets validators for the orderType field.
   *
   * @param {OrderFormConfig} config - The form configuration
   * @returns {ValidatorFn[]} Array of validators
   */
  private getOrderTypeValidators(config: OrderFormConfig): ValidatorFn[] {
    return config.orderTypeRequired ? [Validators.required] : [];
  }

  /**
   * Gets validators for the description field.
   *
   * @param {OrderFormConfig} config - The form configuration
   * @returns {ValidatorFn[]} Array of validators
   */
  private getDescriptionValidators(config: OrderFormConfig): ValidatorFn[] {
    return config.descriptionMaxLength ? [Validators.maxLength(config.descriptionMaxLength)] : [];
  }

  /**
   * Gets validators for the trainNo field.
   *
   * @param {OrderFormConfig} config - The form configuration
   * @returns {ValidatorFn[]} Array of validators
   */
  private getTrainNoValidators(config: OrderFormConfig): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (config.trainNoRequired) {
      validators.push(Validators.required);
    }

    if (config.trainNoMaxLength) {
      validators.push(Validators.maxLength(config.trainNoMaxLength));
    }

    return validators;
  }

  /**
   * Sets the enabled or disabled state of the `orderForm` based on the current form configuration
   * and the component's `isDisabled` property.
   *
   * If either the form configuration indicates the form should be disabled, or the component's
   * `isDisabled` flag is set to true, the form will be disabled. Otherwise, the form will be enabled.
   *
   * @returns {void}
   */
  private setDisabledStateForForm(): void {
    if (this.formConfig().disabled || this.isDisabled) {
      this.orderForm.disable();
    } else {
      this.orderForm.enable();
    }
  }

  /**
   * Sets up form subscriptions to monitor form value and validity changes.
   *
   * Subscribes to the orderForm's valueChanges to emit form data changes with
   * subject and orderType values, and subscribes to statusChanges to emit
   * form validity state changes.
   *
   * @returns {void}
   */
  private setupFormSubscriptions(): void {
    // Clean up existing subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // Emit form changes
    const valueChanges = this.orderForm.valueChanges.subscribe(value => {
      const formData: OrderFormData = {
        subject: value.subject || '',
        orderType: value.orderType || 0,
        description: value.description || '',
        trainNo: value.trainNo || '',
      };

      // Call Control Value Accessor callback
      this.onChange(formData);
    });

    this.subscriptions.push(valueChanges);
  }

  /**
   * Marks the component as touched for Control Value Accessor integration
   * Called when form fields lose focus
   */
  protected markAsTouched(): void {
    this.onTouched();
  }

  // Control Value Accessor Implementation

  /**
   * Writes a new value to the component. Used by Angular forms to set the form value.
   * @param value The form data to write to the component
   */
  writeValue(value: OrderFormData): void {
    if (value) {
      this.orderForm.patchValue(
        {
          subject: value.subject,
          orderType: value.orderType,
          description: value.description || '',
          trainNo: value.trainNo || '',
        },
        { emitEvent: false },
      );
    }
  }

  /**
   * Registers a callback function to be called when the form value changes.
   * @param fn The callback function to register
   */
  registerOnChange(fn: (value: OrderFormData) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers a callback function to be called when the form is touched.
   * @param fn The callback function to register
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Sets the disabled state of the component. Used by Angular forms to disable the form.
   * @param isDisabled Whether the component should be disabled
   */
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    if (isDisabled) {
      this.orderForm.disable();
    } else {
      this.orderForm.enable();
    }
  }
}
