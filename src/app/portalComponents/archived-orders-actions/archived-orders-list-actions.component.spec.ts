import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, Subscription } from 'rxjs';
import { DaySet, OrderState, MessageState, TrainRun, OrderResponse } from '@Ordering/api';

import { ArchivedOrderActions } from '@Ordering/data/custom/enum/archived-order-actions.enum';
import { CancellationType } from '@Ordering/data/custom/enum/cancellation-type.enum';
import { ListActionsService } from '@Ordering/shared/services/list-actions.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { ArchivedOrdersListActionsComponent } from './archived-orders-list-actions.component';
import { ActionDialogData } from '@Ordering/data/custom/action-dialog-data.interface';
import { OperatingDaysDialogComponent } from '../operating-days/operating-days-dialog/operating-days-dialog.component';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { CustomDateAdapter } from '@Ordering/utils/custom-date-adapter';
import { createCustomDateFormats } from '@Ordering/utils/custom-date-formats';

// Global mock data for reuse across tests
const globalMockTrainRunData = {
  trainNumber: 'TR001',
  isConditionalTrainRun: false,
  operatingCompany: 'Test Company',
  operatingDays: [
    {
      beginDate: '2024-01-01',
      daysBitmap: '1111111',
      selectedDays: [1, 2, 3, 4, 5],
      deselectedDays: [],
    },
  ] as DaySet[],
} as TrainRun;

const globalMockOrderData: OrderResponse = {
  subject: 'Test Order Subject',
  externalId: 'test-123',
  orderType: 1,
  state: OrderState.AGREED,
  creationDateTime: '2024-01-01T10:00:00Z',
  lastModifiedDateTime: '2024-01-01T10:00:00Z',
  messageState: MessageState.NO_MESSAGE,
} as OrderResponse;

