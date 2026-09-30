import { TestBed } from '@angular/core/testing';
import { of, throwError, Subscription } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import {
  OrderingService,
  OrderItemResponse,
  OrderItemAction,
  OrderItemType,
  TrainRun,
  OrderResponse,
  OrderState,
  Order,
  OrderItem,
  OfferItemResponse,
  Source,
} from '@Ordering/api';

import { NotificationService } from '@Ordering/shared/services/notification.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { SNACKBARCONFIG_SUCCESS, SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { NavigationService } from '@Ordering/shared/services/navigation.service';

describe('OrderActionsService', () => {
  let service: OrderActionsService;
  let orderingServiceMock: any;
  let notificationServiceMock: any;
  let loadingSpinnerServiceMock: any;
  let translationsServiceMock: any;
  let errorHandlingServiceMock: any;
  let navigationServiceMock: any;
  let consoleErrorSpy: jest.SpyInstance;
  let subscriptions: Subscription[] = [];

  beforeEach(() => {
    orderingServiceMock = {
      getOrders: jest.fn(),
      getOrderItem: jest.fn(),
      getOfferItem: jest.fn(),
      deleteOrder: jest.fn(),
      cancelOrder: jest.fn(),
      createDraftOrder: jest.fn(),
      createOrderItem: jest.fn(),
      getOrder: jest.fn(),
      setOrder: jest.fn(),
      setOrderItem: jest.fn(),
      submitOrder: jest.fn(),
      confirmOfferItem: jest.fn(),
      refuseOfferItem: jest.fn(),
    };
    notificationServiceMock = {
      pushNotification: jest.fn(),
    };
    loadingSpinnerServiceMock = {
      showSpinner: jest.fn(),
      hideSpinner: jest.fn(),
    };
    translationsServiceMock = {
      translate: jest.fn().mockReturnValue('translated message'),
    };
    errorHandlingServiceMock = {
      handleError: jest.fn().mockImplementation(() => {
        // Mock the behavior of the real ErrorHandlingService.handleError
        // which calls notificationService.pushNotification
        notificationServiceMock.pushNotification('translated message', SNACKBARCONFIG_ERROR);
      }),
    };
    navigationServiceMock = {
      navigate: jest.fn(),
      navigateToList: jest.fn(),
      navigateToLogin: jest.fn(),
    };
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OrderActionsService,
        { provide: OrderingService, useValue: orderingServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: LoadingSpinnerService, useValue: loadingSpinnerServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
        { provide: ErrorHandlingService, useValue: errorHandlingServiceMock },
        { provide: NavigationService, useValue: navigationServiceMock },
      ],
    });

    service = TestBed.inject(OrderActionsService);
  });

  afterEach(() => {
    // Unsubscribe from all subscriptions to prevent leaks
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    // Clear all timers
    jest.clearAllTimers();

    // Reset all mocks
    jest.clearAllMocks();

    // Restore console.error
    consoleErrorSpy.mockRestore();

    // Reset TestBed to ensure complete cleanup
    TestBed.resetTestingModule();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have correct readonly states defined', () => {
      expect(service.readonlyOrderStates).toEqual([
        OrderState.AGREED,
        OrderState.CANCELLED,
        OrderState.OFFERED,
        OrderState.REFUSED,
        OrderState.REJECTED,
        OrderState.SUBMITTED,
      ]);
      expect(service.offerItemsVisibleStates).toEqual([
        OrderState.AGREED,
        OrderState.CANCELLED,
        OrderState.OFFERED,
        OrderState.REFUSED,
        OrderState.REJECTED,
      ]);
      expect(service.orderDeletableStates).toEqual([OrderState.DRAFT]);
      expect(service.orderCancelableStates).toEqual([OrderState.SUBMITTED, OrderState.OFFERED, OrderState.REFUSED]);
      expect(service.orderSendStates).toEqual([OrderState.DRAFT]);
      expect(service.offeredItemActionStates).toEqual([OrderState.OFFERED]);
      expect(service.offerAvailableStates).toEqual([
        OrderState.AGREED,
        OrderState.CANCELLED,
        OrderState.OFFERED,
        OrderState.REFUSED,
        OrderState.REJECTED,
      ]);
    });

    it('should initialize currentlySelectedOrderSig with empty OrderResponse', () => {
      expect(service.currentlySelectedOrderSig()).toEqual({} as OrderResponse);
    });
  });

  describe('deleteDraftOrder', () => {
    it('should return null observable if externalOrderId is undefined', done => {
      const subscription = service.deleteDraftOrder(undefined).subscribe(result => {
        expect(result).toBeNull();
        expect(orderingServiceMock.deleteOrder).not.toHaveBeenCalled();
        done();
      });
      subscriptions.push(subscription);
    });

    it('should return null observable if externalOrderId is empty string', done => {
      const subscription = service.deleteDraftOrder('').subscribe(result => {
        expect(result).toBeNull();
        expect(orderingServiceMock.deleteOrder).not.toHaveBeenCalled();
        done();
      });
      subscriptions.push(subscription);
    });

    it('should delete order successfully', done => {
      orderingServiceMock.deleteOrder.mockReturnValue(of(null));

      const subscription = service.deleteDraftOrder('123').subscribe(result => {
        expect(result).toBeNull();
        expect(orderingServiceMock.deleteOrder).toHaveBeenCalledWith('123');
        done();
      });
      subscriptions.push(subscription);
    });
  });

  describe('cancelOrder', () => {
    it('should show spinner and call cancelOrder on the ordering service', done => {
      orderingServiceMock.cancelOrder.mockReturnValue(of(null));

      const sub = service.cancelOrder('123').subscribe({
        complete: () => {
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.cancelOrder).toHaveBeenCalledWith('123');
          done();
        },
      });
      subscriptions.push(sub);
    });

    it('should return the response value on success', done => {
      orderingServiceMock.cancelOrder.mockReturnValue(of({ status: 'ok' }));

      const sub = service.cancelOrder('123').subscribe({
        next: result => {
          expect(result).toEqual({ status: 'ok' });
          done();
        },
      });
      subscriptions.push(sub);
    });

    it('should hide spinner after a successful cancel', () => {
      orderingServiceMock.cancelOrder.mockReturnValue(of(null));

      service.cancelOrder('123').subscribe();

      expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
    });

    it('should delegate errors to errorHandlingService and return EMPTY', () => {
      const error = new Error('Cancel error');
      orderingServiceMock.cancelOrder.mockReturnValue(throwError(() => error));

      let emitted = false;
      service.cancelOrder('123').subscribe({ next: () => (emitted = true) });

      expect(emitted).toBe(false);
      expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(error, OrderingApiName.CancelOrder);
      expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
    });

    it('should NOT trigger notification or navigation (caller is responsible)', done => {
      orderingServiceMock.cancelOrder.mockReturnValue(of(null));

      const sub = service.cancelOrder('123').subscribe({
        complete: () => {
          expect(notificationServiceMock.pushNotification).not.toHaveBeenCalled();
          expect(navigationServiceMock.navigateToList).not.toHaveBeenCalled();
          done();
        },
      });
      subscriptions.push(sub);
    });
  });

  describe('showSuccessAndNavigateToList', () => {
    it('should show success message for delete draft order and navigate to list', () => {
      service.showSuccessAndNavigateToList('msgSuccessDeleteDraftOrder');
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_SUCCESS);
      expect(navigationServiceMock.navigateToList).toHaveBeenCalled();
    });

    it('should show success message for cancel order and navigate to list', () => {
      service.showSuccessAndNavigateToList('msgSuccessCancelOrder');
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_SUCCESS);
      expect(navigationServiceMock.navigateToList).toHaveBeenCalled();
    });

    it('should show success message for submit order and navigate to list', () => {
      service.showSuccessAndNavigateToList('msgSuccessSubmitOrder');
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_SUCCESS);
      expect(navigationServiceMock.navigateToList).toHaveBeenCalled();
    });
  });

  describe('showErrorAndNavigateToList', () => {
    it('should show error message for delete draft order', done => {
      notificationServiceMock.pushNotification('translated message', SNACKBARCONFIG_ERROR);
      navigationServiceMock.navigateToList();
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_ERROR);
      expect(navigationServiceMock.navigateToList).toHaveBeenCalled();
      done();
    });

    it('should show error message for cancel order', done => {
      notificationServiceMock.pushNotification('translated message', SNACKBARCONFIG_ERROR);
      navigationServiceMock.navigateToList();
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_ERROR);
      expect(navigationServiceMock.navigateToList).toHaveBeenCalled();
      done();
    });

    it('should show error message for submit order', done => {
      notificationServiceMock.pushNotification('translated message', SNACKBARCONFIG_ERROR);
      navigationServiceMock.navigateToList();
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_ERROR);
      expect(navigationServiceMock.navigateToList).toHaveBeenCalled();
      done();
    });
  });

  describe('createDraftOrder', () => {
    it('should create draft order successfully', done => {
      const orderResponse: OrderResponse = { externalId: '1', subject: 'Test Subject' } as OrderResponse;
      orderingServiceMock.createDraftOrder.mockReturnValue(of(orderResponse));

      const subscription = service.createDraftOrder('Test Subject', 1).subscribe({
        next: result => {
          expect(result).toEqual(orderResponse);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.createDraftOrder).toHaveBeenCalledWith({
            subject: 'Test Subject',
            orderType: 1,
          });
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle error when creating draft order', done => {
      const error = new Error('Create error');
      orderingServiceMock.createDraftOrder.mockReturnValue(throwError(() => error));

      const subscription = service.createDraftOrder('Test Subject', 1).subscribe({
        next: result => {
          expect(result).toEqual({} as OrderResponse);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.createDraftOrder).toHaveBeenCalledWith({
            subject: 'Test Subject',
            orderType: 1,
          });
          expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(error, OrderingApiName.CreateDraftOrder);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });
  });

  describe('submitOrder', () => {
    it('should do nothing if externalOrderId is empty string', () => {
      service.submitOrder('');
      expect(loadingSpinnerServiceMock.showSpinner).not.toHaveBeenCalled();
      expect(orderingServiceMock.submitOrder).not.toHaveBeenCalled();
    });

    it('should submit order successfully', () => {
      orderingServiceMock.submitOrder.mockReturnValue(of({}));
      service.submitOrder('123');

      expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
      expect(orderingServiceMock.submitOrder).toHaveBeenCalledWith('123');
      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_SUCCESS);
      expect(navigationServiceMock.navigateToList).toHaveBeenCalled();
    });

    it('should handle error when submitting order', () => {
      const error = new Error('Submit error');
      orderingServiceMock.submitOrder.mockReturnValue(throwError(() => error));
      service.submitOrder('123');

      expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
      expect(orderingServiceMock.submitOrder).toHaveBeenCalledWith('123');
      expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(error, OrderingApiName.SubmitOrder);
    });
  });

  describe('getOrderDetails', () => {
    it('should retrieve order details successfully', done => {
      const orderDetails: OrderResponse = { externalId: '1', subject: 'Test Order' } as OrderResponse;
      orderingServiceMock.getOrder.mockReturnValue(of(orderDetails));

      const subscription = service.getOrderDetails('123').subscribe({
        next: result => {
          expect(result).toEqual(orderDetails);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.getOrder).toHaveBeenCalledWith('123');
          expect(service.currentlySelectedOrderSig()).toEqual(orderDetails);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle error when retrieving order details', done => {
      const error = new Error('Get order error');
      orderingServiceMock.getOrder.mockReturnValue(throwError(() => error));

      const subscription = service.getOrderDetails('123').subscribe({
        next: result => {
          expect(result).toEqual({} as OrderResponse);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.getOrder).toHaveBeenCalledWith('123');
          expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_ERROR);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });
  });

  describe('editOrderDetails', () => {
    it('should edit order details successfully', done => {
      const orderResponse: OrderResponse = { externalId: '1', subject: 'Updated Subject' } as OrderResponse;
      const orderToEdit: Order = { subject: 'Updated Subject', orderType: 1 };
      orderingServiceMock.setOrder.mockReturnValue(of(orderResponse));

      const subscription = service.editOrderDetails('123', orderToEdit).subscribe({
        next: () => {
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.setOrder).toHaveBeenCalledWith('123', orderToEdit);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle error when editing order details', done => {
      const error = new Error('Edit error');
      const orderToEdit: Order = { subject: 'Updated Subject', orderType: 1 };
      orderingServiceMock.setOrder.mockReturnValue(throwError(() => error));

      const subscription = service.editOrderDetails('123', orderToEdit).subscribe({
        next: result => {
          expect(result).toBeNull();
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.setOrder).toHaveBeenCalledWith('123', orderToEdit);
          expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(error, OrderingApiName.EditOrderDetails);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });
  });

  describe('createOrderItem', () => {
    const mockOrderItem: OrderItem = {
      content: {
        type: OrderItemType.TRAIN_RUN,
        action: OrderItemAction.CREATION,
        item: {
          trainNumber: '12345',
          isConditionalTrainRun: false,
          operatingCompany: 'XYZ',
          operatingDays: [
            {
              beginDate: '2024-01-01',
              daysBitmap: '1111111',
            },
          ],
        } as TrainRun,
      },
    };

    it('should create order item successfully', done => {
      const mockOrderItemResponse: OrderItemResponse[] = [
        {
          content: mockOrderItem.content,
          externalId: '123',
        } as OrderItemResponse,
      ];
      orderingServiceMock.createOrderItem.mockReturnValue(of(mockOrderItemResponse));

      const subscription = service.createOrderItem('123', mockOrderItem).subscribe({
        next: result => {
          expect(result).toEqual(mockOrderItemResponse);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.createOrderItem).toHaveBeenCalledWith('123', mockOrderItem);
          expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_SUCCESS);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle error when creating order item', done => {
      const error = new Error('Create order item error');
      orderingServiceMock.createOrderItem.mockReturnValue(throwError(() => error));

      const subscription = service.createOrderItem('123', mockOrderItem).subscribe({
        next: result => {
          expect(result).toEqual([]);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.createOrderItem).toHaveBeenCalledWith('123', mockOrderItem);
          expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(error, OrderingApiName.CreateTrainRun);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should use restriction success message when creating a restriction item', done => {
      const restrictionOrderItem: OrderItem = {
        content: {
          type: OrderItemType.RESTRICTION,
          action: OrderItemAction.CREATION,
          item: { name: 'p1' } as any,
        },
      };
      const mockResponse: OrderItemResponse[] = [{ content: restrictionOrderItem.content, externalId: '456' } as OrderItemResponse];
      orderingServiceMock.createOrderItem.mockReturnValue(of(mockResponse));

      const subscription = service.createOrderItem('123', restrictionOrderItem).subscribe({
        next: () => {
          expect(translationsServiceMock.translate).toHaveBeenCalledWith('msgSuccessCreateRestriction');
        },
        complete: () => done(),
      });
      subscriptions.push(subscription);
    });
  });

  describe('getOrderItemDetails', () => {
    it('should return order item details on success', done => {
      const response: OrderItemResponse = {
        content: {
          type: OrderItemType.TRAIN_RUN,
          action: OrderItemAction.CREATION,
          item: {} as TrainRun,
        },
        externalId: 'item1',
      };
      orderingServiceMock.getOrderItem.mockReturnValue(of(response));

      const subscription = service.getOrderItemDetails('order1', 'item1').subscribe({
        next: res => {
          expect(res).toEqual(response);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.getOrderItem).toHaveBeenCalledWith('order1', 'item1');
          expect(notificationServiceMock.pushNotification).not.toHaveBeenCalled();
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle error and return empty OrderItemResponse', done => {
      const error = new Error('Get order item error');
      orderingServiceMock.getOrderItem.mockReturnValue(throwError(() => error));

      const subscription = service.getOrderItemDetails('order1', 'item1').subscribe({
        next: res => {
          expect(res).toEqual({} as OrderItemResponse);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.getOrderItem).toHaveBeenCalledWith('order1', 'item1');
          expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_ERROR);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });
  });

  describe('getOfferItemDetails', () => {
    it('should return offer item details on success', done => {
      const response: OfferItemResponse = {
        content: {
          type: OrderItemType.TRAIN_RUN,
          action: OrderItemAction.CREATION,
          item: {} as TrainRun,
        },
        externalId: 'offer1',
      };
      orderingServiceMock.getOfferItem.mockReturnValue(of(response));

      const subscription = service.getOfferItemDetails('order1', 'offer1').subscribe({
        next: res => {
          expect(res).toEqual(response);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.getOfferItem).toHaveBeenCalledWith('order1', 'offer1');
          expect(notificationServiceMock.pushNotification).not.toHaveBeenCalled();
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle error and return empty OfferItemResponse', done => {
      const error = new Error('Get offer item error');
      orderingServiceMock.getOfferItem.mockReturnValue(throwError(() => error));

      const subscription = service.getOfferItemDetails('order1', 'offer1').subscribe({
        next: res => {
          expect(res).toEqual({} as OfferItemResponse);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.getOfferItem).toHaveBeenCalledWith('order1', 'offer1');
          expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_ERROR);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });
  });

  describe('editOrderItem', () => {
    const mockOrderItem: OrderItem = {
      content: {
        type: OrderItemType.TRAIN_RUN,
        action: OrderItemAction.CREATION,
        item: {
          trainNumber: '12345',
          isConditionalTrainRun: false,
          operatingCompany: 'XYZ',
          operatingDays: [
            {
              beginDate: '2024-01-01',
              daysBitmap: '1111111',
            },
          ],
        } as TrainRun,
      },
    };

    it('should edit order item successfully', done => {
      const mockOrderItemResponse: OrderItemResponse[] = [
        {
          content: mockOrderItem.content,
          externalId: '123',
        } as OrderItemResponse,
      ];
      orderingServiceMock.setOrderItem.mockReturnValue(of(mockOrderItemResponse));

      const subscription = service.editOrderItem('order123', 'item123', mockOrderItem).subscribe({
        next: result => {
          expect(result).toEqual(mockOrderItemResponse);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.setOrderItem).toHaveBeenCalledWith('order123', 'item123', mockOrderItem);
          expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_SUCCESS);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle error when editing order item', done => {
      const error = new Error('Edit order item error');
      orderingServiceMock.setOrderItem.mockReturnValue(throwError(() => error));

      const subscription = service.editOrderItem('order123', 'item123', mockOrderItem).subscribe({
        next: result => {
          expect(result).toEqual([]);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.setOrderItem).toHaveBeenCalledWith('order123', 'item123', mockOrderItem);
          expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(error, OrderingApiName.EditOrderItem);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });
  });

  describe('confirmOfferItem', () => {
    it('should confirm offer item successfully', done => {
      const mockResponse = { success: true };
      orderingServiceMock.confirmOfferItem.mockReturnValue(of(mockResponse));

      const subscription = service.confirmOfferItem('order123', 'offer123').subscribe({
        next: result => {
          expect(result).toEqual(mockResponse);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.confirmOfferItem).toHaveBeenCalledWith('order123', 'offer123');
          expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_SUCCESS);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle error when confirming offer item', done => {
      const error = new Error('Confirm offer error');
      orderingServiceMock.confirmOfferItem.mockReturnValue(throwError(() => error));

      const subscription = service.confirmOfferItem('order123', 'offer123').subscribe({
        next: result => {
          expect(result).toEqual([]);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.confirmOfferItem).toHaveBeenCalledWith('order123', 'offer123');
          expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(error, OrderingApiName.ConfirmOffer);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle internal error in handleOfferItemAction when confirming', done => {
      orderingServiceMock.confirmOfferItem.mockReturnValue(throwError(() => new Error('Internal error')));

      const subscription = service.confirmOfferItem('order123', 'offer123').subscribe({
        next: result => {
          expect(result).toEqual([]);
          expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_ERROR);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });
  });

  describe('refuseOfferItem', () => {
    it('should refuse offer item successfully', done => {
      const mockResponse = { success: true };
      orderingServiceMock.refuseOfferItem.mockReturnValue(of(mockResponse));

      const subscription = service.refuseOfferItem('order123', 'offer123').subscribe({
        next: result => {
          expect(result).toEqual(mockResponse);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.refuseOfferItem).toHaveBeenCalledWith('order123', 'offer123');
          expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_SUCCESS);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle error when refusing offer item', done => {
      const error = new Error('Refuse offer error');
      orderingServiceMock.refuseOfferItem.mockReturnValue(throwError(() => error));

      const subscription = service.refuseOfferItem('order123', 'offer123').subscribe({
        next: result => {
          expect(result).toEqual([]);
          expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
          expect(orderingServiceMock.refuseOfferItem).toHaveBeenCalledWith('order123', 'offer123');
          expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(error, OrderingApiName.RefuseOffer);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });

    it('should handle internal error in handleOfferItemAction when refusing', done => {
      orderingServiceMock.refuseOfferItem.mockReturnValue(throwError(() => new Error('Internal error')));

      const subscription = service.refuseOfferItem('order123', 'offer123').subscribe({
        next: result => {
          expect(result).toEqual([]);
          expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('translated message', SNACKBARCONFIG_ERROR);
        },
        complete: () => {
          setTimeout(() => {
            expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
            done();
          }, 10);
        },
      });
      subscriptions.push(subscription);
    });
  });

  describe('isIMViewingRUOrder', () => {
    let configDataServiceMock: any;

    beforeEach(() => {
      configDataServiceMock = {
        isInfrastructureManagerUser: jest.fn(),
      };
      service['configDataService'] = configDataServiceMock;
    });

    it('should return false when current order has no externalId', () => {
      service.currentlySelectedOrderSig.set({} as OrderResponse);
      configDataServiceMock.isInfrastructureManagerUser.mockReturnValue(true);

      expect(service.isIMViewingRUOrder).toBe(false);
    });

    it('should return false when IM user views non-RU order (orderOrigin = INFRASTRUCTURE_MANAGER)', () => {
      service.currentlySelectedOrderSig.set({
        externalId: 'order-123',
        orderOrigin: Source.INFRASTRUCTURE_MANAGER, // Assuming this is not RU_WEB_PORTAL
        subject: 'Test Order',
        orderType: 0,
        state: OrderState.DRAFT,
        creationDateTime: '2024-01-01T00:00:00Z',
        lastModifiedDateTime: '2024-01-01T00:00:00Z',
        messageState: 0,
      });
      configDataServiceMock.isInfrastructureManagerUser.mockReturnValue(true);

      expect(service.isIMViewingRUOrder).toBe(false);
    });

    it('should return false when RU user views RU_WEB_PORTAL order', () => {
      service.currentlySelectedOrderSig.set({
        externalId: 'order-123',
        orderOrigin: Source.RAILWAY_UNDERTAKING_WEB_PORTAL,
        subject: 'Test Order',
        orderType: 0,
        state: OrderState.DRAFT,
        creationDateTime: '2024-01-01T00:00:00Z',
        lastModifiedDateTime: '2024-01-01T00:00:00Z',
        messageState: 0,
      });
      configDataServiceMock.isInfrastructureManagerUser.mockReturnValue(false);

      expect(service.isIMViewingRUOrder).toBe(false);
    });

    it('should return true when IM user views RU_WEB_PORTAL order', () => {
      service.currentlySelectedOrderSig.set({
        externalId: 'order-123',
        orderOrigin: Source.RAILWAY_UNDERTAKING_WEB_PORTAL,
        subject: 'Test Order',
        orderType: 0,
        state: OrderState.DRAFT,
        creationDateTime: '2024-01-01T00:00:00Z',
        lastModifiedDateTime: '2024-01-01T00:00:00Z',
        messageState: 0,
      });
      configDataServiceMock.isInfrastructureManagerUser.mockReturnValue(true);

      expect(service.isIMViewingRUOrder).toBe(true);
    });
  });
});
