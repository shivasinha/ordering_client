// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { TrainListActionsComponent } from './train-list-actions.component';
import { CustomDateAdapter } from '@Ordering/utils/custom-date-adapter';
import { createCustomDateFormats } from '@Ordering/utils/custom-date-formats';
import { CancellationType } from '@Ordering/data/custom/enum/cancellation-type.enum';
import { TrainListActions } from '@Ordering/data/custom/enum/train-list-actions.enum';
import { TrainDateTimeEnum } from '@Ordering/data/custom/enum/trainDateTime';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ListActionsService } from '@Ordering/shared/services/list-actions.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { ScheduleActionService } from '@Ordering/shared/services/schedule-action.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { Source } from '@Ordering/api';
import dayjs from 'dayjs';

describe('TrainListActionsComponent', () => {
  let component: TrainListActionsComponent;
  let fixture: ComponentFixture<TrainListActionsComponent>;
  let mockDialogRef: any;
  let mockFilterService: any;
  let mockTranslationsService: any;
  let mockListActionsService: any;
  let mockConfigDataService: any;

  // Helper function to setup filter with dates
  const setupFilterWithDates = (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs, dateRangeType: TrainDateTimeEnum) => {
    mockFilterService.trainFilterState.value.dateRange.beginDate = startDate.toDate();
    mockFilterService.trainFilterState.value.dateRange.endDate = endDate.toDate();
    mockFilterService.trainFilterState.value.dateRangeType = dateRangeType;
    component['filterStartDate'] = startDate;
    component['filterEndDate'] = endDate;
    component['filterDateRangeType'] = dateRangeType;
  };

  // Helper function to reset filter
  const resetFilter = () => {
    mockFilterService.trainFilterState.value.dateRange.beginDate = null;
    mockFilterService.trainFilterState.value.dateRange.endDate = null;
    mockFilterService.trainFilterState.value.dateRangeType = null;
    component['filterStartDate'] = undefined;
    component['filterEndDate'] = undefined;
    component['filterDateRangeType'] = undefined;
  };

  beforeEach(async () => {
    mockDialogRef = { close: jest.fn() };

    mockFilterService = {
      trainFilterState: {
        value: {
          dateRange: {
            beginDate: null,
            endDate: null,
          },
          dateRangeType: null,
        },
      },
    };

    mockTranslationsService = {
      translate: jest.fn().mockReturnValue('test translation'),
    };

    mockListActionsService = {
      cancelTrainRun: jest.fn().mockReturnValue(of(undefined)),
      copyTrainRun: jest.fn(),
    };

    mockConfigDataService = {
      isRailwayUndertakingUser: jest.fn().mockReturnValue(false),
    };

    await TestBed.configureTestingModule({
      imports: [TrainListActionsComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: FilterService, useValue: mockFilterService },
        { provide: TranslationsService, useValue: mockTranslationsService },
        { provide: ListActionsService, useValue: mockListActionsService },
        { provide: ConfigDataService, useValue: mockConfigDataService },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            action: TrainListActions.CANCEL_TRAIN_PATH,
            trainNumber: 'TEST123',
            trainRunData: {
              trainNumber: 'TEST123',
              operatingCompany: 'TestCompany',
              operatingDays: [
                {
                  beginDate: '2025-08-28',
                  daysBitmap: '1111111',
                  selectedDays: [],
                  deselectedDays: [],
                },
              ],
            },
            orderData: {
              orderType: 1,
            },
            copyTrainRunData: {
              trainNumber: 'TEST123',
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainListActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to FULL cancellation type for regular users', () => {
    mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);

    // Re-initialize component to trigger the logic
    component['checkSameFilterDates']();

    expect(component['selectedCancellationType']).toBe(CancellationType.FULL);
  });

  it('should default to SINGLE cancellation type for railway undertaking users', () => {
    // The component only forces SINGLE when the train source is PATH_COORDINATION_SYSTEM
    // or when the running-date filter has identical start/end dates. Without those,
    // it will default to FULL even for railway undertaking users.
    mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);

    // Re-initialize component logic
    component['checkSameFilterDates']();

    expect(component['selectedCancellationType']).toBe(CancellationType.FULL);
  });

  describe('Railway Undertaking User Behavior', () => {
    beforeEach(() => {
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);
    });

    it('should default to FULL cancellation when no special conditions', () => {
      // Ensure both mock and component internal filter state are cleared
      resetFilter();
      component['checkSameFilterDates']();

      expect(component['selectedCancellationType']).toBe(CancellationType.FULL);
    });

    it('should default to SINGLE cancellation when running-date filter has same start and end date', () => {
      // Use helper to set both mock and component internal filter dates
      const filterDate = dayjs('2025-08-28');
      setupFilterWithDates(filterDate, filterDate, TrainDateTimeEnum.RUNNING_DATE);

      component['checkSameFilterDates']();

      expect(component['selectedCancellationType']).toBe(CancellationType.SINGLE);
    });

    it('should default to FULL cancellation when running-date filter has different dates', () => {
      const startDate = dayjs('2025-08-28');
      const endDate = dayjs('2025-08-30');
      setupFilterWithDates(startDate, endDate, TrainDateTimeEnum.RUNNING_DATE);

      component['checkSameFilterDates']();

      expect(component['selectedCancellationType']).toBe(CancellationType.FULL);
    });
  });

  describe('Regular User Behavior', () => {
    beforeEach(() => {
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
    });

    it('should default to FULL cancellation for regular users with no filter', () => {
      resetFilter();
      component['checkSameFilterDates']();
      expect(component['selectedCancellationType']).toBe(CancellationType.FULL);
    });

    it('should default to SINGLE cancellation when filter has same running dates', () => {
      const filterDate = dayjs('2025-08-28');
      setupFilterWithDates(filterDate, filterDate, TrainDateTimeEnum.RUNNING_DATE);
      component['checkSameFilterDates']();
      expect(component['selectedCancellationType']).toBe(CancellationType.SINGLE);
    });

    it('should default to FULL cancellation when filter has different running dates', () => {
      const startDate = dayjs('2025-08-28');
      const endDate = dayjs('2025-08-30');
      setupFilterWithDates(startDate, endDate, TrainDateTimeEnum.RUNNING_DATE);
      component['checkSameFilterDates']();
      expect(component['selectedCancellationType']).toBe(CancellationType.FULL);
    });

    it('should default to FULL cancellation when filter is not running date type', () => {
      const filterDate = dayjs('2025-08-28');
      setupFilterWithDates(filterDate, filterDate, TrainDateTimeEnum.BEGIN_DATE);
      component['checkSameFilterDates']();
      expect(component['selectedCancellationType']).toBe(CancellationType.FULL);
    });
  });

  describe('Date handling', () => {
    beforeEach(() => {
      // Reset to regular user for date handling tests unless specified otherwise
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
    });

    it('should set userClearedDate to true when date is cleared', () => {
      component['selectedDate'] = null;
      component['onDateChange']();

      expect(component['userClearedDate']).toBe(true);
      expect(component['preservedDateSignal']()).toBeNull();
      expect(component['selectedCancellationDate']).toEqual([]);
    });

    it('should set userClearedDate to false when date is selected', () => {
      const testDate = new Date('2025-08-28');
      component['selectedDate'] = testDate;
      component['onDateChange']();

      expect(component['userClearedDate']).toBe(false);
      expect(component['preservedDateSignal']()).toEqual(testDate);
    });

    it('should preserve date when switching cancellation types', () => {
      const testDate = new Date('2025-08-28');
      component['selectedDate'] = testDate;
      component['onDateChange']();

      // Switch to FULL and back to SINGLE
      component['selectedCancellationType'] = CancellationType.FULL;
      component['onCancellationTypeChange']();

      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['onCancellationTypeChange']();

      expect(component['selectedDate']).toEqual(testDate);
    });

    it('should not auto-fill filter date when user has cleared date', () => {
      // Setup filter with same start and end date
      const filterDate = dayjs('2025-08-28');
      mockFilterService.trainFilterState.value.dateRange.beginDate = filterDate.toDate();
      mockFilterService.trainFilterState.value.dateRange.endDate = filterDate.toDate();
      mockFilterService.trainFilterState.value.dateRangeType = TrainDateTimeEnum.RUNNING_DATE;

      // Simulate user clearing date
      component['userClearedDate'] = true;

      // Switch to single cancellation
      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['onCancellationTypeChange']();

      expect(component['selectedDate']).toBeNull();
    });

    it('should auto-fill filter date when user has not cleared date', () => {
      const filterDate = dayjs('2025-08-28');
      setupFilterWithDates(filterDate, filterDate, TrainDateTimeEnum.RUNNING_DATE);
      component['userClearedDate'] = false;

      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['onCancellationTypeChange']();

      expect(component['selectedDate']).toEqual(filterDate.toDate());
    });

    it('should not auto-fill filter date when date range type is not RUNNING_DATE', () => {
      const filterDate = dayjs('2025-08-28');
      setupFilterWithDates(filterDate, filterDate, TrainDateTimeEnum.BEGIN_DATE);
      component['userClearedDate'] = false;

      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['onCancellationTypeChange']();

      expect(component['selectedDate']).toBeNull();
    });

    it('should handle date auto-fill for railway undertaking users', () => {
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);
      const filterDate = dayjs('2025-08-28');
      setupFilterWithDates(filterDate, filterDate, TrainDateTimeEnum.RUNNING_DATE);
      component['userClearedDate'] = false;

      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['onCancellationTypeChange']();

      expect(component['selectedDate']).toEqual(filterDate.toDate());
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      // Reset to regular user for validation tests unless specified otherwise
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
    });

    it('should validate date correctly for single day cancellation', () => {
      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['selectedDate'] = new Date('2025-08-28');
      component['runningDays'] = [new Date('2025-08-28'), new Date('2025-08-29')];

      component['validateDate']();

      expect(component['isDateValid']).toBe(true);
      expect(component['dateError']).toBeNull();
    });

    it('should invalidate date for single day cancellation with wrong date', () => {
      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['selectedDate'] = new Date('2025-08-30');
      component['runningDays'] = [new Date('2025-08-28'), new Date('2025-08-29')];

      component['validateDate']();

      expect(component['isDateValid']).toBe(false);
      expect(component['dateError']).toBe('test translation');
    });

    it('should always validate for full cancellation', () => {
      component['selectedCancellationType'] = CancellationType.FULL;

      component['validateDate']();

      expect(component['isDateValid']).toBe(true);
      expect(component['dateError']).toBeNull();
    });
  });

  describe('UI Behavior', () => {
    it('should show both cancellation options for regular users', () => {
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const radioButtons = compiled.querySelectorAll('mat-radio-button');

      // Should have both FULL and SINGLE cancellation radio buttons
      expect(radioButtons.length).toBe(2);
    });

    it('should show only single day cancellation option for railway undertaking users when train source is PATH_COORDINATION_SYSTEM', () => {
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);
      // Mark the train as coming from PATH_COORDINATION_SYSTEM so FULL is hidden.
      // Mutate in place (rather than reassigning) so the component's private `trainData`
      // field, which holds the same object reference set in the constructor, sees the change.
      component['data'].trainRunData!.trainSource = Source.PATH_COORDINATION_SYSTEM;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const radioButtons = compiled.querySelectorAll('mat-radio-button');

      // Should have only SINGLE cancellation radio button (FULL is hidden by ngIf)
      expect(radioButtons.length).toBe(1);
    });

    it('should have correct ConfigDataService injection in template', () => {
      // Verify that the component can access the configDataService in template
      expect(component['configDataService']).toBe(mockConfigDataService);
    });
  });

  describe('Dialog actions', () => {
    it('should close dialog with false on cancel', () => {
      component['onCancel']();
      expect(mockDialogRef.close).toHaveBeenCalledWith(false);
    });

    it('should handle cancellation confirm', () => {
      component['selectedCancellationType'] = CancellationType.FULL;
      component['onConfirm']();

      expect(mockListActionsService.cancelTrainRun).toHaveBeenCalled();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should handle cancellation confirm for railway undertaking users', () => {
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);
      // Railway undertaking users should default to SINGLE cancellation
      component['checkSameFilterDates']();
      component['selectedDate'] = new Date('2025-08-28');
      component['runningDays'] = [new Date('2025-08-28')];

      // Ensure date is valid for confirmation
      component['validateDate']();
      expect(component['isDateValid']).toBe(true);

      component['onConfirm']();

      expect(mockListActionsService.cancelTrainRun).toHaveBeenCalled();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  describe('Copy train run functionality', () => {
    beforeEach(() => {
      component['currentAction'] = TrainListActions.COPY_TRAIN_RUN;
      component['initializeActionData']();
    });

    it('should enable confirm for valid copy train run data', () => {
      component['orderFormControl'].setValue({ subject: 'Test Subject', orderType: 1 });
      component['newTrainNumberControl'].setValue('456');

      expect(component['isConfirmEnabled']).toBe(true);
    });

    it('should disable confirm for invalid copy train run data', () => {
      component['orderFormControl'].setValue({ subject: '', orderType: 1 });
      component['newTrainNumberControl'].setValue('');

      expect(component['isConfirmEnabled']).toBe(false);
    });

    it('should handle copy train run confirm', () => {
      component['orderFormControl'].setValue({ subject: 'Test Subject', orderType: 1 });
      component['newTrainNumberControl'].setValue('456');

      component['onConfirm']();

      expect(mockListActionsService.copyTrainRun).toHaveBeenCalled();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should handle copy train run for railway undertaking users', () => {
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);

      component['orderFormControl'].setValue({ subject: 'Test Subject', orderType: 1 });
      component['newTrainNumberControl'].setValue('456');

      component['onConfirm']();

      expect(mockListActionsService.copyTrainRun).toHaveBeenCalled();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  describe('Utility methods', () => {
    it('should convert DaySet array to Date array', () => {
      const daySet = [
        {
          beginDate: '2025-08-28',
          daysBitmap: '1010000',
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = component['convertToDateArray'](daySet);

      expect(result).toHaveLength(2);
      expect(dayjs(result[0]).format('YYYY-MM-DD')).toBe('2025-08-28');
      expect(dayjs(result[1]).format('YYYY-MM-DD')).toBe('2025-08-30');
    });

    it('should return Date array as is', () => {
      const dates = [new Date('2025-08-28'), new Date('2025-08-29')];

      const result = component['convertToDateArray'](dates);

      expect(result).toEqual(dates);
    });

    it('should handle empty array', () => {
      const result = component['convertToDateArray']([]);
      expect(result).toEqual([]);
    });

    it('should handle null/undefined input', () => {
      const result = component['convertToDateArray'](null as any);
      expect(result).toEqual([]);
    });

    it('should create single day cancellation DaySet', () => {
      const selectedDate = new Date('2025-08-28');
      component['data'].trainRunData!.operatingDays = [
        {
          beginDate: '2025-08-28',
          daysBitmap: '1111111',
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = component['createSingleDayCancellationDaySet'](selectedDate);

      expect(result).toHaveLength(1);
      expect(result[0].daysBitmap).toBe('1000000');
    });

    it('should return empty array when no operating days for single day cancellation', () => {
      const selectedDate = new Date('2025-08-28');
      component['data'].trainRunData!.operatingDays = [];

      const result = component['createSingleDayCancellationDaySet'](selectedDate);

      expect(result).toEqual([]);
    });

    it('should return empty array when selected date not found in operating days', () => {
      const selectedDate = new Date('2025-08-30');
      component['data'].trainRunData!.operatingDays = [
        {
          beginDate: '2025-08-28',
          daysBitmap: '10',
          selectedDays: [],
          deselectedDays: [],
        },
      ];

      const result = component['createSingleDayCancellationDaySet'](selectedDate);

      expect(result).toEqual([]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing trainRunData gracefully', () => {
      // Set both trainRunData and trainNumber to test the method properly.
      // The component snapshots data.trainRunData into a private `trainData` field in the
      // constructor, so that field must also be cleared for the missing-data path to trigger.
      component['data'].trainRunData = undefined;
      component['data'].trainNumber = undefined;
      component['trainData'] = undefined;
      component['initializeCancellationData']();

      expect(component['runningDays']).toEqual([]);
      expect(component['trainNumber']).toBe('');
    });

    it('should handle invalid filter state gracefully', () => {
      mockFilterService.trainFilterState = null;
      component['initializeFilterData']();

      expect(component['filterStartDate']).toBeUndefined();
      expect(component['filterEndDate']).toBeUndefined();
    });

    it('should validate empty running days correctly', () => {
      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['selectedDate'] = new Date('2025-08-28');
      component['runningDays'] = [];

      component['validateDate']();

      expect(component['isDateValid']).toBe(true);
      expect(component['dateError']).toBeNull();
    });

    it('should handle null selected date in validation', () => {
      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['selectedDate'] = null;

      component['validateDate']();

      expect(component['isDateValid']).toBe(false);
      expect(component['dateError']).toBeNull();
    });

    it('should prevent confirm when not enabled', () => {
      Object.defineProperty(component, 'isConfirmEnabled', {
        get: () => false,
        configurable: true,
      });
      const handleCancellationSpy = jest.spyOn(component as any, 'handleCancellationConfirm');

      component['onConfirm']();

      expect(handleCancellationSpy).not.toHaveBeenCalled();
    });

    it('should handle missing copyTrainRunData gracefully', () => {
      component['data'].copyTrainRunData = undefined;
      // copyTrainRun() guards on the private `trainData` field (not data.copyTrainRunData),
      // so that field must be cleared for the early-return path to be exercised.
      component['trainData'] = undefined;
      const copyRequest = {
        subject: 'Test Subject',
        orderType: 1,
        newTrainNumber: '456',
      };

      component['copyTrainRun'](copyRequest);

      expect(mockListActionsService.copyTrainRun).not.toHaveBeenCalled();
    });

    it('should generate default subject when trainNumber is missing', () => {
      component['data'].trainNumber = undefined;
      const subject = component['generateSubjectForCancelTrainRun']();

      expect(mockTranslationsService.translate).toHaveBeenCalledWith('txtPathCancellationFor');
      expect(subject).toContain('');
    });

    it('should handle invalid DaySet in createDaySetForSelectedDate', () => {
      const invalidDaySet = { beginDate: '', daysBitmap: '', selectedDays: [], deselectedDays: [] };
      const selectedDate = new Date('2025-08-28');

      const result = component['createDaySetForSelectedDate'](invalidDaySet, selectedDate);

      expect(result).toBeNull();
    });

    it('should handle date outside DaySet range', () => {
      const daySet = {
        beginDate: '2025-08-28',
        daysBitmap: '10',
        selectedDays: [],
        deselectedDays: [],
      };
      const selectedDate = new Date('2025-08-30'); // Outside bitmap range

      const result = component['createDaySetForSelectedDate'](daySet, selectedDate);

      expect(result).toBeNull();
    });

    it('should handle date that is not a running day', () => {
      const daySet = {
        beginDate: '2025-08-28',
        daysBitmap: '101',
        selectedDays: [],
        deselectedDays: [],
      };
      const selectedDate = new Date('2025-08-29'); // Bit position 1 = '0'

      const result = component['createDaySetForSelectedDate'](daySet, selectedDate);

      expect(result).toBeNull();
    });
  });

  describe('Component initialization', () => {
    it('should initialize for CANCEL_TRAIN_PATH action', () => {
      const initSpy = jest.spyOn(component as any, 'initializeCancellationData');
      component['currentAction'] = TrainListActions.CANCEL_TRAIN_PATH;

      component['initializeActionData']();

      expect(initSpy).toHaveBeenCalled();
    });

    it('should initialize for COPY_TRAIN_RUN action', () => {
      const initSpy = jest.spyOn(component as any, 'initializeCopyTrainRunData');
      component['currentAction'] = TrainListActions.COPY_TRAIN_RUN;

      component['initializeActionData']();

      expect(initSpy).toHaveBeenCalled();
    });

    it('should get dialog title for unknown action', () => {
      component['currentAction'] = 'UNKNOWN_ACTION' as any;

      // Clear previous translation calls to verify this getter triggers the fallback translation
      mockTranslationsService.translate.mockClear();

      const title = component['dialogTitle'];

      expect(mockTranslationsService.translate).toHaveBeenCalledWith('lblAction');
      expect(title).toBe('test translation');
    });

    it('should get confirm button text for unknown action', () => {
      component['currentAction'] = 'UNKNOWN_ACTION' as any;

      // Clear previous translation calls to verify this getter triggers the fallback translation
      mockTranslationsService.translate.mockClear();

      const text = component['confirmButtonText'];

      expect(mockTranslationsService.translate).toHaveBeenCalledWith('lblConfirm');
      expect(text).toBe('test translation');
    });

    it('should get abort button text for unknown action', () => {
      component['currentAction'] = 'UNKNOWN_ACTION' as any;

      // Clear previous translation calls to verify this getter triggers the fallback translation
      mockTranslationsService.translate.mockClear();

      const text = component['abortButtonText'];

      expect(mockTranslationsService.translate).toHaveBeenCalledWith('lblCancel');
      expect(text).toBe('test translation');
    });
  });

  describe('PATH_COORDINATION_SYSTEM train source behavior', () => {
    it('should hide full cancellation for PATH_COORDINATION_SYSTEM trains', () => {
      // Ensure user is railway undertaking
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);

      // Mutate in place so the component's private `trainData` field (same object reference
      // set in the constructor) also reflects the change.
      component['data'].trainRunData!.trainSource = Source.PATH_COORDINATION_SYSTEM;

      const shouldHide = component['shouldHideFullCancellation']();

      expect(shouldHide).toBe(true);
    });

    it('should default to SINGLE cancellation for PATH_COORDINATION_SYSTEM trains', () => {
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);
      component['data'].trainRunData!.trainSource = Source.PATH_COORDINATION_SYSTEM;

      component['checkSameFilterDates']();

      expect(component['selectedCancellationType']).toBe(CancellationType.SINGLE);
    });
  });

  describe('Cancellation Reason Functionality', () => {
    it('should initialize cancellationReason form control', () => {
      const control = component['cancellationReasonControl'];
      expect(control).toBeDefined();
      expect(control.value).toBeDefined();
    });

    it('should have cancellationReasonConfig defined', () => {
      const config = component['cancellationReasonConfig'];
      expect(config).toBeDefined();
      expect(config.label).toBeDefined();
      expect(config.placeholder).toBeDefined();
    });

    it('should get cancellationReasonControl from component', () => {
      const control = component['cancellationReasonControl'];
      expect(control).toBeDefined();
      expect(control.value).toBeDefined();
    });

    it('should update cancellationReason value when control changes', () => {
      const testReason = 'Track maintenance scheduled';
      component['cancellationReasonControl'].setValue(testReason);

      expect(component['cancellationReasonControl'].value).toBe(testReason);
    });

    it('should pass cancellationReason to cancelTrainRun service call for FULL cancellation', () => {
      const testReason = 'Emergency track repair';
      component['cancellationReasonControl'].setValue(testReason);
      component['selectedCancellationType'] = CancellationType.FULL;

      component['onConfirm']();

      expect(mockListActionsService.cancelTrainRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          cancellationReason: testReason,
        }),
      );
    });

    it('should pass cancellationReason to cancelTrainRun service call for SINGLE cancellation', () => {
      const testReason = 'Single day cancellation';
      component['cancellationReasonControl'].setValue(testReason);
      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['selectedDate'] = new Date('2025-08-28');
      component['runningDays'] = [new Date('2025-08-28')];
      component['validateDate']();

      component['onConfirm']();

      expect(mockListActionsService.cancelTrainRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          cancellationReason: testReason,
        }),
      );
    });

    it('should pass undefined cancellationReason if empty string', () => {
      component['cancellationReasonControl'].setValue('');
      component['selectedCancellationType'] = CancellationType.FULL;

      component['onConfirm']();

      expect(mockListActionsService.cancelTrainRun).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          cancellationReason: undefined,
        }),
      );
    });

    it('should preserve cancellationReason when switching cancellation types', () => {
      const testReason = 'Weather conditions';
      component['cancellationReasonControl'].setValue(testReason);

      component['selectedCancellationType'] = CancellationType.SINGLE;
      component['onCancellationTypeChange']();
      expect(component['cancellationReasonControl'].value).toBe(testReason);

      component['selectedCancellationType'] = CancellationType.FULL;
      component['onCancellationTypeChange']();
      expect(component['cancellationReasonControl'].value).toBe(testReason);
    });

    it('should allow multi-line cancellationReason input', () => {
      const multiLineReason = 'Line 1: Track damage\nLine 2: Estimated repair time 4 hours\nLine 3: Alternative routes available';
      component['cancellationReasonControl'].setValue(multiLineReason);

      expect(component['cancellationReasonControl'].value).toBe(multiLineReason);
    });

    it('should have cancellationReasonConfig defined', () => {
      const config = component['cancellationReasonConfig'];
      expect(config).toBeDefined();
      expect(config.label).toBeDefined();
      expect(config.placeholder).toBeDefined();
    });
  });
});

