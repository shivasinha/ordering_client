import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ListActionsService } from './list-actions.service';
import { OrderItemAction, OrderItemType, OrderingService } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { ScheduleActionService } from '@Ordering/shared/services/schedule-action.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { SOURCE_TAB_PARAM } from '@Ordering/shared/services/breadcrumb.service';

describe('ListActionsService', () => {
  let service: ListActionsService;
  let orderingServiceMock: any;
  let orderActionsServiceMock: any;
  let scheduleServiceMock: any;
  let navigationServiceMock: any;
  let loadingSpinnerServiceMock: any;
  let notificationServiceMock: any;
  let translationsServiceMock: any;

  beforeEach(() => {
    orderingServiceMock = {
      createOrderItem: jest.fn(),
      submitOrder: jest.fn(),
      createDraftOrder: jest.fn().mockReturnValue(of({})),
    };

    orderActionsServiceMock = {
      createDraftOrder: jest.fn(),
      createOrderItem: jest.fn(),
      getOrderDetails: jest.fn(),
      deleteDraftOrder: jest.fn(),
    };

    scheduleServiceMock = {
      getTrainRun: jest.fn(),
    };

    navigationServiceMock = {
      navigate: jest.fn(),
      navigateToList: jest.fn(),
      navigateToLogin: jest.fn(),
    };

    loadingSpinnerServiceMock = {
      showSpinner: jest.fn(),
      hideSpinner: jest.fn(),
    };

    notificationServiceMock = {
      pushNotification: jest.fn(),
    };

    translationsServiceMock = {
      translate: jest.fn().mockReturnValue('translated message'),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ListActionsService,
        { provide: OrderingService, useValue: orderingServiceMock },
        { provide: OrderActionsService, useValue: orderActionsServiceMock },
        { provide: ScheduleActionService, useValue: scheduleServiceMock },
        { provide: NavigationService, useValue: navigationServiceMock },
        { provide: LoadingSpinnerService, useValue: loadingSpinnerServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
      ],
    });

    service = TestBed.inject(ListActionsService);
  });

  describe('copyTrainRun', () => {
    it('should copy train run, create draft order and navigate to the new order item', () => {
      const data = { id: 'run-id' } as any;
      const subject = 'New Train Run';
      const orderType = 1;
      const newTrainRunNumber = 'TR-9999';
      const externalId = 'ORD-123';

      const fakeTrainRun = { trainNumber: 'OLD-123', id: 'run-id' };
      const fakeOrderDetails = {
        orderItems: [{ externalId: 'ITEM-1' }],
      };

      orderActionsServiceMock.createDraftOrder.mockReturnValue(of({ externalId }));
      scheduleServiceMock.getTrainRun.mockReturnValue(of({ ...fakeTrainRun }));
      orderActionsServiceMock.createOrderItem.mockReturnValue(of({}));
      orderActionsServiceMock.getOrderDetails.mockReturnValue(of(fakeOrderDetails));

      service.copyTrainRun(data, subject, orderType, newTrainRunNumber);

      expect(orderActionsServiceMock.createDraftOrder).toHaveBeenCalledWith(subject, orderType);
      expect(scheduleServiceMock.getTrainRun).toHaveBeenCalledWith(data);
      expect(orderActionsServiceMock.createOrderItem).toHaveBeenCalledWith(
        externalId,
        expect.objectContaining({
          content: expect.objectContaining({
            type: OrderItemType.TRAIN_RUN,
            action: OrderItemAction.CREATION,
            item: expect.objectContaining({ trainNumber: newTrainRunNumber }),
          }),
        }),
      );
      expect(orderActionsServiceMock.getOrderDetails).toHaveBeenCalledWith(externalId);
      expect(navigationServiceMock.navigate).toHaveBeenCalledWith(['/orders', externalId, 'order-items', 'ITEM-1'], {
        extras: { queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      });
    });
  });

  describe('modifyTrainRun', () => {
    const subject = 'Modify Train Run';
    const orderType = 1;
    const dialogData = {
      trainRunData: {
        trainNumber: 'TR-123',
        id: 'train-run-id',
        operatingDays: { beginDate: '2024-01-01', daysBitmap: '1111111' },
      },
      orderData: { externalId: 'parent-order-123' },
    } as any;

    beforeEach(() => {
      // Mock currentlySelectedOrderSig
      orderActionsServiceMock.currentlySelectedOrderSig = jest.fn().mockReturnValue({ externalId: 'parent-order-123' });
      orderActionsServiceMock.currentlySelectedOrderSig.set = jest.fn();
    });

    it('should show spinner, create draft order, and associate train run successfully', fakeAsync(() => {
      const mockOrder = { externalId: 'ORD-456' };
      const mockOrderItem = { externalId: 'ITEM-456' };
      orderingServiceMock.createDraftOrder.mockReturnValue(of(mockOrder));
      orderingServiceMock.createOrderItem.mockReturnValue(of(mockOrderItem));

      service.modifyTrainRun(subject, orderType, dialogData);
      tick(); // Allow async operations to complete

      expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
      expect(orderingServiceMock.createDraftOrder).toHaveBeenCalledWith({ subject, orderType });
      expect(orderingServiceMock.createOrderItem).toHaveBeenCalledWith(
        mockOrder.externalId,
        expect.objectContaining({
          content: expect.objectContaining({
            type: OrderItemType.TRAIN_RUN,
            action: OrderItemAction.REPLACEMENT,
            item: expect.objectContaining({
              trainNumber: 'TR-123',
              parentExternalId: 'parent-order-123',
            }),
          }),
        }),
      );
      expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith(
        'translated message',
        expect.objectContaining({ panelClass: ['success'] }),
      );
      expect(navigationServiceMock.navigate).toHaveBeenCalledWith(['/orders', mockOrder.externalId, 'order-items', 'ITEM-456'], {
        extras: { queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      });
    }));

    it('should handle error when creating draft order', () => {
      const error = new Error('Draft order creation failed');
      orderingServiceMock.createDraftOrder.mockReturnValue(throwError(error));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.modifyTrainRun(subject, orderType, dialogData);

      expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
      expect(orderingServiceMock.createDraftOrder).toHaveBeenCalledWith({ subject, orderType });
      expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith(
        'translated message',
        expect.objectContaining({ panelClass: ['error'] }),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating order:', error);
      expect(orderingServiceMock.createOrderItem).not.toHaveBeenCalled();
      expect(navigationServiceMock.navigate).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle error when associating train run', () => {
      const mockOrder = { externalId: 'ORD-789' };
      const error = new Error('Association failed');
      orderingServiceMock.createDraftOrder.mockReturnValue(of(mockOrder));
      orderingServiceMock.createOrderItem.mockReturnValue(throwError(error));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.modifyTrainRun(subject, orderType, dialogData);

      expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
      expect(orderingServiceMock.createDraftOrder).toHaveBeenCalledWith({ subject, orderType });
      expect(orderingServiceMock.createOrderItem).toHaveBeenCalledWith(
        mockOrder.externalId,
        expect.objectContaining({
          content: expect.objectContaining({
            type: OrderItemType.TRAIN_RUN,
            action: OrderItemAction.REPLACEMENT,
            item: expect.objectContaining({
              trainNumber: 'TR-123',
              parentExternalId: 'parent-order-123',
            }),
          }),
        }),
      );
      expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
      expect(navigationServiceMock.navigate).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should create order and call associateTrainRun on success', () => {
      const mockOrder = { externalId: 'ORD-TEST' };
      orderingServiceMock.createDraftOrder.mockReturnValue(of(mockOrder));
      orderingServiceMock.createOrderItem.mockReturnValue(of({}));

      // Spy on private method through the public interface
      const associateTrainRunSpy = jest.spyOn(service as any, 'associateTrainRun');

      service.modifyTrainRun(subject, orderType, dialogData);

      expect(orderingServiceMock.createDraftOrder).toHaveBeenCalledWith({ subject, orderType });
      expect(associateTrainRunSpy).toHaveBeenCalledWith(mockOrder, dialogData);

      associateTrainRunSpy.mockRestore();
    });
  });

  describe('associateTrainRun (private method testing via modifyTrainRun)', () => {
    const subject = 'Associate Train Run Test';
    const orderType = 2;
    const testDialogData = {
      trainRunData: {
        trainNumber: 'TR-999',
        externalId: '1234-5678',
        operatingDays: { beginDate: '2024-02-01', daysBitmap: '1010101' },
      },
      orderData: { externalId: 'parent-order-123' },
    } as any;

    beforeEach(() => {
      // Mock currentlySelectedOrderSig for these tests
      orderActionsServiceMock.currentlySelectedOrderSig = jest.fn().mockReturnValue({ externalId: 'parent-order-123' });
      orderActionsServiceMock.currentlySelectedOrderSig.set = jest.fn();
    });

    it('should create order item with correct structure', fakeAsync(() => {
      const mockOrder = { externalId: 'ORD-ASSOC-123' };
      const mockOrderItem = { externalId: 'ITEM-ASSOC-123' };
      orderingServiceMock.createDraftOrder.mockReturnValue(of(mockOrder));
      orderingServiceMock.createOrderItem.mockReturnValue(of(mockOrderItem));

      service.modifyTrainRun(subject, orderType, testDialogData);
      tick(); // Allow async operations to complete

      expect(orderingServiceMock.createOrderItem).toHaveBeenCalledWith(mockOrder.externalId, {
        content: {
          type: OrderItemType.TRAIN_RUN,
          action: OrderItemAction.REPLACEMENT,
          item: expect.objectContaining({
            trainNumber: 'TR-999',
            parentExternalId: 'parent-order-123',
          }),
        },
      });
    }));

    it('should navigate to correct order path on successful association', fakeAsync(() => {
      const mockOrder = { externalId: 'ORD-NAV-TEST' };
      const mockOrderItem = { externalId: 'ITEM-NAV-TEST' };
      orderingServiceMock.createDraftOrder.mockReturnValue(of(mockOrder));
      orderingServiceMock.createOrderItem.mockReturnValue(of(mockOrderItem));

      service.modifyTrainRun(subject, orderType, testDialogData);
      tick(); // Allow async operations to complete

      expect(navigationServiceMock.navigate).toHaveBeenCalledWith(['/orders', mockOrder.externalId, 'order-items', 'ITEM-NAV-TEST'], {
        extras: { queryParams: { [SOURCE_TAB_PARAM]: 'CURRENT_ORDERS' } },
      });
    }));

    it('should show success notification on successful association', fakeAsync(() => {
      const mockOrder = { externalId: 'ORD-SUCCESS-TEST' };
      const mockOrderItem = { externalId: 'ITEM-SUCCESS-TEST' };
      orderingServiceMock.createDraftOrder.mockReturnValue(of(mockOrder));
      orderingServiceMock.createOrderItem.mockReturnValue(of(mockOrderItem));

      service.modifyTrainRun(subject, orderType, testDialogData);
      tick(); // Allow async operations to complete

      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith(
        'translated message',
        expect.objectContaining({ panelClass: ['success'] }),
      );
    }));

    it('should not use parentExternalId when modifying from trains list (no orderData)', fakeAsync(() => {
      const mockOrder = { externalId: 'ORD-TRAINS-LIST' };
      const mockOrderItem = { externalId: 'ITEM-TRAINS-LIST' };
      orderingServiceMock.createDraftOrder.mockReturnValue(of(mockOrder));
      orderingServiceMock.createOrderItem.mockReturnValue(of(mockOrderItem));

      // Dialog data without orderData (trains list flow)
      const trainsListDialogData = {
        trainRunData: {
          trainNumber: 'TR-TRAINS-LIST',
          externalId: 'trains-list-id',
          operatingDays: { beginDate: '2024-02-01', daysBitmap: '1010101' },
        },
        // No orderData - this is the trains list flow
      } as any;

      service.modifyTrainRun(subject, orderType, trainsListDialogData);
      tick();

      expect(orderingServiceMock.createOrderItem).toHaveBeenCalledWith(mockOrder.externalId, {
        content: {
          type: OrderItemType.TRAIN_RUN,
          action: OrderItemAction.REPLACEMENT,
          item: expect.objectContaining({
            trainNumber: 'TR-TRAINS-LIST',
            parentExternalId: undefined,
          }),
        },
      });
    }));
  });
});
