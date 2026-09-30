// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { DateRangeField } from '@Ordering/data/custom/enum/date-range-field.enum';
import { CustomValidationService } from '@Ordering/shared/services/custom-validation.service';
import { provideDayjsDateAdapter } from '@Ordering/utils/dayjs-date-adapter-provider';

import { CustomDateRangePickerComponent, DateRangeValue } from './custom-date-range-picker.component';

@Component({
  standalone: true,
  template: `
    <form [formGroup]="form">
      <app-custom-date-range-picker formControlName="range" [config]="config"></app-custom-date-range-picker>
    </form>
  `,
  imports: [ReactiveFormsModule, CustomDateRangePickerComponent],
})
class HostComponent {
  form = new FormGroup({
    range: new FormControl<DateRangeValue | null>(null),
  });

  config = { isReadonly: false };
}

describe('CustomDateRangePickerComponent', () => {
  let component: CustomDateRangePickerComponent;
  let fixture: ComponentFixture<CustomDateRangePickerComponent>;

  const translationsServiceMock = {
    translate: jest.fn().mockImplementation((key: string) => key),
    guiLanguage: 'en',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        CustomDateRangePickerComponent,
        TranslatePipe,
        BrowserAnimationsModule,
        NoopAnimationsModule,
        HostComponent,
      ],
      providers: [provideDayjsDateAdapter(), { provide: TranslationsService, useValue: translationsServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomDateRangePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.resetAllMocks();
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty date range controls', () => {
    expect(component['dateRange'].value.beginDate).toBeUndefined();
    expect(component['dateRange'].value.endDate).toBeUndefined();
  });

  it('should work as a reactive form control (writeValue + propagate changes)', () => {
    const hostFixture = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();

    const host = hostFixture.componentInstance;
    const control = host.form.get('range');

    const beginDate = new Date(2026, 0, 1);
    const endDate = new Date(2026, 0, 31);
    control.setValue({ beginDate, endDate });
    hostFixture.detectChanges();

    const pickerDebugEl = hostFixture.debugElement.query(By.directive(CustomDateRangePickerComponent));
    const pickerInstance = pickerDebugEl.componentInstance as CustomDateRangePickerComponent;
    expect(pickerInstance['dateRange'].value.beginDate).toEqual(beginDate);
    expect(pickerInstance['dateRange'].value.endDate).toEqual(endDate);

    const changedBegin = new Date(2026, 0, 15);
    pickerInstance['dateRange'].patchValue({ beginDate: changedBegin });
    expect(control.value.beginDate).toEqual(changedBegin);
  });

  describe('input binding', () => {
    it('should patch the form when dateRangeValue input is set', () => {
      const beginDate = new Date(2026, 0, 1);
      const endDate = new Date(2026, 0, 31);

      fixture.componentRef.setInput('dateRangeValue', { beginDate, endDate });
      fixture.detectChanges();

      expect(component['dateRange'].value.beginDate).toEqual(beginDate);
      expect(component['dateRange'].value.endDate).toEqual(endDate);
    });

    it('should accept string dates via input', () => {
      fixture.componentRef.setInput('dateRangeValue', { beginDate: '2026-01-01', endDate: '2026-01-31' });
      fixture.detectChanges();

      expect(component['dateRange'].value.beginDate).toBe('2026-01-01');
      expect(component['dateRange'].value.endDate).toBe('2026-01-31');
    });

    it('should not patch the form when input is undefined', () => {
      const spy = jest.spyOn(component['dateRange'], 'patchValue');

      fixture.componentRef.setInput('dateRangeValue', undefined);
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('output binding', () => {
    it('should emit dateRangeChange when form values change', () => {
      const emitted: DateRangeValue[] = [];
      component.dateRangeChange.subscribe((v: DateRangeValue) => emitted.push(v));

      const beginDate = new Date(2026, 2, 1);
      const endDate = new Date(2026, 2, 31);
      component['dateRange'].patchValue({ beginDate, endDate });

      expect(emitted.length).toBeGreaterThan(0);
      const last = emitted[emitted.length - 1];
      expect(last.beginDate).toEqual(beginDate);
      expect(last.endDate).toEqual(endDate);
    });

    it('should emit undefined for null values', () => {
      const emitted: DateRangeValue[] = [];
      component.dateRangeChange.subscribe((v: DateRangeValue) => emitted.push(v));

      component['dateRange'].patchValue({ beginDate: null, endDate: null });

      expect(emitted.length).toBeGreaterThan(0);
      const last = emitted[emitted.length - 1];
      expect(last.beginDate).toBeUndefined();
      expect(last.endDate).toBeUndefined();
    });
  });

  describe('validateDateInput()', () => {
    it('should call CustomValidationService.validateInputString with the control', () => {
      const spy = jest.spyOn(CustomValidationService, 'validateInputString');
      const event = { target: { value: '01/15/2026' } } as unknown as Event;

      component['validateDateInput'](event, DateRangeField.BEGIN_DATE);

      expect(spy).toHaveBeenCalledWith('01/15/2026', component['dateRange'].get(DateRangeField.BEGIN_DATE));
    });

    it('should trigger updateValueAndValidity on the parent form group', () => {
      jest.spyOn(CustomValidationService, 'validateInputString').mockImplementation(() => {});
      const spy = jest.spyOn(component['dateRange'], 'updateValueAndValidity');
      const event = { target: { value: '01/15/2026' } } as unknown as Event;

      component['validateDateInput'](event, DateRangeField.END_DATE);

      expect(spy).toHaveBeenCalled();
    });

    it('should do nothing if the control does not exist', () => {
      const spy = jest.spyOn(CustomValidationService, 'validateInputString');
      const event = { target: { value: 'test' } } as unknown as Event;

      component['validateDateInput'](event, 'nonexistent' as DateRangeField);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('clearDateRange()', () => {
    it('should reset the date range form', () => {
      component['dateRange'].patchValue({
        beginDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 0, 31),
      });

      const event = { stopPropagation: jest.fn() } as unknown as MouseEvent;
      component['clearDateRange'](event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component['dateRange'].value.beginDate).toBeNull();
      expect(component['dateRange'].value.endDate).toBeNull();
    });
  });

  describe('config input', () => {
    it('should accept min and max dates and readonly', () => {
      const minDate = new Date(2020, 0, 1);
      const maxDate = new Date(2030, 11, 31);

      fixture.componentRef.setInput('config', { minDate, maxDate, isReadonly: true });
      fixture.detectChanges();

      expect(component.config()).toEqual({ minDate, maxDate, isReadonly: true });
    });
  });

  describe('form validation', () => {
    it('should have required validators on both controls', () => {
      expect(component['dateRange'].get('beginDate')?.hasError('required')).toBe(true);
      expect(component['dateRange'].get('endDate')?.hasError('required')).toBe(true);
    });

    it('should clear required errors when values are set', () => {
      component['dateRange'].patchValue({
        beginDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 0, 31),
      });

      expect(component['dateRange'].get('beginDate')?.hasError('required')).toBe(false);
      expect(component['dateRange'].get('endDate')?.hasError('required')).toBe(false);
    });

    it('should have dateRangeInvalid error when begin date is after end date', () => {
      component['dateRange'].patchValue({
        beginDate: new Date(2026, 1, 1),
        endDate: new Date(2026, 0, 1),
      });

      expect(component['dateRange'].hasError('dateRangeInvalid')).toBe(true);
    });

    it('should not have dateRangeInvalid error when begin date is before end date', () => {
      component['dateRange'].patchValue({
        beginDate: new Date(2026, 0, 1),
        endDate: new Date(2026, 1, 1),
      });

      expect(component['dateRange'].hasError('dateRangeInvalid')).toBe(false);
    });
  });
});
