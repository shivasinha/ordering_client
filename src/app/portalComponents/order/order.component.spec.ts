// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError, finalize, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  Order,
  OrderResponse,
  OrderState,
  OrderItemResponse,
  OrderItemAction,
  OrderItemType,
  OrderType,
  Config,
  UserAccessRights,
  Source,
} from '@Ordering/api';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ChatService } from '@Ordering/chat/chat.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { OrderComponent } from './order.component';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { SNACKBARCONFIG_ERROR, SNACKBARCONFIG_SUCCESS } from '@Ordering/utils/snackbar';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { ConfirmationDialogComponent } from '@Ordering/shared/components/confirmation-dialog/confirmation-dialog.component';
import { MatTabGroup, MatTabChangeEvent } from '@angular/material/tabs';
import { ITabInstanceData } from '@Ordering/data/custom/ITabInstanceData';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { SOURCE_TAB_PARAM } from '@Ordering/shared/services/breadcrumb.service';

describe('OrderComponent', () => {
  let component: OrderComponent;
  let fixture: ComponentFixture<OrderComponent>;
  let chatService: jest.Mocked<ChatService>;
  let navigationService: jest.Mocked<NavigationService>;
  let orderingActionService: jest.Mocked<OrderActionsService>;
  let notificationService: jest.Mocked<NotificationService>;
  let loadingSpinnerService: jest.Mocked<LoadingSpinnerService>;
  let subscriptions: Subscription[] = [];

  const orderResponse: OrderResponse = {
    externalId: '12345',
    subject: 'Test Order',
    creationDateTime: '2024-08-29T12:00:00Z',
    orderItems: [
      { content: { item: { orderId: '12345' } }, externalId: '999' } as OrderItemResponse,
      { content: { item: { orderId: '12345' } }, externalId: '888' } as OrderItemResponse,
    ],
    state: OrderState.DRAFT,
    orderOrigin: Source.INFRASTRUCTURE_MANAGER,
  };

  beforeEach(async () => {
    const orderingActionServiceMock = {
      getOrderDetails: jest.fn().mockReturnValue(of({})),
      createDraftOrder: jest.fn().mockReturnValue(of({})),
      cancelOrder: jest.fn(),
      deleteDraftOrder: jest.fn(),
      getOrder: jest.fn().mockReturnValue(of({})),
      setOrder: jest.fn(),
      editOrderDetails: jest.fn().mockReturnValue(of({})),
      createOrderItem: jest.fn().mockReturnValue(of({})),
      currentlySelectedOrderSig: jest.fn().mockReturnValue(orderResponse),
      readonlyOrderStates: [
        OrderState.AGREED,
        OrderState.CANCELLED,
        OrderState.OFFERED,
        OrderState.REFUSED,
        OrderState.REJECTED,
        OrderState.SUBMITTED,
      ], // Add mock for readonlyOrderStates
      offeredItemActionStates: [OrderState.OFFERED, OrderState.AGREED],
      isIMViewingRUOrder: false,
      refuseOfferItem: jest.fn().mockReturnValue(of({})), // Add mock for refuseOfferItem
      confirmOfferItem: jest.fn().mockReturnValue(of({})), // Add mock for confirmOfferItem
    };
    const dialogMock = {
      open: jest.fn(),
    };
    const navigationServiceMock = {
      navigate: jest.fn(),
      navigateToList: jest.fn(),
      navigateToLogin: jest.fn(),
    };

    const chatServiceMock = {
      openMessageDialog: jest.fn(),
      getMatIcon: jest.fn(),
      getMessageTooltip: jest.fn(),
      checkMessagePermission: jest.fn().mockReturnValue(of([])),
    };
    const configDataServiceMock = {
      maxNumberOfOrderItemsPerOrder: 3,
      configData: undefined,
      userPermissions: jest.fn().mockReturnValue({} as UserAccessRights),
      orderItemTypes: jest.fn().mockReturnValue([]),
    };

    const notificationServiceMock = {
      pushNotification: jest.fn(),
    };

    const loadingSpinnerServiceMock = {
      showSpinner: jest.fn(),
      hideSpinner: jest.fn(),
    };

    const mockTabGroup = {
      _selectedIndex: 0,
      get selectedIndex() {
        return this._selectedIndex;
      },
      set selectedIndex(value: number) {
        this._selectedIndex = value;
      },
    };

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule,
        HttpClientTestingModule,
        OrderComponent,
        TranslatePipe,
        BrowserAnimationsModule,
        NoopAnimationsModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: OrderActionsService, useValue: orderingActionServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: NavigationService, useValue: navigationServiceMock },
        { provide: ChatService, useValue: chatServiceMock },
        { provide: ConfigDataService, useValue: configDataServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: LoadingSpinnerService, useValue: loadingSpinnerServiceMock },
        {
          provide: UserPermissionService,
          useValue: {
            checkPermissions: jest.fn().mockReturnValue(true),
            getRequiredPermission: jest.fn().mockReturnValue('CREATE'),
          },
        },
        {
          provide: TranslationsService,
          useValue: {
            translate: jest.fn((key: string) => key),
            translateEnumValue: jest.fn(() => ''),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '123' }), // Mock paramMap with a test id
            },
            data: of({ order: { id: '123', name: 'Test Order' } }),
          },
        },
      ],
    }).compileComponents();

    chatService = TestBed.inject(ChatService) as jest.Mocked<ChatService>;
    orderingActionService = TestBed.inject(OrderActionsService) as jest.Mocked<OrderActionsService>;
    navigationService = TestBed.inject(NavigationService) as jest.Mocked<NavigationService>;
    notificationService = TestBed.inject(NotificationService) as jest.Mocked<NotificationService>;
    loadingSpinnerService = TestBed.inject(LoadingSpinnerService) as jest.Mocked<LoadingSpinnerService>;
    fixture = TestBed.createComponent(OrderComponent);
    component = fixture.componentInstance;
    component.itemsTabs = mockTabGroup as MatTabGroup;
    jest.spyOn(component.itemsTabs, 'selectedIndex', 'set'); // Spy on property setter
    fixture.detectChanges();
  });

  afterEach(() => {
    // Unsubscribe from all subscriptions to prevent leaks
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    // Clear all timers and mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();

    // Reset TestBed
    TestBed.resetTestingModule();

    // Clean up services if they have cleanup methods
    if (chatService && typeof chatService.close === 'function') {
      chatService.close();
    }
    if (orderingActionService && typeof orderingActionService.close === 'function') {
      orderingActionService.close();
    }
    if (notificationService && typeof notificationService.close === 'function') {
      notificationService.close();
    }
    if (loadingSpinnerService && typeof loadingSpinnerService.close === 'function') {
      loadingSpinnerService.close();
    }

    // Destroy fixture
    if (fixture) {
      fixture.destroy();
    }
  });
  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('should navigate to /list on cancel', () => {
    component.onCancel();
    expect(navigationService.navigateToList).toHaveBeenCalled();
  });
  it('should not open message dialog if orderData is not present', () => {
    component.orderData = undefined;
    component.openMessageDialog();
    expect(chatService.openMessageDialog).not.toHaveBeenCalled();
  });
  it('should open message dialog if orderData is present and fetch order details after dialog close', () => {
    const mockDialogRef = {
      afterClosed: jest.fn().mockReturnValue(of({})),
    };
    jest.spyOn(chatService, 'checkMessagePermission').mockReturnValue(of([]));
    jest.spyOn(chatService, 'openMessageDialog').mockReturnValue(mockDialogRef);
    jest.spyOn(orderingActionService, 'getOrderDetails').mockReturnValue(of({} as OrderResponse));

    component.orderData = orderResponse;
    component.openMessageDialog();
    expect(chatService.checkMessagePermission).toHaveBeenCalledWith('12345');
    expect(chatService.openMessageDialog).toHaveBeenCalledWith(component.orderData);
    expect(mockDialogRef.afterClosed).toHaveBeenCalled();
    expect(orderingActionService.getOrderDetails).toHaveBeenCalledWith('12345');
  });

  it('should return the correct icon from getMatIcon', () => {
    jest.spyOn(chatService, 'getMatIcon').mockReturnValue('some-icon');
    const icon = component.getMatIcon('some-action');
    expect(icon).toBe('some-icon');
  });
  it('should return the correct tooltip from getMessageTooltip', () => {
    jest.spyOn(chatService, 'getMessageTooltip').mockReturnValue('some-tooltip');
    const tooltip = component.getLabel('some-action');
    expect(tooltip).toBe('some-tooltip');
  });

  it('should update the ability to add a train run based on the configuration and the current order items in orderData', () => {
    const config = {
      maxNumberOfOrderItemsPerOrder: 3,
    };
    const orderData = {
      orderItems: [
        { id: '1', content: { item: {} } },
        { id: '2', content: { item: {} } },
      ],
    };

    component.configDataService.configData = config;
    component.orderData = orderData;
    component.updateAddTrainRun();

    expect(component.canEditOrderDetails).toBe(true);
  });

  it('should call updateColumnsActionVisibility with correct order state', () => {
    const orderState = OrderState.DRAFT;
    const updateColumnsActionVisibilitySpy = jest.spyOn(component, 'updateColumnsActionVisibility');
    component.updateColumnsActionVisibility(orderState);
    expect(updateColumnsActionVisibilitySpy).toHaveBeenCalledWith(orderState);
  });

  it('should call getOrderDetails with correct externalId', () => {
    const externalId = '12345';
    const getOrderDetailsSpy = jest.spyOn(component, 'getOrderDetails');
    component.getOrderDetails(externalId);
    expect(getOrderDetailsSpy).toHaveBeenCalledWith(externalId);
  });

  it('should call openConfirmationDialog with correct message on cancelOrder', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(true));
    component.cancelOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalledWith(component.tr.translate('msgCancelOrder'));
  });

  it('should call openConfirmationDialog with correct message on deleteOrder', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(true));
    component.deleteOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalledWith(component.tr.translate('msgDelete'));
  });

  it('should call createDraftOrder with correct subject on copyOrder', () => {
    const createDraftOrderSpy = jest.spyOn(component, 'createDraftOrder').mockReturnValue(of({} as OrderResponse));
    component.orderForm.setValue({ subject: 'Test Order', orderType: OrderType.LTP, description: '' });
    component.copyOrder();
    expect(createDraftOrderSpy).toHaveBeenCalledWith(component.tr.translate('lblcopy') + 'Test Order', OrderType.LTP, '');
  });

  it('should call chatService.openMessageDialog with correct orderData and fetch order details after dialog close', () => {
    const mockDialogRef = {
      afterClosed: jest.fn().mockReturnValue(of({})),
    };
    jest.spyOn(chatService, 'checkMessagePermission').mockReturnValue(of([]));
    jest.spyOn(chatService, 'openMessageDialog').mockReturnValue(mockDialogRef);
    jest.spyOn(orderingActionService, 'getOrderDetails').mockReturnValue(of({} as OrderResponse));
    component.orderData = { externalId: '123', name: 'Test Order' } as OrderResponse;
    component.openMessageDialog();
    // Uses the provided orderData.externalId ('123'), not the initial fixture orderResponse id
    expect(chatService.checkMessagePermission).toHaveBeenCalledWith('123');
    expect(chatService.openMessageDialog).toHaveBeenCalledWith(component.orderData);
    expect(mockDialogRef.afterClosed).toHaveBeenCalled();
    expect(orderingActionService.getOrderDetails).toHaveBeenCalledWith('123');
  });

  it('should not open message dialog when permission check fails', () => {
    const mockError = new Error('Permission denied');
    jest.spyOn(chatService, 'checkMessagePermission').mockReturnValue(throwError(() => mockError));
    jest.spyOn(chatService, 'openMessageDialog');
    jest.spyOn(console, 'error').mockImplementation(() => {});

    component.orderData = { externalId: '123', name: 'Test Order' } as OrderResponse;
    component.openMessageDialog();

    expect(chatService.checkMessagePermission).toHaveBeenCalledWith('123');
    expect(chatService.openMessageDialog).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Permission check failed:', mockError);
  });

  it('should call chatService.getMessageTooltip with correct action on getLabel', () => {
    const action = 1;
    const getMessageTooltipSpy = jest.spyOn(chatService, 'getMessageTooltip');
    component.getLabel(action);
    expect(getMessageTooltipSpy).toHaveBeenCalledWith(action);
  });

  it('should call chatService.getMatIcon with correct action on getMatIcon', () => {
    const action = 1;
    const getMatIconSpy = jest.spyOn(chatService, 'getMatIcon');
    component.getMatIcon(action);
    expect(getMatIconSpy).toHaveBeenCalledWith(action);
  });

  it('should not call createDraftOrder or editOrderDetails if subject is not provided', () => {
    const createDraftOrderSpy = jest.spyOn(component, 'createDraftOrder');
    const editOrderDetailsSpy = jest.spyOn(component, 'editOrderDetails');
    component.orderForm.setValue({ subject: '', orderType: OrderType.LTP, description: '' });
    component.onSubmit();
    expect(createDraftOrderSpy).not.toHaveBeenCalled();
    expect(editOrderDetailsSpy).not.toHaveBeenCalled();
  });

  it('should call createDraftOrder if subject is provided and externalId is not present', () => {
    const createDraftOrderSpy = jest.spyOn(component, 'createNewOrder');
    const editOrderDetailsSpy = jest.spyOn(component, 'editOrderDetails');
    component.orderForm.setValue({ subject: 'Test Order', orderType: OrderType.LTP, description: '' });
    jest.spyOn(component.route.snapshot.paramMap, 'get').mockReturnValue(null);
    component.onSubmit();
    expect(createDraftOrderSpy).toHaveBeenCalledWith();
    expect(editOrderDetailsSpy).not.toHaveBeenCalled();
  });
  it('should call createNewOrder', () => {
    const createNewOrderSpy = jest.spyOn(component, 'createNewOrder');
    const editOrderDetailsSpy = jest.spyOn(component, 'editOrderDetails');
    component.orderForm.setValue({ subject: 'Test Order', orderType: OrderType.LTP, description: '' });
    jest.spyOn(component.route.snapshot.paramMap, 'get').mockReturnValue(null);
    component.onSubmit();
    expect(createNewOrderSpy).toHaveBeenCalledWith();
    expect(editOrderDetailsSpy).not.toHaveBeenCalled();
  });

  it('should call editOrderDetails with correct order details', () => {
    const orderToEdit: OrderResponse = { subject: 'Updated Order', externalId: '12345' };
    component.orderData = { externalId: '12345', name: 'Test Order' } as OrderResponse;
    const editOrderDetailsSpy = jest.spyOn(orderingActionService, 'editOrderDetails').mockReturnValue(of({}));

    if (component.orderData?.externalId) {
      component.editOrderDetails(orderToEdit);
    }

    expect(editOrderDetailsSpy).toHaveBeenCalledWith('12345', orderToEdit);
  });

  it('should terminate editOrderDetails method if externalId is not present', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    component.orderData = { externalId: null, subject: 'Test Order' } as OrderResponse;
    const orderToEdit: Order = { subject: 'Updated Order' };
    const editOrderDetailsSpy = jest.spyOn(orderingActionService, 'editOrderDetails');

    component.editOrderDetails(orderToEdit);

    expect(consoleErrorSpy).toHaveBeenCalledWith('editOrderDetails: externalId is undefined or null');
    expect(editOrderDetailsSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('should show success notification on successful editOrderDetails', () => {
    const orderToEdit: Order = { subject: 'Updated Order' };
    component.orderData = { externalId: '12345', name: 'Test Order' } as OrderResponse;
    jest.spyOn(orderingActionService, 'editOrderDetails').mockReturnValue(of({}));
    const pushNotificationSpy = jest.spyOn(component.notificationService, 'pushNotification');

    component.editOrderDetails(orderToEdit);

    expect(pushNotificationSpy).toHaveBeenCalledWith(component.tr.translate('msgSuccessUpdateOrder'), SNACKBARCONFIG_SUCCESS);
  });

  it('should show error notification on failed editOrderDetails', () => {
    const orderToEdit: Order = { subject: 'Updated Order' };
    component.orderData = { externalId: '12345', name: 'Test Order' } as OrderResponse;
    jest.spyOn(orderingActionService, 'editOrderDetails').mockReturnValue(
      of({}).pipe(
        map(() => {
          throw new Error();
        }),
        finalize(() => {}),
      ),
    );
    const pushNotificationSpy = jest.spyOn(component.notificationService, 'pushNotification');

    component.editOrderDetails(orderToEdit);

    expect(pushNotificationSpy).toHaveBeenCalledWith(component.tr.translate('msgErrorUpdateOrder'), SNACKBARCONFIG_ERROR);
  });

  it('should call getOrderDetails after successful editOrderDetails', () => {
    const orderToEdit: Order = { subject: 'Updated Order' };
    component.orderData = { externalId: '12345', name: 'Test Order' } as OrderResponse;
    jest.spyOn(orderingActionService, 'editOrderDetails').mockReturnValue(of({}));
    const getOrderDetailsSpy = jest.spyOn(component, 'getOrderDetails');

    component.editOrderDetails(orderToEdit);

    expect(getOrderDetailsSpy).toHaveBeenCalledWith('12345');
  });

  it('should not navigate if orderData is not present', () => {
    component.orderData = undefined;
    component.navigateToAddOrderItem();
    expect(navigationService.navigate).not.toHaveBeenCalled();
  });

  it('should not navigate if orderData.externalId is not present', () => {
    component.orderData = { externalId: undefined } as OrderResponse;
    component.navigateToAddOrderItem();
    expect(navigationService.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to add order item page if orderData.externalId is present', () => {
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.navigateToAddOrderItem();
    expect(navigationService.navigate).toHaveBeenCalledWith(['/orders', '12345', 'order-items', 'add'], {
      extras: { state: { moduleId: undefined } },
    });
  });

  it('should call openConfirmationDialog with correct message on cancelOrder', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(true));
    component.cancelOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalledWith(component.tr.translate('msgCancelOrder'));
  });

  it('should call orderActionsService.cancelOrder with correct externalId if confirmed', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(true));
    const cancelOrderSpy = jest.spyOn(orderingActionService, 'cancelOrder');
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.cancelOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalled();
    expect(cancelOrderSpy).toHaveBeenCalledWith('12345');
  });

  it('should not call orderActionsService.cancelOrder if not confirmed', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(false));
    const cancelOrderSpy = jest.spyOn(orderingActionService, 'cancelOrder');
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.cancelOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalled();
    expect(cancelOrderSpy).not.toHaveBeenCalled();
  });

  it('should not call orderActionsService.cancelOrder if externalId is not present', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(true));
    const cancelOrderSpy = jest.spyOn(orderingActionService, 'cancelOrder');
    component.orderData = { externalId: undefined } as OrderResponse;
    component.cancelOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalled();
    expect(cancelOrderSpy).not.toHaveBeenCalled();
  });
  it('should open confirmation dialog with the correct message', () => {
    const message = 'Are you sure you want to cancel?';
    const dialogRefMock = {
      afterClosed: jest.fn().mockReturnValue(of(true)),
    };
    jest.spyOn(component.dialog, 'open').mockReturnValue(dialogRefMock as any);

    const subscription = component.openConfirmationDialog(message).subscribe(result => {
      expect(result).toBe(true);
    });
    subscriptions.push(subscription);

    expect(component.dialog.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      width: '450px',
      data: { message: message },
    });
    expect(dialogRefMock.afterClosed).toHaveBeenCalled();
  });

  it('should return false when dialog is closed without confirmation', () => {
    const message = 'Are you sure you want to delete?';
    const dialogRefMock = {
      afterClosed: jest.fn().mockReturnValue(of(false)),
    };
    jest.spyOn(component.dialog, 'open').mockReturnValue(dialogRefMock as any);

    const subscription = component.openConfirmationDialog(message).subscribe(result => {
      expect(result).toBe(false);
    });
    subscriptions.push(subscription);

    expect(component.dialog.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      width: '450px',
      data: { message: message },
    });
    expect(dialogRefMock.afterClosed).toHaveBeenCalled();
  });

  it('should call openConfirmationDialog with correct message on deleteOrder', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(true));
    component.deleteOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalledWith(component.tr.translate('msgDelete'));
  });

  it('should call orderActionsService.deleteDraftOrder with correct externalId if confirmed', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(true));
    const deleteDraftOrderSpy = jest.spyOn(orderingActionService, 'deleteDraftOrder').mockReturnValue(of({}));
    const showSpinnerSpy = jest.spyOn(component.loadingSpinnerService, 'showSpinner');
    const hideSpinnerSpy = jest.spyOn(component.loadingSpinnerService, 'hideSpinner');
    const pushNotificationSpy = jest.spyOn(component.notificationService, 'pushNotification');

    component.orderData = { externalId: '12345' } as OrderResponse;
    component.deleteOrder();

    expect(openConfirmationDialogSpy).toHaveBeenCalled();
    expect(showSpinnerSpy).toHaveBeenCalled();
    expect(deleteDraftOrderSpy).toHaveBeenCalledWith('12345');
    expect(pushNotificationSpy).toHaveBeenCalledWith(component.tr.translate('msgSuccessDeleteDraftOrder'), SNACKBARCONFIG_SUCCESS);
    expect(navigationService.navigateToList).toHaveBeenCalled();
    expect(hideSpinnerSpy).toHaveBeenCalled();
  });

  it('should not call orderActionsService.deleteDraftOrder if not confirmed', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(false));
    const deleteDraftOrderSpy = jest.spyOn(orderingActionService, 'deleteDraftOrder');
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.deleteOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalled();
    expect(deleteDraftOrderSpy).not.toHaveBeenCalled();
  });

  it('should not call orderActionsService.deleteDraftOrder if externalId is not present', () => {
    const openConfirmationDialogSpy = jest.spyOn(component, 'openConfirmationDialog').mockReturnValue(of(true));
    const deleteDraftOrderSpy = jest.spyOn(orderingActionService, 'deleteDraftOrder');
    component.orderData = { externalId: undefined } as OrderResponse;
    component.deleteOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalled();
    expect(deleteDraftOrderSpy).not.toHaveBeenCalled();
  });

  it('should call createOrderItem for each item in orderItems', () => {
    const newOrderId = 'newOrderId';
    const orderItems: OrderItemResponse[] = [
      { content: { item: { externalId: 'item1' } } } as OrderItemResponse,
      { content: { item: { externalId: 'item2' } } } as OrderItemResponse,
    ];

    const createOrderItemSpy = jest.spyOn(orderingActionService, 'createOrderItem').mockReturnValue(of({} as OrderItemResponse));

    const subscription = component.copyOrderItems(newOrderId, orderItems).subscribe();
    subscriptions.push(subscription);

    expect(createOrderItemSpy).toHaveBeenCalledTimes(orderItems.length);
    orderItems.forEach(item => {
      expect(createOrderItemSpy).toHaveBeenCalledWith(newOrderId, {
        content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: item.content.item },
      });
    });
  });

  it('should return an observable that emits an array of arrays of OrderItemResponse objects', done => {
    const newOrderId = 'newOrderId';
    const orderItems: OrderItemResponse[] = [
      { content: { item: { externalId: 'item1' } } } as OrderItemResponse,
      { content: { item: { externalId: 'item2' } } } as OrderItemResponse,
    ];

    const mockResponses: OrderItemResponse[] = [
      { content: { item: { externalId: 'item1' } } } as OrderItemResponse,
      { content: { item: { externalId: 'item2' } } } as OrderItemResponse,
    ];

    jest
      .spyOn(orderingActionService, 'createOrderItem')
      .mockReturnValueOnce(of(mockResponses[0]))
      .mockReturnValueOnce(of(mockResponses[1]));

    const subscription = component.copyOrderItems(newOrderId, orderItems).subscribe(response => {
      expect(response).toEqual(mockResponses);
      done();
    });
    subscriptions.push(subscription);
  });

  it('should propagate an error if any createOrderItem call fails', done => {
    const newOrderId = 'order-123';
    const orderItems = [{ content: { externalId: 'Item1' } }, { content: { externalId: 'Item2' } }] as OrderItemResponse[];

    // Mock first call to succeed and second call to fail
    jest
      .spyOn(orderingActionService, 'createOrderItem')
      .mockReturnValueOnce(of({ content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: 'Item1' } }))
      .mockReturnValueOnce(throwError(() => new Error('Failed to create item')));

    const subscription = component.copyOrderItems(newOrderId, orderItems).subscribe({
      next: () => fail('Should not succeed'),
      error: err => {
        expect(err).toEqual(new Error('Failed to create item')); // Expect the error to be propagated
        done();
      },
    });
    subscriptions.push(subscription);
  });

  it('should initialize tabs and select the first tab in ngAfterViewInit', () => {
    const handleTabSelectionSpy = jest.spyOn(component as any, 'handleTabSelection');
    component.itemsTabs = {
      selectedIndex: 0,
    } as MatTabGroup;
    // Set up orderData so that handleTabSelection will be called
    component.orderData = {
      externalId: 'test-order',
      state: OrderState.DRAFT,
    } as OrderResponse;
    component.ngAfterViewInit();
    expect(component.itemsSelectedTab).toEqual(component.tabs[0]);
    expect(component.itemsTabs.selectedIndex).toBe(0);
    expect(handleTabSelectionSpy).toHaveBeenCalled();
  });

  it('should save the initial form state in saveFormState', () => {
    component.orderForm.setValue({ subject: 'Test Order', orderType: OrderType.LTP, description: '' });
    component['saveFormState']();
    expect(component['initialFormValues']).toEqual({ subject: 'Test Order', orderType: OrderType.LTP, description: '' });
    expect(component.isFormChanged()).toBe(false);
  });

  it('should update action visibility in updateColumnsActionVisibility', () => {
    const orderState = OrderState.DRAFT;
    component.updateColumnsActionVisibility(orderState);
    component.itemsColumns.forEach(column => {
      if (column.columnDef === 'itemActions' && column.actionsList) {
        column.actionsList.forEach(action => {
          if (['DELETE', 'EDIT'].includes(action.actionName)) {
            expect(action.actionVisibility).toBe(true);
          }
          if (action.actionName === 'VIEW') {
            expect(action.actionVisibility).toBe(false);
          }
        });
      }
    });
  });

  it('should show offerDeadline column when on offered tab with STP order', () => {
    component['itemsSelectedTab'] = { name: TabsTypesEnum.OFFERED_ITEMS } as ITabInstanceData;
    component.orderData = { orderType: OrderType.STP, state: OrderState.OFFERED } as OrderResponse;
    expect(component['isOfferDeadlineColumnVisible']()).toBe(true);
  });

  it('should hide offerDeadline column when not on offered tab', () => {
    component['itemsSelectedTab'] = { name: TabsTypesEnum.ORDERED_ITEMS } as ITabInstanceData;
    component.orderData = { orderType: OrderType.STP, state: OrderState.DRAFT } as OrderResponse;
    expect(component['isOfferDeadlineColumnVisible']()).toBe(false);
  });

  it('should hide offerDeadline column when on offered tab but not STP order', () => {
    component['itemsSelectedTab'] = { name: TabsTypesEnum.OFFERED_ITEMS } as ITabInstanceData;
    component.orderData = { orderType: OrderType.LTP, state: OrderState.OFFERED } as OrderResponse;
    expect(component['isOfferDeadlineColumnVisible']()).toBe(false);
  });

  it('should have offerDeadline column with function-based columnVisibility', () => {
    const offerDeadlineColumn = component.itemsColumns.find(col => col.columnDef === 'offerDeadline');
    expect(typeof offerDeadlineColumn?.columnVisibility).toBe('function');
  });

  it('should show delete action for DRAFT order state', () => {
    expect(component['isDeleteActionVisible'](OrderState.DRAFT)).toBe(true);
  });

  it('should hide delete action for readonly order state', () => {
    expect(component['isDeleteActionVisible'](OrderState.CANCELLED)).toBe(false);
  });

  it('should show edit action for DRAFT order state', () => {
    expect(component['isEditActionVisible'](OrderState.DRAFT)).toBe(true);
  });

  it('should hide edit action for readonly order state', () => {
    expect(component['isEditActionVisible'](OrderState.CANCELLED)).toBe(false);
  });

  it('should hide view action for DRAFT order state', () => {
    expect(component['isViewActionVisible'](OrderState.DRAFT)).toBe(false);
  });

  it('should show view action for readonly order state', () => {
    expect(component['isViewActionVisible'](OrderState.CANCELLED)).toBe(true);
  });

  it('should show cancel/modify train run for AGREED order on offered tab', () => {
    component['itemsSelectedTab'] = { name: TabsTypesEnum.OFFERED_ITEMS } as ITabInstanceData;
    component.orderData = { orderItems: [{ content: { action: OrderItemAction.CREATION } }] } as OrderResponse;
    expect(component['isCancelOrModifyTrainRunVisible'](OrderState.AGREED)).toBe(true);
  });

  it('should hide cancel/modify train run for non-AGREED order state', () => {
    component['itemsSelectedTab'] = { name: TabsTypesEnum.OFFERED_ITEMS } as ITabInstanceData;
    component.orderData = { orderItems: [{ content: { action: OrderItemAction.CREATION } }] } as OrderResponse;
    expect(component['isCancelOrModifyTrainRunVisible'](OrderState.DRAFT)).toBe(false);
  });

  it('should call getOrderDetails and processOrderResponse when externalId is provided', () => {
    const processOrderResponseSpy = jest.spyOn(component as any, 'processOrderResponse');
    const externalId = '12345';
    jest.spyOn(component.orderActionsService, 'getOrderDetails').mockReturnValue(of({}));
    component.getOrderDetails(externalId);
    expect(component.orderActionsService.getOrderDetails).toHaveBeenCalledWith(externalId);
    expect(processOrderResponseSpy).toHaveBeenCalled();
  });

  it('should patch form values with order data in patchFormValue', () => {
    component.orderData = {
      subject: 'Test Order',
    } as OrderResponse;
    component['patchFormValue']();
    expect(component.orderForm.value).toEqual({
      subject: 'Test Order',
      orderType: undefined,
      description: '',
    });
  });

  it('should navigate to /list on onCancel', () => {
    component.onCancel();
    expect(navigationService.navigateToList).toHaveBeenCalled();
  });

  it('should call createNewOrder if externalId is not present in onSubmit', () => {
    const createNewOrderSpy = jest.spyOn(component, 'createNewOrder');
    component.orderForm.setValue({ subject: 'Test Order', orderType: OrderType.LTP, description: '' });
    jest.spyOn(component.route.snapshot.paramMap, 'get').mockReturnValue(null);
    component.onSubmit();
    expect(createNewOrderSpy).toHaveBeenCalled();
  });

  it('should call editOrderDetails if subject is provided and externalId is present', () => {
    component.orderData = { externalId: '123', name: 'Test Order' } as OrderResponse;

    // Mock route parameter before calling onSubmit
    jest.spyOn(component.route.snapshot.paramMap, 'get').mockReturnValue('123');

    const createDraftOrderSpy = jest.spyOn(component, 'createNewOrder'); // Corrected method name
    const editOrderDetailsSpy = jest.spyOn(component, 'editOrderDetails');

    component.orderForm.setValue({ subject: 'Test Order', orderType: OrderType.LTP, description: '' });

    component.onSubmit();

    expect(createDraftOrderSpy).not.toHaveBeenCalled();
    expect(editOrderDetailsSpy).toHaveBeenCalledWith({
      subject: 'Test Order',
      orderType: OrderType.LTP,
      description: '',
    });
  });

  it('should create a draft order and navigate to order details page in createDraftOrder', done => {
    const mockOrderResponse: OrderResponse = { externalId: '12345' } as OrderResponse;
    jest.spyOn(component.orderActionsService, 'createDraftOrder').mockReturnValue(of(mockOrderResponse));
    const subscription = component.createDraftOrder('Test Order').subscribe(() => {
      expect(navigationService.navigate).toHaveBeenCalledWith(['/orders', '12345'], {
        extras: { queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS } },
      });
      done();
    });
    subscriptions.push(subscription);
  });

  it('should call createDraftOrder in createNewOrder', () => {
    const createDraftOrderSpy = jest.spyOn(component, 'createDraftOrder').mockReturnValue(of({} as OrderResponse));
    component.orderForm.setValue({ subject: 'Test Order', orderType: OrderType.LTP, description: '' });
    component.createNewOrder();
    expect(createDraftOrderSpy).toHaveBeenCalledWith('Test Order', 0, '');
  });

  it('should call openConfirmationDialog and cancelOrder in cancelOrder', () => {
    const openConfirmationDialogSpy = jest.spyOn(component as any, 'openConfirmationDialog').mockReturnValue(of(true));
    const cancelOrderSpy = jest.spyOn(component.orderActionsService, 'cancelOrder');
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.cancelOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalledWith(component.tr.translate('msgCancelOrder'));
    expect(cancelOrderSpy).toHaveBeenCalledWith('12345');
  });

  it('should call openConfirmationDialog and deleteDraftOrder in deleteOrder', () => {
    const openConfirmationDialogSpy = jest.spyOn(component as any, 'openConfirmationDialog').mockReturnValue(of(true));
    const deleteDraftOrderSpy = jest.spyOn(component.orderActionsService, 'deleteDraftOrder').mockReturnValue(of({}));
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.deleteOrder();
    expect(openConfirmationDialogSpy).toHaveBeenCalledWith(component.tr.translate('msgDelete'));
    expect(deleteDraftOrderSpy).toHaveBeenCalledWith('12345');
  });

  it('should copy order items in copyOrderItems', done => {
    const newOrderId = 'newOrderId';
    const orderItems: OrderItemResponse[] = [
      { content: { item: { externalId: 'item1' } } } as OrderItemResponse,
      { content: { item: { externalId: 'item2' } } } as OrderItemResponse,
    ];
    jest.spyOn(component.orderActionsService, 'createOrderItem').mockReturnValue(of({} as OrderItemResponse));
    const subscription = component.copyOrderItems(newOrderId, orderItems).subscribe(() => {
      expect(component.orderActionsService.createOrderItem).toHaveBeenCalledTimes(orderItems.length);
      done();
    });
    subscriptions.push(subscription);
  });

  it('should handle tab selection in handleTabSelection', () => {
    const handleOrderedItemsTabSpy = jest.spyOn(component as any, 'handleOrderedItemsTab');
    const handleOfferedItemsTabSpy = jest.spyOn(component as any, 'handleOfferedItemsTab');
    component.itemsSelectedTab = { name: TabsTypesEnum.ORDERED_ITEMS } as ITabInstanceData;
    component['handleTabSelection']();
    expect(handleOrderedItemsTabSpy).toHaveBeenCalled();

    component.itemsSelectedTab = { name: TabsTypesEnum.OFFERED_ITEMS } as ITabInstanceData;
    component['handleTabSelection']();
    expect(handleOfferedItemsTabSpy).toHaveBeenCalled();
  });

  it('should handle ordered items tab in handleOrderedItemsTab', () => {
    component.orderActionsService = {
      ...orderingActionService,
      readonlyOrderStates: [OrderState.CANCELLED, OrderState.ARCHIVED],
      currentlySelectedOrderSig: jest.fn().mockReturnValue(orderResponse),
    } as any;
    component.orderData = {
      externalId: 'order1',
      state: OrderState.DRAFT,
      orderItems: [
        { externalId: 'item1', content: { item: { trainNumber: '100' } } },
        { externalId: 'item2', content: { item: { trainNumber: '200' } } },
      ],
    } as OrderResponse;
    component['handleOrderedItemsTab']();
    expect(component.itemsDataSource()?.data.length).toBe(2);
    expect(component.externalItemId).toEqual(['item1', 'item2']);
  });

  it('should handle offered items tab in handleOfferedItemsTab', () => {
    component.orderActionsService = {
      ...orderingActionService,
      readonlyOrderStates: [OrderState.CANCELLED, OrderState.ARCHIVED],
      offerAvailableStates: [OrderState.OFFERED],
      offeredItemActionStates: [OrderState.OFFERED],
      currentlySelectedOrderSig: jest.fn().mockReturnValue(orderResponse),
    } as any;
    component.orderData = {
      externalId: 'order1',
      state: OrderState.OFFERED,
      orderItems: [
        {
          externalId: 'orderItem1',
          offerItems: [
            { externalId: 'offer1', content: { item: { trainNumber: '100' } }, offerDeadline: '2026-03-15T12:00:00Z' },
            { externalId: 'offer2', content: { item: { trainNumber: '200' } }, offerDeadline: '2026-04-01T12:00:00Z' },
          ],
        },
      ],
    } as OrderResponse;
    component['handleOfferedItemsTab']();
    expect(component.itemsDataSource()?.data.length).toBe(2);
    expect(component.externalItemId).toEqual(['offer1', 'offer2']);
    expect(component.itemsDataSource()?.data[0]).toEqual(
      expect.objectContaining({
        externalId: 'orderItem1',
        offerItemExternalId: 'offer1',
        offerDeadline: '2026-03-15T12:00:00Z',
      }),
    );
  });

  it('should call refuseOfferItem for all items on refuseOffer', () => {
    const refuseOfferItemSpy = jest.spyOn(orderingActionService, 'refuseOfferItem').mockReturnValue(of({}));
    const getOrderDetailsSpy = jest.spyOn(component, 'getOrderDetails');
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.externalItemId = ['item1', 'item2', 'item3'];

    component.refuseOffer();

    expect(refuseOfferItemSpy).toHaveBeenCalledTimes(3);
    expect(refuseOfferItemSpy).toHaveBeenCalledWith('12345', 'item1');
    expect(refuseOfferItemSpy).toHaveBeenCalledWith('12345', 'item2');
    expect(refuseOfferItemSpy).toHaveBeenCalledWith('12345', 'item3');
    expect(getOrderDetailsSpy).toHaveBeenCalledWith('12345', true);
  });

  it('should not call refuseOfferItem if orderData is not present', () => {
    const refuseOfferItemSpy = jest.spyOn(orderingActionService, 'refuseOfferItem');
    component.orderData = undefined;

    component.refuseOffer();

    expect(refuseOfferItemSpy).not.toHaveBeenCalled();
  });

  it('should not call refuseOfferItem if externalItemId is empty', () => {
    const refuseOfferItemSpy = jest.spyOn(orderingActionService, 'refuseOfferItem');
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.externalItemId = [];

    component.refuseOffer();

    expect(refuseOfferItemSpy).not.toHaveBeenCalled();
  });

  it('should call confirmOfferItem for all items on confirmOffer', () => {
    const confirmOfferItemSpy = jest.spyOn(orderingActionService, 'confirmOfferItem').mockReturnValue(of({}));
    const getOrderDetailsSpy = jest.spyOn(component, 'getOrderDetails');
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.externalItemId = ['item1', 'item2'];

    component.confirmOffer();

    expect(confirmOfferItemSpy).toHaveBeenCalledTimes(2);
    expect(confirmOfferItemSpy).toHaveBeenCalledWith('12345', 'item1');
    expect(confirmOfferItemSpy).toHaveBeenCalledWith('12345', 'item2');
    expect(getOrderDetailsSpy).toHaveBeenCalledWith('12345', true);
  });

  it('should not call confirmOfferItem if orderData is not present', () => {
    const confirmOfferItemSpy = jest.spyOn(orderingActionService, 'confirmOfferItem');
    component.orderData = undefined;

    component.confirmOffer();

    expect(confirmOfferItemSpy).not.toHaveBeenCalled();
  });

  it('should not call confirmOfferItem if externalItemId is empty', () => {
    const confirmOfferItemSpy = jest.spyOn(orderingActionService, 'confirmOfferItem');
    component.orderData = { externalId: '12345' } as OrderResponse;
    component.externalItemId = [];

    component.confirmOffer();

    expect(confirmOfferItemSpy).not.toHaveBeenCalled();
  });

  describe('Confirm Offer button visibility for LTP orders', () => {
    let userPermissionService: UserPermissionService;

    beforeEach(() => {
      userPermissionService = TestBed.inject(UserPermissionService);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return true from canConfirmOfferLtp when permission is granted', () => {
      jest.spyOn(userPermissionService, 'checkPermissions').mockReturnValue(true);
      expect(component.canConfirmOfferLtp).toBe(true);
    });

    it('should return false from canConfirmOfferLtp when permission is absent', () => {
      jest.spyOn(userPermissionService, 'checkPermissions').mockReturnValue(false);
      expect(component.canConfirmOfferLtp).toBe(false);
    });

    it('should compute display button true for LTP when canConfirmOfferLtp is true', () => {
      jest.spyOn(userPermissionService, 'checkPermissions').mockReturnValue(true);
      component.orderData = { ...orderResponse, orderType: OrderType.LTP } as OrderResponse;
      component.displayOfferActionButton.set(true);
      expect(component.isConfirmOfferButtonVisible).toBe(true);
    });

    it('should compute display button false for LTP when canConfirmOfferLtp is false', () => {
      jest.spyOn(userPermissionService, 'checkPermissions').mockReturnValue(false);
      component.orderData = { ...orderResponse, orderType: OrderType.LTP } as OrderResponse;
      component.displayOfferActionButton.set(true);
      expect(component.isConfirmOfferButtonVisible).toBe(false);
    });

    it('should compute display button true for STP regardless of canConfirmOfferLtp (regression guard)', () => {
      jest.spyOn(userPermissionService, 'checkPermissions').mockReturnValue(false);
      component.orderData = { ...orderResponse, orderType: OrderType.STP } as OrderResponse;
      component.displayOfferActionButton.set(true);
      expect(component.isConfirmOfferButtonVisible).toBe(true);
    });

    it('should compute display button false when displayOfferActionButton is false', () => {
      jest.spyOn(userPermissionService, 'checkPermissions').mockReturnValue(true);
      component.orderData = { ...orderResponse, orderType: OrderType.LTP } as OrderResponse;
      component.displayOfferActionButton.set(false);
      expect(component.isConfirmOfferButtonVisible).toBe(false);
    });
  });

  it('should handle tabClicked and call handleTabSelection', () => {
    const handleTabSelectionSpy = jest.spyOn(component as any, 'handleTabSelection');
    const tabChangeEvent = { index: 1 } as MatTabChangeEvent;

    component.tabClicked(tabChangeEvent);

    expect(component.itemsSelectedTab).toEqual(component.tabs[1]);
    expect(handleTabSelectionSpy).toHaveBeenCalled();
  });

  it('should update canEditOrderDetails based on config and orderData in updateAddTrainRun', () => {
    component.configData = {
      maxNumberOfOrderItemsPerOrder: 2,
      userProfile: {
        userAccessRights: {} as UserAccessRights,
      },
    } as Config;
    component.orderData = {
      orderItems: [{}, {}],
      state: OrderState.DRAFT,
    } as OrderResponse;

    component['updateAddTrainRun']();

    expect(component.canEditOrderDetails).toBe(false);
  });

  it('should not update canEditOrderDetails if configData or orderData is not present', () => {
    component.configData = undefined;
    component.orderData = undefined;

    component['updateAddTrainRun']();

    expect(component.canEditOrderDetails).toBe(true);
  });

  it('should call handleOrderedItemsTab when ORDERED_ITEMS tab is selected', () => {
    const handleOrderedItemsTabSpy = jest.spyOn(component as any, 'handleOrderedItemsTab');
    component.itemsSelectedTab = { name: TabsTypesEnum.ORDERED_ITEMS } as ITabInstanceData;

    component['handleTabSelection']();

    expect(handleOrderedItemsTabSpy).toHaveBeenCalled();
  });

  it('should call handleOfferedItemsTab when OFFERED_ITEMS tab is selected', () => {
    const handleOfferedItemsTabSpy = jest.spyOn(component as any, 'handleOfferedItemsTab');
    component.itemsSelectedTab = { name: TabsTypesEnum.OFFERED_ITEMS } as ITabInstanceData;

    component['handleTabSelection']();

    expect(handleOfferedItemsTabSpy).toHaveBeenCalled();
  });

  it('should log a warning when an unknown tab is selected', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    component.itemsSelectedTab = { name: 'UNKNOWN_TAB' } as ITabInstanceData;

    component['handleTabSelection']();

    expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown tab selected');
    consoleWarnSpy.mockRestore();
  });

  describe('setInitialTab', () => {
    let mockTabGroup: any;

    beforeEach(() => {
      mockTabGroup = {
        _selectedIndex: 0,
        get selectedIndex() {
          return this._selectedIndex;
        },
        set selectedIndex(value: number) {
          this._selectedIndex = value;
        },
      };
      component.itemsTabs = mockTabGroup as MatTabGroup;
    });

    it('should set first tab (index 0) as initial when order state is AGREED and is train run cancellation', () => {
      component.orderData = {
        state: OrderState.AGREED,
        externalId: '12345',
      } as OrderResponse;
      component.orderActionsService.isTrainRunCancellation = true;

      component['setInitialTab'](mockTabGroup);

      expect(component.itemsSelectedTab).toEqual(component.tabs[0]);
      expect(mockTabGroup.selectedIndex).toBe(0);
    });

    it('should set first tab (index 0) as initial when order state is not AGREED', () => {
      component.orderData = {
        state: OrderState.DRAFT,
        externalId: '12345',
      } as OrderResponse;
      component.orderActionsService.isTrainRunCancellation = false;

      component['setInitialTab'](mockTabGroup);

      expect(component.itemsSelectedTab).toEqual(component.tabs[0]);
      expect(mockTabGroup.selectedIndex).toBe(0);
    });

    it('should set second tab (index 1) as initial when order state is AGREED and is not train run cancellation', () => {
      component.orderData = {
        state: OrderState.AGREED,
        externalId: '12345',
      } as OrderResponse;
      component.orderActionsService.isTrainRunCancellation = false;

      component['setInitialTab'](mockTabGroup);

      expect(component.itemsSelectedTab).toEqual(component.tabs[1]);
      expect(mockTabGroup.selectedIndex).toBe(1);
    });

    it('should set first tab (index 0) as initial when orderData is undefined', () => {
      component.orderData = undefined;
      component.orderActionsService.isTrainRunCancellation = false;

      component['setInitialTab'](mockTabGroup);

      expect(component.itemsSelectedTab).toEqual(component.tabs[0]);
      expect(mockTabGroup.selectedIndex).toBe(0);
    });
  });

  describe('ngAfterViewInit', () => {
    it('should call setInitialTab when itemsTabs is available', () => {
      const setInitialTabSpy = jest.spyOn(component as any, 'setInitialTab');
      const handleTabSelectionSpy = jest.spyOn(component as any, 'handleTabSelection');

      component.itemsTabs = {
        selectedIndex: 0,
      } as MatTabGroup;
      component.orderData = {
        state: OrderState.DRAFT,
        externalId: '12345',
      } as OrderResponse;

      component.ngAfterViewInit();

      expect(setInitialTabSpy).toHaveBeenCalledWith(component.itemsTabs);
      expect(handleTabSelectionSpy).toHaveBeenCalled();
    });

    it('should call setInitialTab but not handleTabSelection when orderData is not available', () => {
      const setInitialTabSpy = jest.spyOn(component as any, 'setInitialTab');
      const handleTabSelectionSpy = jest.spyOn(component as any, 'handleTabSelection');

      component.itemsTabs = {
        selectedIndex: 0,
      } as MatTabGroup;
      component.orderData = undefined;

      component.ngAfterViewInit();

      expect(setInitialTabSpy).toHaveBeenCalledWith(component.itemsTabs);
      expect(handleTabSelectionSpy).not.toHaveBeenCalled();
    });

    it('should not call setInitialTab when itemsTabs is not available', () => {
      const setInitialTabSpy = jest.spyOn(component as any, 'setInitialTab');

      component.itemsTabs = undefined;

      component.ngAfterViewInit();

      expect(setInitialTabSpy).not.toHaveBeenCalled();
    });
  });

  describe('processOrderResponse', () => {
    it('should call setInitialTab when itemsTabs and itemsSelectedTab are available', () => {
      const setInitialTabSpy = jest.spyOn(component as any, 'setInitialTab');
      const handleTabSelectionSpy = jest.spyOn(component as any, 'handleTabSelection');
      const updateAddTrainRunSpy = jest.spyOn(component as any, 'updateAddTrainRun');
      const updateColumnsActionVisibilitySpy = jest.spyOn(component, 'updateColumnsActionVisibility');
      const patchFormValueSpy = jest.spyOn(component as any, 'patchFormValue');
      const saveFormStateSpy = jest.spyOn(component as any, 'saveFormState');

      component.itemsTabs = {
        selectedIndex: 0,
      } as MatTabGroup;
      component.itemsSelectedTab = component.tabs[0];
      component.orderActionsService.currentlySelectedOrderSig = jest.fn().mockReturnValue({
        state: OrderState.DRAFT,
        externalId: '12345',
        orderType: OrderType.LTP,
      } as OrderResponse);

      component['processOrderResponse']();

      expect(updateAddTrainRunSpy).toHaveBeenCalled();
      expect(updateColumnsActionVisibilitySpy).toHaveBeenCalledWith(OrderState.DRAFT);
      expect(setInitialTabSpy).toHaveBeenCalledWith(component.itemsTabs);
      expect(handleTabSelectionSpy).toHaveBeenCalled();
      expect(patchFormValueSpy).toHaveBeenCalled();
      expect(saveFormStateSpy).toHaveBeenCalled();
    });

    it('should not call setInitialTab when itemsTabs is not available', () => {
      const setInitialTabSpy = jest.spyOn(component as any, 'setInitialTab');
      const updateAddTrainRunSpy = jest.spyOn(component as any, 'updateAddTrainRun');

      component.itemsTabs = undefined;
      component.itemsSelectedTab = component.tabs[0];
      component.orderActionsService.currentlySelectedOrderSig = jest.fn().mockReturnValue({
        state: OrderState.DRAFT,
        externalId: '12345',
      } as OrderResponse);

      component['processOrderResponse']();

      expect(updateAddTrainRunSpy).toHaveBeenCalled();
      expect(setInitialTabSpy).not.toHaveBeenCalled();
    });

    it('should not call setInitialTab when itemsSelectedTab is not available', () => {
      const setInitialTabSpy = jest.spyOn(component as any, 'setInitialTab');
      const updateAddTrainRunSpy = jest.spyOn(component as any, 'updateAddTrainRun');

      component.itemsTabs = {
        selectedIndex: 0,
      } as MatTabGroup;
      component.itemsSelectedTab = undefined;
      component.orderActionsService.currentlySelectedOrderSig = jest.fn().mockReturnValue({
        state: OrderState.DRAFT,
        externalId: '12345',
      } as OrderResponse);

      component['processOrderResponse']();

      expect(updateAddTrainRunSpy).toHaveBeenCalled();
      expect(setInitialTabSpy).not.toHaveBeenCalled();
    });

    it('should return early when orderData is not available', () => {
      const updateAddTrainRunSpy = jest.spyOn(component as any, 'updateAddTrainRun');

      component.orderActionsService.currentlySelectedOrderSig = jest.fn().mockReturnValue(undefined);

      component['processOrderResponse']();

      expect(updateAddTrainRunSpy).not.toHaveBeenCalled();
    });
  });

  describe('isCancellationOrderItem', () => {
    it('should return true when any order item type is TRAIN_RUN_CANCELLATION', () => {
      component.orderData = {
        ...orderResponse,
        orderItems: [
          { content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: {} } } as OrderItemResponse,
          { content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CANCELLATION, item: {} } } as OrderItemResponse,
        ],
      } as OrderResponse;

      expect(component['isCancellationOrderItem']).toBe(true);
    });

    it('should return false when no order item type is TRAIN_RUN_CANCELLATION', () => {
      component.orderData = {
        ...orderResponse,
        orderItems: [
          { content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: {} } } as OrderItemResponse,
          { content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: {} } } as OrderItemResponse,
        ],
      } as OrderResponse;

      expect(component['isCancellationOrderItem']).toBe(false);
    });

    it('should return false when orderData has no order items', () => {
      component.orderData = { ...orderResponse, orderItems: [] } as OrderResponse;

      expect(component['isCancellationOrderItem']).toBe(false);
    });

    it('should return false when orderData is undefined', () => {
      component.orderData = undefined;

      expect(component['isCancellationOrderItem']).toBe(false);
    });
  });

  describe('showRejectionReason', () => {
    it('should return true when order state is REJECTED and rejectionReason is present', () => {
      component.orderData = {
        ...orderResponse,
        state: OrderState.REJECTED,
        rejectionReason: 'Capacity not available',
      } as OrderResponse;

      expect(component['showRejectionReason']).toBe(true);
    });

    it('should return false when order state is REJECTED but rejectionReason is empty string', () => {
      component.orderData = {
        ...orderResponse,
        state: OrderState.REJECTED,
        rejectionReason: '',
      } as OrderResponse;

      expect(component['showRejectionReason']).toBe(false);
    });

    it('should return false when order state is REJECTED but rejectionReason is undefined', () => {
      component.orderData = {
        ...orderResponse,
        state: OrderState.REJECTED,
        rejectionReason: undefined,
      } as OrderResponse;

      expect(component['showRejectionReason']).toBe(false);
    });

    it('should return false when order state is not REJECTED even if rejectionReason is present', () => {
      component.orderData = {
        ...orderResponse,
        state: OrderState.DRAFT,
        rejectionReason: 'Some reason',
      } as OrderResponse;

      expect(component['showRejectionReason']).toBe(false);
    });

    it('should return false when orderData is undefined', () => {
      component.orderData = undefined;

      expect(component['showRejectionReason']).toBe(false);
    });
  });
  describe('Description Control', () => {
    it('should get descriptionControl from orderForm', () => {
      component['orderForm'].get('description')?.setValue('Test description');

      const control = component['descriptionControl'];
      expect(control).toBeDefined();
      expect(control.value).toBe('Test description');
    });

    it('should return correct FormControl instance for descriptionControl', () => {
      const control = component['descriptionControl'];
      expect(control).toBeDefined();
      expect(control.setValue).toBeDefined();
      expect(control.value).toBeDefined();
    });

    it('should update descriptionControl value when orderForm description changes', () => {
      component['orderForm'].get('description')?.setValue('Updated description');

      expect(component['descriptionControl'].value).toBe('Updated description');
    });
  });
});