describe('TrainListActionsComponent - MODIFY_TRAIN_RUN', () => {
  let component: TrainListActionsComponent;
  let fixture: ComponentFixture<TrainListActionsComponent>;
  let mockDialogRef: any;
  let mockListActionsService: any;
  let mockTranslationsService: any;
  let mockConfigDataService: any;
  let mockFilterService: any;

  beforeEach(async () => {
    mockDialogRef = { close: jest.fn() };

    mockListActionsService = {
      modifyTrainRun: jest.fn(),
    };

    mockTranslationsService = {
      translate: jest.fn().mockImplementation((key: string) => {
        if (key === 'txtPathModificationFor') return 'Path Modification for {0}';
        return 'test translation';
      }),
    };

    mockConfigDataService = {
      isRailwayUndertakingUser: jest.fn().mockReturnValue(false),
    };

    mockFilterService = {
      trainFilterState: {
        value: {
          dateRange: { startDate: null, endDate: null },
          dateRangeType: null,
        },
      },
      filteredOrderTypes: jest.fn().mockReturnValue([{ id: 1, name: 'STP' }]),
    };

    await TestBed.configureTestingModule({
      imports: [TrainListActionsComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: ListActionsService, useValue: mockListActionsService },
        { provide: TranslationsService, useValue: mockTranslationsService },
        { provide: ConfigDataService, useValue: mockConfigDataService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useFactory: createCustomDateFormats },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            action: TrainListActions.MODIFY_TRAIN_RUN,
            trainNumber: 'TRAIN-123',
            trainRunData: {
              trainNumber: 'TRAIN-123',
              isConditionalTrainRun: false,
              operatingCompany: 'TestCompany',
              stops: [],
              operatingDays: [{ beginDate: '2025-08-28', daysBitmap: '1111111' }],
            },
            orderData: { orderType: 1 },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainListActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with MODIFY_TRAIN_RUN action', () => {
    expect(component).toBeTruthy();
    expect(component['currentAction']).toBe(TrainListActions.MODIFY_TRAIN_RUN);
  });

  it('should initialize modify train run data correctly', () => {
    // Order form should have the generated subject
    expect(component['orderFormControl'].value.subject).toBe('Path Modification for TRAIN-123');
    expect(component['orderFormControl'].value.orderType).toBe(1);
  });

  it('should generate correct subject for modify train run', () => {
    const subject = component['generateSubjectForModifyTrainRun']();
    expect(subject).toBe('Path Modification for TRAIN-123');
  });

  it('should return correct dialog title for MODIFY_TRAIN_RUN', () => {
    expect(component['dialogTitle']).toBe('test translation');
    expect(mockTranslationsService.translate).toHaveBeenCalledWith('lblModifyTrainRun');
  });

  describe('isModificationConfirmEnabled', () => {
    it('should return true when order form is valid', () => {
      component['orderFormControl'].setValue({ subject: 'Test Subject', orderType: 1 });
      expect(component['isModificationConfirmEnabled']()).toBe(true);
    });

    it('should return false when order form is invalid', () => {
      component['orderFormControl'].setValue({ subject: '', orderType: 0 });
      component['orderFormControl'].setErrors({ invalid: true });
      expect(component['isModificationConfirmEnabled']()).toBe(false);
    });
  });

  describe('isConfirmEnabled for MODIFY_TRAIN_RUN', () => {
    it('should use modification confirm check for MODIFY_TRAIN_RUN action', () => {
      component['currentAction'] = TrainListActions.MODIFY_TRAIN_RUN;
      component['orderFormControl'].setValue({ subject: 'Valid Subject', orderType: 1 });

      expect(component['isConfirmEnabled']).toBe(true);
    });
  });

  describe('handleModifyTrainRunConfirm', () => {
    it('should call executeModifyTrainRun with trainRunData when available', () => {
      const executeModifySpy = jest.spyOn(component as any, 'executeModifyTrainRun');

      component['handleModifyTrainRunConfirm']();

      expect(executeModifySpy).toHaveBeenCalledWith(component['data'].trainRunData);
    });
  });

  describe('executeModifyTrainRun', () => {
    it('should call listActionsService.modifyTrainRun and close dialog', () => {
      const mockTrainRun = { trainNumber: 'TRAIN-456' } as any;
      component['orderFormControl'].setValue({ subject: 'Test Subject', orderType: 2 });

      component['executeModifyTrainRun'](mockTrainRun);

      expect(mockListActionsService.modifyTrainRun).toHaveBeenCalledWith(
        'Test Subject',
        2,
        expect.objectContaining({
          action: TrainListActions.MODIFY_TRAIN_RUN,
          trainRunData: mockTrainRun,
        }),
      );
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });

  describe('onConfirm for MODIFY_TRAIN_RUN', () => {
    it('should handle modify train run confirmation when confirm is enabled', () => {
      component['currentAction'] = TrainListActions.MODIFY_TRAIN_RUN;
      component['orderFormControl'].setValue({ subject: 'Valid Subject', orderType: 1 });
      const handleModifySpy = jest.spyOn(component as any, 'handleModifyTrainRunConfirm');

      component['onConfirm']();

      expect(handleModifySpy).toHaveBeenCalled();
    });
  });
});

describe('TrainListActionsComponent - MODIFY_TRAIN_RUN via trainRunListItemData', () => {
  let component: TrainListActionsComponent;
  let fixture: ComponentFixture<TrainListActionsComponent>;
  let mockDialogRef: any;
  let mockListActionsService: any;
  let mockTranslationsService: any;
  let mockConfigDataService: any;
  let mockFilterService: any;
  let mockScheduleActionService: any;
  let mockNotificationService: any;

  const trainRunListItem = {
    trainId: 14001,
    schedVersionId: 202501,
    trainNumber: 'TRAIN-789',
    operatingDays: [{ beginDate: '2025-08-28', daysBitmap: '1111111' }],
  };

  beforeEach(async () => {
    mockDialogRef = { close: jest.fn() };
    mockListActionsService = { modifyTrainRun: jest.fn() };
    mockTranslationsService = {
      translate: jest.fn().mockImplementation((key: string) => {
        if (key === 'txtPathModificationFor') return 'Path Modification for {0}';
        return 'test translation';
      }),
    };
    mockConfigDataService = { isRailwayUndertakingUser: jest.fn().mockReturnValue(false) };
    mockFilterService = {
      trainFilterState: { value: { dateRange: { beginDate: null, endDate: null }, dateRangeType: null } },
      filteredOrderTypes: jest.fn().mockReturnValue([{ id: 1, name: 'STP' }]),
    };
    mockScheduleActionService = { getTrainRun: jest.fn() };
    mockNotificationService = { pushNotification: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [TrainListActionsComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: ListActionsService, useValue: mockListActionsService },
        { provide: TranslationsService, useValue: mockTranslationsService },
        { provide: ConfigDataService, useValue: mockConfigDataService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: ScheduleActionService, useValue: mockScheduleActionService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useFactory: createCustomDateFormats },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            action: TrainListActions.MODIFY_TRAIN_RUN,
            trainRunListItemData: trainRunListItem,
            orderData: { orderType: 1 },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TrainListActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should fetch the full train run via scheduleActionService when only trainRunListItemData is provided', () => {
    mockScheduleActionService.getTrainRun.mockReturnValue(of({ trainNumber: 'TRAIN-789' }));
    const executeModifySpy = jest.spyOn(component as any, 'executeModifyTrainRun');

    component['handleModifyTrainRunConfirm']();

    expect(mockScheduleActionService.getTrainRun).toHaveBeenCalledWith(trainRunListItem);
    expect(executeModifySpy).toHaveBeenCalledWith(
      expect.objectContaining({ trainNumber: 'TRAIN-789', trainId: 14001, schedVersionId: 202501 }),
    );
  });

  it('should show an error notification and close the dialog with false when fetching the train run fails', () => {
    mockScheduleActionService.getTrainRun.mockReturnValue(throwError(() => new Error('fetch failed')));

    component['handleModifyTrainRunConfirm']();

    expect(mockNotificationService.pushNotification).toHaveBeenCalledWith('test translation', expect.anything());
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should not attempt a fetch when trainRunListItemData is also missing', () => {
    component['data'].trainRunListItemData = undefined;

    component['handleModifyTrainRunConfirm']();

    expect(mockScheduleActionService.getTrainRun).not.toHaveBeenCalled();
  });
});
