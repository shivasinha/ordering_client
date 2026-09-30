import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ActionDialogService } from './action-dialog.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { TrainListActionsComponent } from '@Ordering/portalComponents/train-list-actions/train-list-actions.component';
import { ArchivedOrdersListActionsComponent } from '@Ordering/portalComponents/archived-orders-actions/archived-orders-list-actions.component';
import { TrainListActions } from '@Ordering/data/custom/enum/train-list-actions.enum';
import { ArchivedOrderActions } from '@Ordering/data/custom/enum/archived-order-actions.enum';
import { ActionDialogData } from '@Ordering/data/custom/action-dialog-data.interface';
import { OrderResponse, TrainRun } from '@Ordering/api';

describe('ActionDialogService', () => {
  let service: ActionDialogService;
  let mockDialog: jest.Mocked<MatDialog>;
  let mockDialogRef: any;
  let mockTranslationsService: jest.Mocked<TranslationsService>;

  const createTestData = (
    action: TrainListActions | ArchivedOrderActions,
    additionalData: Partial<ActionDialogData> = {},
  ): ActionDialogData => ({
    action,
    ...additionalData,
  });

  const setupMockDialogResult = (result: any) => {
    mockDialogRef.afterClosed.mockReturnValue(of(result));
  };

  const expectDialogToBeCalledWith = (component: any, data: ActionDialogData) => {
    const isCancelAction = data.action === ArchivedOrderActions.CANCEL_TRAIN_RUN || data.action === TrainListActions.CANCEL_TRAIN_PATH;
    const expectedConfig = {
      width: isCancelAction ? '700px' : '550px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      autoFocus: false,
      data,
    };
    expect(mockDialog.open).toHaveBeenCalledWith(component, expectedConfig);
  };

  beforeEach(() => {
    mockDialogRef = {
      afterClosed: jest.fn(),
    };

    mockDialog = {
      open: jest.fn().mockReturnValue(mockDialogRef),
    } as any;

    mockTranslationsService = {
      translate: jest.fn().mockImplementation((key: string) => `translated(${key})`),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        ActionDialogService,
        { provide: MatDialog, useValue: mockDialog },
        { provide: TranslationsService, useValue: mockTranslationsService },
      ],
    });

    service = TestBed.inject(ActionDialogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('openActionDialog', () => {
    const testCases = [
      {
        action: TrainListActions.CANCEL_TRAIN_PATH,
        component: TrainListActionsComponent,
        description: 'TrainListActionsComponent for CANCEL_TRAIN_PATH',
        additionalData: { message: 'Test message' },
      },
      {
        action: TrainListActions.COPY_TRAIN_RUN,
        component: TrainListActionsComponent,
        description: 'TrainListActionsComponent for COPY_TRAIN_RUN',
        additionalData: { trainNumber: '123' },
      },
      {
        action: TrainListActions.MODIFY_TRAIN_RUN,
        component: TrainListActionsComponent,
        description: 'TrainListActionsComponent for MODIFY_TRAIN_RUN (trains list flow - no orderData)',
        additionalData: { trainNumber: '999', trainRunListItemData: { trainNumber: '999' } as any },
      },
      {
        action: ArchivedOrderActions.CANCEL_TRAIN_RUN,
        component: ArchivedOrdersListActionsComponent,
        description: 'ArchivedOrdersListActionsComponent for CANCEL_TRAIN_RUN',
        additionalData: { trainNumber: '789' },
      },
      {
        action: ArchivedOrderActions.MODIFY_TRAIN_RUN,
        component: ArchivedOrdersListActionsComponent,
        description: 'ArchivedOrdersListActionsComponent for MODIFY_TRAIN_RUN (archived order flow - with orderData)',
        additionalData: { trainNumber: '456', orderData: { externalId: 'test-order' } as any },
      },
    ];

    testCases.forEach(({ action, component, description, additionalData }) => {
      it(`should open ${description}`, () => {
        const testData = createTestData(action, additionalData);
        const expectedResult = `${action} result`;
        setupMockDialogResult(expectedResult);

        const result = service.openActionDialog(testData);

        expectDialogToBeCalledWith(component, testData);
        expect(result).toBeDefined();
        result.subscribe(res => {
          expect(res).toBe(expectedResult);
        });
      });
    });

    it('should throw error for unknown action type', () => {
      const testData = createTestData('UNKNOWN_ACTION' as any);

      expect(() => {
        service.openActionDialog(testData);
      }).toThrow('Unknown action type: UNKNOWN_ACTION');
    });

    it('should pass through all dialog data properties', () => {
      const testData = createTestData(TrainListActions.CANCEL_TRAIN_PATH, {
        message: 'Test message',
        trainRunData: { id: 1 } as any,
        orderData: { id: 2 } as any,
      });
      setupMockDialogResult(null);

      service.openActionDialog(testData);

      expectDialogToBeCalledWith(TrainListActionsComponent, testData);
    });
  });

  describe('component selection logic', () => {
    const validActionTests = [
      {
        actions: [TrainListActions.CANCEL_TRAIN_PATH, TrainListActions.COPY_TRAIN_RUN, TrainListActions.MODIFY_TRAIN_RUN],
        expectedComponent: TrainListActionsComponent,
        enumName: 'TrainListActions',
      },
      {
        actions: [ArchivedOrderActions.MODIFY_TRAIN_RUN, ArchivedOrderActions.CANCEL_TRAIN_RUN],
        expectedComponent: ArchivedOrdersListActionsComponent,
        enumName: 'ArchivedOrderActions',
        additionalData: { orderData: { externalId: 'test-order' } as any },
      },
    ];

    it('should use TrainListActionsComponent for MODIFY_TRAIN_RUN when orderData is NOT present', () => {
      const testData = createTestData(TrainListActions.MODIFY_TRAIN_RUN, {
        trainRunListItemData: { trainNumber: '123' } as any,
      });
      setupMockDialogResult(null);

      service.openActionDialog(testData);

      expect(mockDialog.open).toHaveBeenCalledWith(TrainListActionsComponent, expect.any(Object));
    });

    it('should use ArchivedOrdersListActionsComponent for MODIFY_TRAIN_RUN when orderData IS present', () => {
      const testData = createTestData(ArchivedOrderActions.MODIFY_TRAIN_RUN, {
        orderData: { externalId: 'parent-order-123' } as any,
        trainRunData: { trainNumber: '123' } as any,
      });
      setupMockDialogResult(null);

      service.openActionDialog(testData);

      expect(mockDialog.open).toHaveBeenCalledWith(ArchivedOrdersListActionsComponent, expect.any(Object));
    });

    validActionTests.forEach(({ actions, expectedComponent, enumName, additionalData }) => {
      actions.forEach(action => {
        it(`should return ${expectedComponent.name} for ${enumName}.${action}`, () => {
          const testData = createTestData(action, additionalData);
          setupMockDialogResult(null);

          service.openActionDialog(testData);

          expect(mockDialog.open).toHaveBeenCalledWith(expectedComponent, expect.any(Object));
        });
      });
    });
  });

  describe('action validation', () => {
    const validActions = [
      TrainListActions.CANCEL_TRAIN_PATH,
      TrainListActions.COPY_TRAIN_RUN,
      TrainListActions.MODIFY_TRAIN_RUN,
      ArchivedOrderActions.CANCEL_TRAIN_RUN,
      ArchivedOrderActions.MODIFY_TRAIN_RUN,
    ];

    validActions.forEach(action => {
      it(`should validate ${action} as a valid action`, () => {
        const testData = createTestData(action);
        setupMockDialogResult(null);

        expect(() => {
          service.openActionDialog(testData);
        }).not.toThrow();
      });
    });

    it('should reject invalid actions', () => {
      const invalidData = createTestData('INVALID_ACTION' as any);

      expect(() => {
        service.openActionDialog(invalidData);
      }).toThrow('Unknown action type: INVALID_ACTION');
    });
  });

  describe('dialog configuration and behavior', () => {
    it('should use default dialog configuration', () => {
      const testData = createTestData(TrainListActions.COPY_TRAIN_RUN); // Use a non-cancel action
      setupMockDialogResult(null);

      service.openActionDialog(testData);

      expect(mockDialog.open).toHaveBeenCalledWith(
        TrainListActionsComponent,
        expect.objectContaining({
          width: '550px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          autoFocus: false,
        }),
      );
    });

    it('should use large dialog configuration for CANCEL_TRAIN_RUN action', () => {
      const testData = createTestData(ArchivedOrderActions.CANCEL_TRAIN_RUN);
      setupMockDialogResult(null);

      service.openActionDialog(testData);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ArchivedOrdersListActionsComponent,
        expect.objectContaining({
          width: '700px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          autoFocus: false,
        }),
      );
    });

    it('should use large dialog configuration for CANCEL_TRAIN_PATH action', () => {
      const testData = createTestData(TrainListActions.CANCEL_TRAIN_PATH);
      setupMockDialogResult(null);

      service.openActionDialog(testData);

      expect(mockDialog.open).toHaveBeenCalledWith(
        TrainListActionsComponent,
        expect.objectContaining({
          width: '700px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          autoFocus: false,
        }),
      );
    });

    it('should return observable from dialog afterClosed', () => {
      const testData = createTestData(TrainListActions.CANCEL_TRAIN_PATH);
      const expectedResult = { result: 'test' };
      setupMockDialogResult(expectedResult);

      const result = service.openActionDialog(testData);

      expect(result).toBeDefined();
      result.subscribe(res => {
        expect(res).toEqual(expectedResult);
      });
    });
  });

  describe('openTrainRunActionDialog', () => {
    const mockOrderData = { externalId: 'order-123' } as OrderResponse;
    const mockTrainRunData = { trainNumber: 'TR-001' } as TrainRun;

    beforeEach(() => {
      mockDialogRef.afterClosed.mockReturnValue(of(true));
    });

    it('should use "lblCancelTrainRun" message for CANCEL_TRAIN_RUN action', () => {
      service.openTrainRunActionDialog(ArchivedOrderActions.CANCEL_TRAIN_RUN, mockOrderData, mockTrainRunData);

      expect(mockTranslationsService.translate).toHaveBeenCalledWith('lblCancelTrainRun');
    });

    it('should use "lblModifyTrainRun" message for MODIFY_TRAIN_RUN action', () => {
      service.openTrainRunActionDialog(ArchivedOrderActions.MODIFY_TRAIN_RUN, mockOrderData, mockTrainRunData);

      expect(mockTranslationsService.translate).toHaveBeenCalledWith('lblModifyTrainRun');
    });

    it('should open dialog with correct data for CANCEL_TRAIN_RUN', () => {
      service.openTrainRunActionDialog(ArchivedOrderActions.CANCEL_TRAIN_RUN, mockOrderData, mockTrainRunData);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ArchivedOrdersListActionsComponent,
        expect.objectContaining({
          data: expect.objectContaining({
            action: ArchivedOrderActions.CANCEL_TRAIN_RUN,
            orderData: mockOrderData,
            trainRunData: mockTrainRunData,
            message: 'translated(lblCancelTrainRun)',
          }),
        }),
      );
    });

    it('should open dialog with correct data for MODIFY_TRAIN_RUN', () => {
      service.openTrainRunActionDialog(ArchivedOrderActions.MODIFY_TRAIN_RUN, mockOrderData, mockTrainRunData);

      expect(mockDialog.open).toHaveBeenCalledWith(
        ArchivedOrdersListActionsComponent,
        expect.objectContaining({
          data: expect.objectContaining({
            action: ArchivedOrderActions.MODIFY_TRAIN_RUN,
            orderData: mockOrderData,
            trainRunData: mockTrainRunData,
            message: 'translated(lblModifyTrainRun)',
          }),
        }),
      );
    });

    it('should return observable from dialog afterClosed', done => {
      const result = service.openTrainRunActionDialog(ArchivedOrderActions.CANCEL_TRAIN_RUN, mockOrderData, mockTrainRunData);

      result.subscribe(res => {
        expect(res).toBe(true);
        done();
      });
    });

    it('should emit undefined when dialog is dismissed', done => {
      mockDialogRef.afterClosed.mockReturnValue(of(undefined));

      const result = service.openTrainRunActionDialog(ArchivedOrderActions.CANCEL_TRAIN_RUN, mockOrderData, mockTrainRunData);

      result.subscribe(res => {
        expect(res).toBeUndefined();
        done();
      });
    });
  });
});