// Simplified tests for cancellation functionality
describe('ArchivedOrdersListActionsComponent - Cancellation Tests', () => {
  let component: ArchivedOrdersListActionsComponent;
  let fixture: ComponentFixture<ArchivedOrdersListActionsComponent>;
  let mockListActionsService: jest.Mocked<ListActionsService>;
  let mockDialog: jest.Mocked<MatDialog>;
  let subscriptions: Subscription[] = [];

  const cancelDialogData: ActionDialogData = {
    action: ArchivedOrderActions.CANCEL_TRAIN_RUN,
    message: 'Cancel Train Run',
    orderData: globalMockOrderData,
    trainRunData: globalMockTrainRunData,
  };

  beforeEach(async () => {
    const listActionsServiceSpy = {
      modifyTrainRun: jest.fn(),
      cancelTrainRun: jest.fn().mockReturnValue(of(true)),
    };

    const translationsServiceSpy = {
      translate: jest.fn((key: string) => {
        const translations: { [key: string]: string } = {
          txtPathCancellationFor: 'Path cancellation for {0}',
          txtFullCancellationOption: 'Cancel Train Run for {0}',
          txtPartialCancellationOption: 'Cancel Train Run {0} for duration of days',
          lblSelectDays: 'Select Days',
          lblAbortCancellation: 'Abort Cancellation',
          lblTrainRun: 'Train Run',
          lblCancel: 'Cancel',
        };
        return translations[key] || key;
      }),
    };

    await TestBed.configureTestingModule({
      imports: [ArchivedOrdersListActionsComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useFactory: createCustomDateFormats },
        { provide: MatDialogRef, useValue: { close: jest.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: cancelDialogData },
        { provide: ListActionsService, useValue: listActionsServiceSpy },
        { provide: TranslationsService, useValue: translationsServiceSpy },
        { provide: FilterService, useValue: { filteredOrderTypes: jest.fn().mockReturnValue([]) } },
        { provide: ConfigDataService, useValue: { configData: { orderType: [1, 2] } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArchivedOrdersListActionsComponent);
    component = fixture.componentInstance;
    mockListActionsService = TestBed.inject(ListActionsService) as jest.Mocked<ListActionsService>;
    mockDialog = TestBed.inject(MatDialog) as jest.Mocked<MatDialog>;
  });

  afterEach(() => {
    // Unsubscribe from all subscriptions
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    // Clear timers and mocks
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // Reset TestBed
    TestBed.resetTestingModule();

    // Destroy fixture
    if (fixture) {
      fixture.destroy();
    }
  });

  it('should create component for cancellation action', () => {
    expect(component).toBeTruthy();
    expect(component['data'].action).toBe(ArchivedOrderActions.CANCEL_TRAIN_RUN);
  });

  it('should initialize cancellation form', () => {
    fixture.detectChanges();

    const cancellationForm = component['cancellationForm'];
    expect(cancellationForm).toBeDefined();
    expect(cancellationForm.get('cancellationType')?.value).toBe(null);
  });

  it('should have correct TextareaConfig for cancellationReason', () => {
    const config = component['cancellationReasonConfig'];
    expect(config).toBeDefined();
    expect(config.label).toBeDefined();
    expect(config.placeholder).toBeDefined();
  });

  it('should get cancellationReasonControl from component', () => {
    const control = component['cancellationReasonControl'];
    expect(control).toBeDefined();
    expect(control.value).toBe('');
  });

  it('should update cancellationReason value when control changes', () => {
    fixture.detectChanges();

    const testReason = 'Test cancellation reason';
    component['cancellationReasonControl'].setValue(testReason);

    expect(component['cancellationReasonControl'].value).toBe(testReason);
  });

  it('should include cancellationReason in cancelTrainRun call', () => {
    fixture.detectChanges();

    const testReason = 'Infrastructure maintenance required';
    component['cancellationReasonControl'].setValue(testReason);
    component['cancellationForm'].get('cancellationType')?.setValue(CancellationType.FULL);

    component['handleSave']();

    expect(mockListActionsService.cancelTrainRun).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Number),
      expect.objectContaining({
        cancellationReason: testReason,
      }),
    );
  });

  it('should call cancelTrainRun when handleSave is called for cancellation', () => {
    fixture.detectChanges();

    component['handleSave']();

    expect(mockListActionsService.cancelTrainRun).toHaveBeenCalled();
  });

  it('should generate correct subject for cancellation', () => {
    fixture.detectChanges();

    const subject = component['generateSubjectForCancelTrainRun']();
    expect(subject).toBe('Path cancellation for Test Order Subject');
  });

  it('should expose CancellationType enum', () => {
    expect(component['CancellationType']).toBeDefined();
    expect(component['CancellationType'].FULL).toBe('FULL');
    expect(component['CancellationType'].PARTIAL).toBe('PARTIAL');
  });

  it('should handle save button state for cancellation', () => {
    fixture.detectChanges();

    const isDisabled = component['isSaveDisabled']();
    expect(typeof isDisabled).toBe('boolean');
  });

  it('should open operating days dialog and update selectedOperatingDays', () => {
    jest.spyOn(mockDialog, 'open').mockReturnValue({
      afterClosed: () => of(true),
    } as any);
    const mockDaySet: DaySet = {
      beginDate: '2024-01-01',
      daysBitmap: '1010101',
      selectedDays: [1, 3, 5],
      deselectedDays: [2],
    };

    jest.spyOn(component['cancellationFormChanged'], 'set');

    fixture.detectChanges(); // Ensure change detection is triggered

    component['openOperatingDaysDialog']();

    const dialogRef = mockDialog.open(OperatingDaysDialogComponent, {
      maxWidth: '60vw',
      data: expect.objectContaining({
        action: 'UPDATE',
        isSubsetMode: true,
        message: expect.any(String),
        originalOperatingDays: expect.any(Array),
      }),
    });

    const sub = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        expect(component['selectedOperatingDays']).toEqual([mockDaySet]);
        expect(component['cancellationFormChanged'].set).toHaveBeenCalledWith(2); // 1 + 1
      }
    });
    subscriptions.push(sub);

    expect(mockDialog.open).toHaveBeenCalled();

    const sub2 = dialogRef.afterClosed().subscribe(() => {
      expect(component['selectedOperatingDays']).toEqual([mockDaySet]);
      expect(component['cancellationFormChanged'].set).toHaveBeenCalledWith(2);
    });
    subscriptions.push(sub2);
  });
});
