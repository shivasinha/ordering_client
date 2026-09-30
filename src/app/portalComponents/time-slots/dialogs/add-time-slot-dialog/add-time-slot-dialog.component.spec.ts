import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AbstractControl } from '@angular/forms';

import { RestrictionTimeSlots, Config, Project } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';

import { AddTimeSlotDialogComponent } from './add-time-slot-dialog.component';

describe('AddTimeSlotDialogComponent', () => {
  let component: AddTimeSlotDialogComponent;
  let fixture: ComponentFixture<AddTimeSlotDialogComponent>;
  let mockDialogRef: any;
  let mockTranslationsService: any;
  let mockConfigDataService: any;

  const mockTimeSlot: RestrictionTimeSlots = {
    beginDate: '2026-01-15',
    endDate: '2026-01-20',
    fromTime: '09:30',
    toTime: '17:45',
    broken: true,
  };

  beforeEach(async () => {
    mockDialogRef = {
      close: jest.fn(),
    };

    mockTranslationsService = {
      translate: jest.fn((key: string) => {
        const translations: Record<string, string> = {
          msgNotEmpty: '{0} is required',
          lblFromTime: 'From Time',
          lblToTime: 'To Time',
          msgInvalidTimeFormat: 'Invalid time format: {0}',
          msgTimeFormatInvalidHM: 'HH:mm (24-hour)',
        };
        return translations[key] || key;
      }),
    };

    mockConfigDataService = {
      configData: {
        projects: [{ name: 'Default Project', begin: '2026-01-01', end: '2026-12-31' } as Project],
      } as Config,
      getSelectedProjectPeriod: jest.fn(() => ({})),
    };

    await TestBed.configureTestingModule({
      imports: [AddTimeSlotDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: TranslationsService, useValue: mockTranslationsService },
        { provide: ConfigDataService, useValue: mockConfigDataService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddTimeSlotDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form structure', () => {
    it('should have a form group with dateRange, fromTime, toTime, and separated controls', () => {
      expect(component['form'].get('dateRange')).toBeTruthy();
      expect(component['form'].get('fromTime')).toBeTruthy();
      expect(component['form'].get('toTime')).toBeTruthy();
      expect(component['form'].get('separated')).toBeTruthy();
    });

    it('should initialize times with default value "00:00"', () => {
      expect(component['form'].get('fromTime')?.value).toBe('00:00');
      expect(component['form'].get('toTime')?.value).toBe('00:00');
    });

    it('should initialize separated checkbox with false', () => {
      expect(component['form'].get('separated')?.value).toBe(false);
    });

    it('should have non-null default values for fromTime and toTime', () => {
      expect(component['form'].get('fromTime')?.value).not.toBeNull();
      expect(component['form'].get('toTime')?.value).not.toBeNull();
    });
  });

  describe('Edit mode detection', () => {
    it('should be in create mode when no initialValue is provided', () => {
      expect(component['isEditMode']()).toBe(false);
    });

    it('should be in edit mode when initialValue is provided', async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [AddTimeSlotDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { initialValue: mockTimeSlot } },
          { provide: TranslationsService, useValue: mockTranslationsService },
          { provide: ConfigDataService, useValue: mockConfigDataService },
        ],
      }).compileComponents();

      const newFixture = TestBed.createComponent(AddTimeSlotDialogComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent['isEditMode']()).toBe(true);
    });
  });

  describe('Form pre-fill on edit', () => {
    it('should pre-fill form with initialValue data when in edit mode', async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [AddTimeSlotDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { initialValue: mockTimeSlot } },
          { provide: TranslationsService, useValue: mockTranslationsService },
          { provide: ConfigDataService, useValue: mockConfigDataService },
        ],
      }).compileComponents();

      const newFixture = TestBed.createComponent(AddTimeSlotDialogComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      const form = newComponent['form'];
      expect(form.get('fromTime')?.value).toBe('09:30');
      expect(form.get('toTime')?.value).toBe('17:45');
      expect(form.get('separated')?.value).toBe(true);

      // Check date range
      const dateRangeValue = form.get('dateRange')?.value as { beginDate: unknown; endDate: unknown } | null;
      expect(dateRangeValue?.beginDate).toBeDefined();
      expect(dateRangeValue?.endDate).toBeDefined();
    });
  });

  describe('Cancel action', () => {
    it('should close dialog without returning value when cancelled', () => {
      component['onCancel']();
      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });

    it('should not validate form when cancelled', () => {
      component['form'].get('dateRange')?.setValue({} as any);
      component['form'].get('fromTime')?.setValue('');

      component['onCancel']();

      expect(mockDialogRef.close).toHaveBeenCalled();
      expect(component['form'].invalid).toBe(true); // Form still invalid
    });
  });

  describe('Time validation', () => {
    const validateTime = (timeValue: string): boolean => {
      const control = component['form'].get('fromTime')!;
      control.setValue(timeValue);
      return control.valid;
    };

    it('should accept valid HH:mm format (00:00)', () => {
      expect(validateTime('00:00')).toBe(true);
    });

    it('should accept valid HH:mm format (09:30)', () => {
      expect(validateTime('09:30')).toBe(true);
    });

    it('should accept valid HH:mm format (23:59)', () => {
      expect(validateTime('23:59')).toBe(true);
    });

    it('should accept valid HH:mm format (12:00)', () => {
      expect(validateTime('12:00')).toBe(true);
    });

    it('should reject empty string', () => {
      component['form'].get('fromTime')?.setValue('');
      expect(component['form'].get('fromTime')?.valid).toBe(false);
    });

    it('should accept whitespace-trimmed valid time', () => {
      expect(validateTime('  09:30  ')).toBe(true);
    });

    it('should have required error for empty required field', () => {
      const dateRangeControl = component['form'].get('dateRange')!;
      expect(dateRangeControl.hasError('required')).toBe(true);
    });
  });

  describe('Form submission', () => {
    it('should close dialog with slot data when form is valid', () => {
      // Set up valid form data
      component['form'].patchValue({
        dateRange: {
          beginDate: new Date('2026-01-15'),
          endDate: new Date('2026-01-20'),
        },
        fromTime: '09:30',
        toTime: '17:45',
        separated: true,
      });

      component['onAdd']();

      expect(mockDialogRef.close).toHaveBeenCalled();
      const resultArg = mockDialogRef.close.mock.calls[0][0] as RestrictionTimeSlots;
      expect(resultArg.fromTime).toBe('09:30');
      expect(resultArg.toTime).toBe('17:45');
      expect(resultArg.broken).toBe(true);
    });

    it('should not close dialog and mark form as touched when form is invalid', () => {
      component['form'].patchValue({
        dateRange: {} as any,
        fromTime: 'invalid',
        toTime: '17:45',
        separated: false,
      });

      component['onAdd']();

      expect(mockDialogRef.close).not.toHaveBeenCalled();
      expect(component['form'].touched).toBe(true);
    });

    it('should convert broken flag correctly', () => {
      component['form'].patchValue({
        dateRange: {
          beginDate: new Date('2026-01-15'),
          endDate: new Date('2026-01-20'),
        },
        fromTime: '09:30',
        toTime: '17:45',
        separated: false,
      });

      component['onAdd']();

      const resultArg = mockDialogRef.close.mock.calls[0][0] as RestrictionTimeSlots;
      expect(resultArg.broken).toBe(false);
    });

    it('should normalize dates to API format', () => {
      const beginDate = new Date(2026, 0, 15); // January 15, 2026
      const endDate = new Date(2026, 0, 20); // January 20, 2026

      component['form'].patchValue({
        dateRange: {
          beginDate,
          endDate,
        },
        fromTime: '09:30',
        toTime: '17:45',
        separated: false,
      });

      component['onAdd']();

      const resultArg = mockDialogRef.close.mock.calls[0][0] as RestrictionTimeSlots;
      expect(resultArg.beginDate).toMatch(/^2026-01-15/);
      expect(resultArg.endDate).toMatch(/^2026-01-20/);
    });
  });

  describe('Error messages', () => {
    it('should generate required field error message', () => {
      const message = component['requiredMessage']('lblFromTime');
      expect(message).toContain('From Time');
      expect(message).toContain('is required');
    });

    it('should generate invalid time format error message', () => {
      const message = component['invalidTimeFormatMessage']();
      expect(message).toContain('HH:mm (24-hour)');
      expect(message).toContain('Invalid time format');
    });
  });

  describe('Date parsing utility', () => {
    it('should parse valid ISO date string', () => {
      const date = AddTimeSlotDialogComponent['parseIsoDate']('2026-01-15');
      expect(date).toBeDefined();
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(0); // January is 0
      expect(date?.getDate()).toBe(15);
    });

    it('should return undefined for invalid date string', () => {
      const date = AddTimeSlotDialogComponent['parseIsoDate']('invalid');
      expect(date).toBeUndefined();
    });

    it('should return undefined for empty date string', () => {
      const date = AddTimeSlotDialogComponent['parseIsoDate']('');
      expect(date).toBeUndefined();
    });

    it('should return undefined for null-like values', () => {
      const date = AddTimeSlotDialogComponent['parseIsoDate'](null as any);
      expect(date).toBeUndefined();
    });

    it('should correctly parse leap year date', () => {
      // 2024 is a leap year
      const date = AddTimeSlotDialogComponent['parseIsoDate']('2024-02-29');
      expect(date).toBeDefined();
      expect(date?.getDate()).toBe(29);
    });

    it('should reject invalid leap year date', () => {
      // 2023 is not a leap year
      const date = AddTimeSlotDialogComponent['parseIsoDate']('2023-02-29');
      expect(date).toBeUndefined();
    });
  });

  describe('Time format validator', () => {
    let validator: any;

    beforeEach(() => {
      validator = AddTimeSlotDialogComponent['timeFormatValidator']();
    });

    it('should accept null value (delegated to required validator)', () => {
      const control = {
        value: null,
      } as AbstractControl;
      expect(validator(control)).toBeNull();
    });

    it('should accept undefined value (delegated to required validator)', () => {
      const control = {
        value: undefined,
      } as AbstractControl;
      expect(validator(control)).toBeNull();
    });

    it('should accept empty string (delegated to required validator)', () => {
      const control = {
        value: '',
      } as AbstractControl;
      expect(validator(control)).toBeNull();
    });

    it('should accept valid 24-hour times', () => {
      const validTimes = ['00:00', '01:30', '12:00', '23:59', '09:45', '18:15'];
      validTimes.forEach(time => {
        const control = { value: time } as AbstractControl;
        expect(validator(control)).toBeNull();
      });
    });

    it('should reject invalid hours', () => {
      const invalidTimes = ['24:00', '25:30', '-1:00', '99:00'];
      invalidTimes.forEach(time => {
        const control = { value: time } as AbstractControl;
        expect(validator(control)).toEqual({ timeFormat: true });
      });
    });

    it('should reject invalid minutes', () => {
      const invalidTimes = ['12:60', '12:99', '12:-5', '00:70'];
      invalidTimes.forEach(time => {
        const control = { value: time } as AbstractControl;
        expect(validator(control)).toEqual({ timeFormat: true });
      });
    });

    it('should reject non-HH:mm format', () => {
      // Note: single-digit hours like '9:30' are accepted by the validator
      // (regex allows optional leading digit via [01]?\d).
      const invalidFormats = ['9:5', '1230', '12.30', '12 30'];
      invalidFormats.forEach(time => {
        const control = { value: time } as AbstractControl;
        expect(validator(control)).toEqual({ timeFormat: true });
      });
    });

    it('should handle whitespace by trimming', () => {
      const control = {
        value: '  09:30  ',
      } as AbstractControl;
      expect(validator(control)).toBeNull();
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle form submission with all fields populated', () => {
      component['form'].patchValue({
        dateRange: {
          beginDate: new Date(2026, 0, 1),
          endDate: new Date(2026, 0, 31),
        },
        fromTime: '08:00',
        toTime: '20:00',
        separated: true,
      });

      expect(component['form'].valid).toBe(true);
      component['onAdd']();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should reject submission when required dateRange is missing', () => {
      component['form'].patchValue({
        dateRange: null,
        fromTime: '08:00',
        toTime: '20:00',
        separated: false,
      });

      component['onAdd']();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should reject submission when fromTime is invalid', () => {
      // Set a valid date range first, then manually inject a validation error
      // (ngx-mask transforms values on setValue so we set the error directly)
      component['form'].patchValue({
        dateRange: {
          beginDate: new Date(2026, 0, 1),
          endDate: new Date(2026, 0, 31),
        },
        fromTime: '08:00',
        toTime: '20:00',
        separated: false,
      });
      component['form'].get('fromTime')!.setErrors({ timeFormat: true });

      component['onAdd']();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should reject submission when toTime is invalid', () => {
      component['form'].patchValue({
        dateRange: {
          beginDate: new Date(2026, 0, 1),
          endDate: new Date(2026, 0, 31),
        },
        fromTime: '08:00',
        toTime: '20:00',
        separated: false,
      });
      component['form'].get('toTime')!.setErrors({ timeFormat: true });

      component['onAdd']();
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('Separated checkbox same-day behaviour', () => {
    const separatedControl = () => component['form'].get('separated')!;

    it('should disable and uncheck separated when the range spans a single day', () => {
      separatedControl().setValue(true);

      component['form'].get('dateRange')!.setValue({
        beginDate: new Date(2026, 0, 15),
        endDate: new Date(2026, 0, 15),
      });

      expect(separatedControl().disabled).toBe(true);
      expect(separatedControl().value).toBe(false);
    });

    it('should enable separated when the range spans multiple days', () => {
      // Start from a disabled state caused by a same-day range.
      component['form'].get('dateRange')!.setValue({
        beginDate: new Date(2026, 0, 15),
        endDate: new Date(2026, 0, 15),
      });
      expect(separatedControl().disabled).toBe(true);

      component['form'].get('dateRange')!.setValue({
        beginDate: new Date(2026, 0, 15),
        endDate: new Date(2026, 0, 20),
      });

      expect(separatedControl().disabled).toBe(false);
    });

    it('should keep separated enabled when the range is incomplete', () => {
      component['form'].get('dateRange')!.setValue({
        beginDate: new Date(2026, 0, 15),
        endDate: undefined,
      });

      expect(separatedControl().disabled).toBe(false);
    });

    it('should submit broken as false for a same-day range even if previously checked', () => {
      separatedControl().setValue(true);
      component['form'].patchValue({
        dateRange: {
          beginDate: new Date(2026, 0, 15),
          endDate: new Date(2026, 0, 15),
        },
        fromTime: '09:30',
        toTime: '17:45',
      });

      component['onAdd']();

      const resultArg = mockDialogRef.close.mock.calls[0][0] as RestrictionTimeSlots;
      expect(resultArg.broken).toBe(false);
    });

    it('should disable and reset separated in edit mode when the initial range is a single day', async () => {
      const sameDaySlot: RestrictionTimeSlots = {
        beginDate: '2026-01-15',
        endDate: '2026-01-15',
        fromTime: '09:30',
        toTime: '17:45',
        broken: true,
      };

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [AddTimeSlotDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: { initialValue: sameDaySlot } },
          { provide: TranslationsService, useValue: mockTranslationsService },
          { provide: ConfigDataService, useValue: mockConfigDataService },
        ],
      }).compileComponents();

      const newFixture = TestBed.createComponent(AddTimeSlotDialogComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      const separated = newComponent['form'].get('separated')!;
      expect(separated.disabled).toBe(true);
      expect(separated.value).toBe(false);
    });
  });

  describe('Project period validation (dateRangePickerConfig)', () => {
    let mockConfigDataService: any;

    beforeEach(() => {
      mockConfigDataService = {
        getSelectedProjectPeriod: jest.fn(() => ({})),
      };
    });

    it('should expose the project period resolved by the config service', async () => {
      const minDate = new Date(2026, 0, 1);
      const maxDate = new Date(2026, 11, 31);
      mockConfigDataService.getSelectedProjectPeriod.mockReturnValue({ minDate, maxDate });

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [AddTimeSlotDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: {} },
          { provide: TranslationsService, useValue: mockTranslationsService },
          { provide: ConfigDataService, useValue: mockConfigDataService },
        ],
      }).compileComponents();

      const newFixture = TestBed.createComponent(AddTimeSlotDialogComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      const config = newComponent['dateRangePickerConfig']();
      expect(mockConfigDataService.getSelectedProjectPeriod).toHaveBeenCalled();
      expect(config.minDate).toBe(minDate);
      expect(config.maxDate).toBe(maxDate);
    });

    it('should expose empty bounds when the config service returns none', async () => {
      mockConfigDataService.getSelectedProjectPeriod.mockReturnValue({});

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [AddTimeSlotDialogComponent, NoopAnimationsModule],
        providers: [
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: {} },
          { provide: TranslationsService, useValue: mockTranslationsService },
          { provide: ConfigDataService, useValue: mockConfigDataService },
        ],
      }).compileComponents();

      const newFixture = TestBed.createComponent(AddTimeSlotDialogComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      const config = newComponent['dateRangePickerConfig']();
      expect(config.minDate).toBeUndefined();
      expect(config.maxDate).toBeUndefined();
    });
  });
});
