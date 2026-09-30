// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { OperatingDaysDialogData } from '@Ordering/portalComponents/operating-days/operating-days.model';
import { DialogAction } from '@Ordering/data/custom/enum/dialog-action.enum';
import { OperatingDaysCalculationService } from '@Ordering/portalComponents/operating-days/operating-days-calculation.service';
import { provideDayjsDateAdapter } from '@Ordering/utils/dayjs-date-adapter-provider';
import { OperatingDaysDialogComponent } from './operating-days-dialog.component';
import { createMockTranslationsService } from '@Ordering/test-utils/translations-service-mock';

describe('OperatingDaysDialogComponent', () => {
  let component: OperatingDaysDialogComponent;
  let fixture: ComponentFixture<OperatingDaysDialogComponent>;
  let dialogRef: MatDialogRef<OperatingDaysDialogComponent>;
  let operatingDaysCalculationService: jest.Mocked<OperatingDaysCalculationService>;
  let dialogDataToAdd: OperatingDaysDialogData;

  beforeEach(async () => {
    dialogDataToAdd = {
      id: 1,
      daysBitmap: '0110101011010101101010110101011',
      action: DialogAction.ADD,
      beginDate: '2025-03-01',
      endDate: '2025-03-31',
      selectedDays: [1, 3, 5, 7], // Mon, Wed, Fri, Sun
      deselectedDays: [9, 10], // Weekend, Holiday
      isSubsetMode: false,
      parentOperatingDays: [],
    };

    const mockOperatingDaysCalculationService = {
      isSubsetModeSig: signal(false),
      generateBitmap: jest.fn().mockReturnValue('1010101'),
      generateCalendarDisplayData: jest.fn().mockReturnValue({ months: [], allDaysNames: [] }),
      validateBitmapSubset: jest.fn().mockReturnValue({ isValid: true }),
      combineOperatingDays: jest.fn().mockReturnValue({ daysBitmap: '', beginDate: '' }),
    };

    await TestBed.configureTestingModule({
      imports: [OperatingDaysDialogComponent, BrowserAnimationsModule, NoopAnimationsModule, HttpClientTestingModule],
      declarations: [],
      providers: [
        provideDayjsDateAdapter(),
        { provide: MatDialogRef, useValue: { close: jest.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: dialogDataToAdd },
        { provide: TranslationsService, useValue: createMockTranslationsService() },
        { provide: OperatingDaysCalculationService, useValue: mockOperatingDaysCalculationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OperatingDaysDialogComponent);
    component = fixture.componentInstance;
    dialogRef = TestBed.inject(MatDialogRef);
    operatingDaysCalculationService = TestBed.inject(OperatingDaysCalculationService) as jest.Mocked<OperatingDaysCalculationService>;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clears all mocks
    jest.clearAllTimers(); // Clears all timers
    jest.restoreAllMocks(); // Restores original implementation of mocked functions
    TestBed.resetTestingModule();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with dialog data', () => {
    expect(component.form.value.dateRange?.beginDate).toEqual(new Date(dialogDataToAdd.beginDate));
    expect(component.form.value.dateRange?.endDate).toEqual(new Date(dialogDataToAdd.endDate));
    expect(component.form.value.selectedDays).toEqual(dialogDataToAdd.selectedDays);
    expect(component.form.value.deselectedDays).toEqual(dialogDataToAdd.deselectedDays);
  });

  it('should return correct dialog title based on action', () => {
    expect(component.dialogTitle).toBe('translated_lblAddOperatingDays');
  });

  it('should return correct action name based on action', () => {
    expect(component.actionName).toBe('translated_lblApply');
  });

  it('should toggle selection correctly', () => {
    component.toggleSelection(1); // Monday
    const selectedDays = component.form.value.selectedDays;
    expect(selectedDays).not.toContain(1);

    component.toggleSelection(1); // Monday
    const updatedSelectedDays = component.form.value.selectedDays;
    expect(updatedSelectedDays).toContain(1);
  });

  it('should toggle deselection correctly', () => {
    component.toggleSelection(9, true); // Weekend
    const deselectedDays = component.form.value.deselectedDays;
    expect(deselectedDays).not.toContain(9);

    component.toggleSelection(9, true); // Weekend
    const updatedDeselectedDays = component.form.value.deselectedDays;
    expect(updatedDeselectedDays).toContain(9);
  });

  it('should determine if a day is disabled in selection', () => {
    expect(component.isDisabledInSelection(9)).toBe(true); // Weekend is deselected
    expect(component.isDisabledInSelection(1)).toBe(false); // Monday is not deselected
  });

  it('should determine if a day is disabled in deselection', () => {
    expect(component.isDisabledInDeselection(1)).toBe(true); // Monday is selected
    expect(component.isDisabledInDeselection(2)).toBe(false); // Tuesday is not selected
  });

  it('should determine if date range is selected', () => {
    expect(component.isDateRangeSelected()).toBe(true);
    component.formValues.set({ range: { beginDate: '', endDate: '' } });
    expect(component.isDateRangeSelected()).toBe(false);
  });

  it('should generate correct bitmap using calculation service', () => {
    // The bitmap generation is now handled by the calculation service
    const bitmap = component.generatedBitmap();
    expect(operatingDaysCalculationService.generateBitmap).toHaveBeenCalled();
    expect(bitmap).toBeTruthy();
  });

  it('should check if bitmap is empty', () => {
    // Test with empty bitmap
    operatingDaysCalculationService.generateBitmap.mockReturnValue('0000000');
    component.formValues.set({
      dateRange: {
        beginDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
      },
      selectedDays: [1],
      deselectedDays: [],
    });

    expect(component.isBitmapEmpty()).toBe(true);

    // Test with non-empty bitmap
    operatingDaysCalculationService.generateBitmap.mockReturnValue('1010101');
    component.formValues.set({
      dateRange: {
        beginDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07'),
      },
      selectedDays: [1],
      deselectedDays: [],
    });

    expect(component.isBitmapEmpty()).toBe(false);
  });

  it('should validate canSave correctly', () => {
    // Set up valid form state
    component.form.patchValue({
      dateRange: { beginDate: '2024-01-01', endDate: '2024-01-07' },
      selectedDays: [1, 3, 5],
      deselectedDays: [],
    });
    component.formValues.set(component.form.value);

    // Mock valid bitmap
    operatingDaysCalculationService.generateBitmap.mockReturnValue('1010101');

    const canSave = component.canSave();
    expect(canSave).toBe(true);
  });

  it('should not allow save when bitmap is empty', () => {
    // Set up form state but with empty bitmap
    component.form.patchValue({
      dateRange: { beginDate: '2024-01-01', endDate: '2024-01-07' },
      selectedDays: [1],
      deselectedDays: [],
    });
    component.formValues.set(component.form.value);

    // Mock empty bitmap
    operatingDaysCalculationService.generateBitmap.mockReturnValue('0000000');

    const canSave = component.canSave();
    expect(canSave).toBe(false);
  });

  it('should generate calendar display data when date range is valid', () => {
    component.form.patchValue({
      dateRange: { beginDate: '2024-01-01', endDate: '2024-01-07' },
      selectedDays: [1],
      deselectedDays: [],
    });
    component.formValues.set(component.form.value);

    expect(operatingDaysCalculationService.generateCalendarDisplayData).toHaveBeenCalled();
  });

  it('should not generate calendar display data when date range is invalid', () => {
    // Reset mock call counts
    jest.clearAllMocks();

    component.formValues.set({ range: { beginDate: '', endDate: '' } });

    const calendarData = component.calendarDisplayData();
    expect(calendarData.months).toEqual([]);
    expect(operatingDaysCalculationService.generateCalendarDisplayData).not.toHaveBeenCalled();
  });

  it('should save and close dialog with correct data', () => {
    // Mock the generated bitmap
    operatingDaysCalculationService.generateBitmap.mockReturnValue('1010101');

    const spy = jest.spyOn(dialogRef, 'close');
    component.saveAndClose();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        beginDate: dialogDataToAdd.beginDate,
        daysBitmap: expect.any(String),
        selectedDays: expect.any(Array),
        deselectedDays: expect.any(Array),
      }),
    );
  });

  it('should return true if beginDate is before or equal to endDate', () => {
    component.formValues.set({ dateRange: { beginDate: new Date('2025-03-01'), endDate: new Date('2025-03-31') } });
    expect(component.isValidDateRangeSig()).toBe(true);

    component.formValues.set({ dateRange: { beginDate: new Date('2025-03-01'), endDate: new Date('2025-03-01') } });
    expect(component.isValidDateRangeSig()).toBe(true);
  });

  it('should return false if beginDate is after endDate', () => {
    component.formValues.set({ dateRange: { beginDate: new Date('2025-03-31'), endDate: new Date('2025-03-01') } });
    expect(component.isValidDateRangeSig()).toBe(false);
  });

  it('should return false if beginDate or endDate is undefined', () => {
    component.formValues.set({ dateRange: { beginDate: undefined, endDate: new Date('2025-03-31') } });
    expect(component.isValidDateRangeSig()).toBe(false);

    component.formValues.set({ dateRange: { beginDate: new Date('2025-03-01'), endDate: undefined } });
    expect(component.isValidDateRangeSig()).toBe(false);

    component.formValues.set({ dateRange: { beginDate: undefined, endDate: undefined } });
    expect(component.isValidDateRangeSig()).toBe(false);
  });

  it('should use raw date values without formatting in saveAndClose', () => {
    // Set up form with specific date values
    component.form.patchValue({
      dateRange: { beginDate: new Date('2024-01-15'), endDate: new Date('2024-01-20') },
      selectedDays: [1, 3],
      deselectedDays: [2],
    });

    // Mock the generated bitmap
    operatingDaysCalculationService.generateBitmap.mockReturnValue('1010101');

    const spy = jest.spyOn(dialogRef, 'close');
    component.saveAndClose();

    // Verify that raw date values are used without any formatting
    expect(spy).toHaveBeenCalledWith({
      beginDate: '2024-01-15',
      daysBitmap: '1010101',
      selectedDays: [1, 3],
      deselectedDays: [2],
    });
  });

  it('should handle form with fallback date when beginDate is missing', () => {
    // Set up form with missing beginDate but ensure other conditions are met
    component.form.patchValue({
      dateRange: { beginDate: '', endDate: new Date('2024-01-20') },
      selectedDays: [1],
      deselectedDays: [],
    });

    // Update formValues to trigger the computed property
    component.formValues.set({
      dateRange: { beginDate: '', endDate: new Date('2024-01-20') },
      selectedDays: [1],
      deselectedDays: [],
    });

    // Mock the generated bitmap - but the bitmap will still be empty because canGenerateBitmap will be false
    // when beginDate is empty. So let's test the actual behavior - that it uses a fallback date
    operatingDaysCalculationService.generateBitmap.mockReturnValue('1000000');

    const spy = jest.spyOn(dialogRef, 'close');
    component.saveAndClose();

    // Verify that fallback ISO string is used for beginDate and daysBitmap is empty since
    // canGenerateBitmap returns false with empty beginDate
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        beginDate: expect.any(String), // Should be an ISO string from new Date().toISOString()
        daysBitmap: '', // Will be empty because canGenerateBitmap() returns false
        selectedDays: [1],
        deselectedDays: [],
      }),
    );

    // Verify the beginDate is actually YYYY-MM-DD format
    const callArgs = spy.mock.calls[0][0];
    expect(callArgs.beginDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should compare raw date values directly in form validation without formatting', () => {
    // Set up initial dialog data
    dialogDataToAdd.beginDate = '2024-06-01';
    dialogDataToAdd.endDate = '2024-06-30';

    // Re-initialize component with updated dialog data
    component.ngOnInit();

    // Set form values that are exactly the same as original (should not be considered changed)
    component.formValues.set({
      dateRange: { beginDate: new Date('2024-06-01'), endDate: new Date('2024-06-30') },
      selectedDays: dialogDataToAdd.selectedDays,
      deselectedDays: dialogDataToAdd.deselectedDays,
    });

    // Since we don't have direct access to hasDateChanged, we test through form validation
    // The form should be valid when dates haven't changed
    expect(component.form.valid).toBe(true);

    // Now change the date slightly
    component.formValues.set({
      dateRange: { beginDate: new Date('2024-06-02'), endDate: new Date('2024-06-30') }, // Changed beginDate
      selectedDays: dialogDataToAdd.selectedDays,
      deselectedDays: dialogDataToAdd.deselectedDays,
    });

    // The date range should still be considered valid (different test from hasDateChanged)
    expect(component.isValidDateRangeSig()).toBe(true);
  });
});
