// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FilterService } from '@Ordering/shared/services/filter.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { OrderFormComponent, OrderFormData } from './order-form.component';

describe('OrderFormComponent', () => {
  let component: OrderFormComponent;
  let fixture: ComponentFixture<OrderFormComponent>;
  let mockFilterService: jest.Mocked<FilterService>;
  let mockTranslationsService: jest.Mocked<TranslationsService>;

  beforeEach(async () => {
    mockFilterService = {
      getOrders: jest.fn().mockReturnValue([
        { key: 0, value: 'STP' },
        { key: 1, value: 'LTP' },
      ]),
      filteredOrderTypes: jest.fn().mockReturnValue([
        { key: 0, value: 'STP' },
        { key: 1, value: 'LTP' },
      ]),
    } as any;

    mockTranslationsService = {
      translate: jest.fn().mockImplementation((key: string) => `translated_${key}`),
    } as any;

    await TestBed.configureTestingModule({
      imports: [OrderFormComponent, ReactiveFormsModule, SharedMaterialModule, NoopAnimationsModule],
      providers: [
        { provide: FilterService, useValue: mockFilterService },
        { provide: TranslationsService, useValue: mockTranslationsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderFormComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values', () => {
      fixture.detectChanges();

      expect(component.orderForm.get('subject')?.value).toBe('');
      expect(component.orderForm.get('orderType')?.value).toBe(0);
      expect(component.orderForm.get('description')?.value).toBe('');
      expect(component.orderForm.get('trainNo')?.value).toBe('');
    });

    it('should set subject as required by default', () => {
      fixture.detectChanges();

      const subjectControl = component.orderForm.get('subject');
      expect(subjectControl?.hasError('required')).toBe(true);
    });

    it('should set orderType as required by default', () => {
      fixture.detectChanges();

      const orderTypeControl = component.orderForm.get('orderType');
      // Since orderType has a default value of 0, check that the validator is applied
      expect(orderTypeControl?.hasValidator(Validators.required)).toBe(true);
    });

    it('should apply maxLength validator to description', () => {
      component.orderFormConfig = { descriptionMaxLength: 2000 };
      fixture.detectChanges();

      const descriptionControl = component.orderForm.get('description');
      descriptionControl?.setValue('a'.repeat(2001));

      expect(descriptionControl?.hasError('maxlength')).toBe(true);
    });

    it('should not require subject when subjectRequired is false', () => {
      component.orderFormConfig = { subjectRequired: false };
      fixture.detectChanges(); // Initialize with the new config

      const subjectControl = component.orderForm.get('subject');
      expect(subjectControl?.hasValidator(Validators.required)).toBe(false);
    });

    it('should not require orderType when orderTypeRequired is false', () => {
      component.orderFormConfig = { orderTypeRequired: false };
      fixture.detectChanges();

      const orderTypeControl = component.orderForm.get('orderType');
      expect(orderTypeControl?.hasError('required')).toBe(false);
    });

    it('should not require trainNo by default', () => {
      fixture.detectChanges();

      const trainNoControl = component.orderForm.get('trainNo');
      expect(trainNoControl?.hasError('required')).toBe(false);
    });

    it('should require trainNo when trainNoRequired is true', () => {
      component.orderFormConfig = { trainNoRequired: true };
      fixture.detectChanges();

      const trainNoControl = component.orderForm.get('trainNo');
      trainNoControl?.setValue('');
      expect(trainNoControl?.hasError('required')).toBe(true);
    });

    it('should apply maxLength validator to trainNo', () => {
      component.orderFormConfig = { trainNoMaxLength: 10 };
      fixture.detectChanges();

      const trainNoControl = component.orderForm.get('trainNo');
      trainNoControl?.setValue('12345678901'); // 11 characters

      expect(trainNoControl?.hasError('maxlength')).toBe(true);
    });

    it('should use MAX_TRAIN_NO_LENGTH as default for trainNo', () => {
      fixture.detectChanges();

      const trainNoControl = component.orderForm.get('trainNo');
      trainNoControl?.setValue('12345678901'); // 11 characters (exceeds default of 10)

      expect(trainNoControl?.hasError('maxlength')).toBe(true);
    });
  });

  describe('Control Value Accessor', () => {
    it('should write value to form', () => {
      fixture.detectChanges();

      const testData: OrderFormData = {
        subject: 'Test Subject',
        orderType: 1,
        description: 'Test Description',
        trainNo: 'TR-123',
      };

      component.writeValue(testData);

      expect(component.orderForm.get('subject')?.value).toBe('Test Subject');
      expect(component.orderForm.get('orderType')?.value).toBe(1);
      expect(component.orderForm.get('description')?.value).toBe('Test Description');
      expect(component.orderForm.get('trainNo')?.value).toBe('TR-123');
    });

    it('should handle empty object value in writeValue', () => {
      fixture.detectChanges();

      component.writeValue({ subject: '', orderType: 0 });

      expect(component.orderForm.get('subject')?.value).toBe('');
      expect(component.orderForm.get('orderType')?.value).toBe(0);
      expect(component.orderForm.get('description')?.value).toBe('');
      expect(component.orderForm.get('trainNo')?.value).toBe('');
    });

    it('should handle partial value in writeValue', () => {
      fixture.detectChanges();

      const partialData: OrderFormData = {
        subject: 'Only Subject',
        orderType: 0,
      };

      component.writeValue(partialData);

      expect(component.orderForm.get('subject')?.value).toBe('Only Subject');
      expect(component.orderForm.get('orderType')?.value).toBe(0);
      expect(component.orderForm.get('description')?.value).toBe('');
      expect(component.orderForm.get('trainNo')?.value).toBe('');
    });

    it('should call onChange when form value changes', done => {
      fixture.detectChanges();

      const changeSpy = jest.fn();
      component.registerOnChange(changeSpy);

      component.orderForm.patchValue({
        subject: 'New Subject',
        orderType: 1,
        description: 'New Description',
        trainNo: 'TR-999',
      });

      // Wait for async form changes
      setTimeout(() => {
        expect(changeSpy).toHaveBeenCalled();
        const callArg = changeSpy.mock.calls[0][0] as OrderFormData;
        expect(callArg.subject).toBe('New Subject');
        expect(callArg.orderType).toBe(1);
        expect(callArg.description).toBe('New Description');
        expect(callArg.trainNo).toBe('TR-999');
        done();
      }, 100);
    });

    it('should call onTouched when registered', () => {
      fixture.detectChanges();

      const touchSpy = jest.fn();
      component.registerOnTouched(touchSpy);

      // Simulate blur event to trigger onTouched
      component['onTouched']();

      expect(touchSpy).toHaveBeenCalled();
    });

    it('should disable form when setDisabledState is called with true', () => {
      fixture.detectChanges();

      component.setDisabledState(true);

      expect(component.orderForm.disabled).toBe(true);
      expect(component.orderForm.get('subject')?.disabled).toBe(true);
      expect(component.orderForm.get('orderType')?.disabled).toBe(true);
      expect(component.orderForm.get('description')?.disabled).toBe(true);
      expect(component.orderForm.get('trainNo')?.disabled).toBe(true);
    });

    it('should enable form when setDisabledState is called with false', () => {
      fixture.detectChanges();

      component.setDisabledState(true);
      component.setDisabledState(false);

      expect(component.orderForm.disabled).toBe(false);
      expect(component.orderForm.get('subject')?.disabled).toBe(false);
      expect(component.orderForm.get('orderType')?.disabled).toBe(false);
      expect(component.orderForm.get('description')?.disabled).toBe(false);
      expect(component.orderForm.get('trainNo')?.disabled).toBe(false);
    });
  });

  describe('Form Configuration', () => {
    it('should compute formConfig signal correctly with showSubject', () => {
      component.orderFormConfig = { showSubject: true };
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.showSubject).toBe(true);
    });

    it('should compute formConfig signal correctly with showOrderType', () => {
      component.orderFormConfig = { showOrderType: true };
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.showOrderType).toBe(true);
    });

    it('should compute formConfig signal correctly with showDescription', () => {
      component.orderFormConfig = { showDescription: true };
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.showDescription).toBe(true);
    });

    it('should use default descriptionMaxLength when not provided', () => {
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.descriptionMaxLength).toBe(2000);
    });

    it('should use custom descriptionMaxLength when provided', () => {
      component.orderFormConfig = { descriptionMaxLength: 500 };
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.descriptionMaxLength).toBe(500);
    });

    it('should compute formConfig signal correctly with showTrainNo', () => {
      component.orderFormConfig = { showTrainNo: true };
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.showTrainNo).toBe(true);
    });

    it('should default showTrainNo to false when not provided', () => {
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.showTrainNo).toBe(false);
    });

    it('should compute formConfig signal correctly with trainNoRequired', () => {
      component.orderFormConfig = { trainNoRequired: true };
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.trainNoRequired).toBe(true);
    });

    it('should default trainNoRequired to false when not provided', () => {
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.trainNoRequired).toBe(false);
    });

    it('should use default trainNoMaxLength when not provided', () => {
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.trainNoMaxLength).toBe(10); // MAX_TRAIN_NO_LENGTH constant
    });

    it('should use custom trainNoMaxLength when provided', () => {
      component.orderFormConfig = { trainNoMaxLength: 20 };
      fixture.detectChanges();

      const config = component['formConfig']();
      expect(config.trainNoMaxLength).toBe(20);
    });
  });

  describe('Validation', () => {
    it('should validate required subject field', () => {
      fixture.detectChanges();

      const subjectControl = component.orderForm.get('subject');
      subjectControl?.setValue('');
      subjectControl?.markAsTouched();

      expect(subjectControl?.hasError('required')).toBe(true);
      expect(subjectControl?.valid).toBe(false);
    });

    it('should validate description maxLength', () => {
      component.orderFormConfig = { descriptionMaxLength: 100 };
      fixture.detectChanges();

      const descriptionControl = component.orderForm.get('description');
      descriptionControl?.setValue('a'.repeat(101));

      expect(descriptionControl?.hasError('maxlength')).toBe(true);
      expect(descriptionControl?.valid).toBe(false);
    });

    it('should allow valid description within maxLength', () => {
      component.orderFormConfig = { descriptionMaxLength: 100 };
      fixture.detectChanges();

      const descriptionControl = component.orderForm.get('description');
      descriptionControl?.setValue('a'.repeat(100));

      expect(descriptionControl?.hasError('maxlength')).toBe(false);
      expect(descriptionControl?.valid).toBe(true);
    });

    it('should allow empty description', () => {
      fixture.detectChanges();

      const descriptionControl = component.orderForm.get('description');
      descriptionControl?.setValue('');

      expect(descriptionControl?.valid).toBe(true);
    });

    it('should be valid when all required fields are filled', () => {
      fixture.detectChanges();

      component.orderForm.patchValue({
        subject: 'Valid Subject',
        orderType: 1,
      });

      expect(component.orderForm.valid).toBe(true);
    });

    it('should validate required trainNo field when trainNoRequired is true', () => {
      component.orderFormConfig = { trainNoRequired: true };
      fixture.detectChanges();

      const trainNoControl = component.orderForm.get('trainNo');
      trainNoControl?.setValue('');
      trainNoControl?.markAsTouched();

      expect(trainNoControl?.hasError('required')).toBe(true);
      expect(trainNoControl?.valid).toBe(false);
    });

    it('should validate trainNo maxLength', () => {
      component.orderFormConfig = { trainNoMaxLength: 5 };
      fixture.detectChanges();

      const trainNoControl = component.orderForm.get('trainNo');
      trainNoControl?.setValue('123456'); // 6 characters

      expect(trainNoControl?.hasError('maxlength')).toBe(true);
      expect(trainNoControl?.valid).toBe(false);
    });

    it('should allow valid trainNo within maxLength', () => {
      component.orderFormConfig = { trainNoMaxLength: 10 };
      fixture.detectChanges();

      const trainNoControl = component.orderForm.get('trainNo');
      trainNoControl?.setValue('1234567890'); // 10 characters

      expect(trainNoControl?.hasError('maxlength')).toBe(false);
      expect(trainNoControl?.valid).toBe(true);
    });

    it('should allow empty trainNo when not required', () => {
      component.orderFormConfig = { trainNoRequired: false };
      fixture.detectChanges();

      const trainNoControl = component.orderForm.get('trainNo');
      trainNoControl?.setValue('');

      expect(trainNoControl?.valid).toBe(true);
    });

    it('should be valid when all fields including trainNo are filled correctly', () => {
      component.orderFormConfig = { trainNoRequired: true };
      fixture.detectChanges();

      component.orderForm.patchValue({
        subject: 'Valid Subject',
        orderType: 1,
        description: 'Valid Description',
        trainNo: 'TR-123',
      });

      expect(component.orderForm.valid).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from subscriptions on destroy', () => {
      fixture.detectChanges();

      const subscription = component['subscriptions'][0];
      const unsubscribeSpy = jest.spyOn(subscription, 'unsubscribe');

      component.ngOnDestroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});
