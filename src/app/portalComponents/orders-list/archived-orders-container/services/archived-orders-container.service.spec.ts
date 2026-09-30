// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, EMPTY } from 'rxjs';

import { OrderItemAction, OrderItemType, OrderListResponse, OrderResponse, OrderState, Source } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { BaseListStateService } from '@Ordering/shared/services/base-list-state.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { ChatService } from '@Ordering/chat/chat.service';
import { ActionDialogService } from '@Ordering/shared/services/action-dialog.service';
import { ArchivedOrderActions } from '@Ordering/data/custom/enum/archived-order-actions.enum';
import { INITIAL_ORDER_FILTER } from '@Ordering/portalComponents/orders-list/models/order-list-filter.model';
import { OrdersDataService } from '@Ordering/portalComponents/orders-list/services/orders-data.service';

import { ArchivedOrdersContainerService } from './archived-orders-container.service';

const makeItem = (state: OrderState, action?: OrderItemAction, origin = Source.INFRASTRUCTURE_MANAGER) =>
  ({
    externalId: 'ext-1',
    state,
    orderOrigin: origin,
    orderItems: action !== undefined ? [{ content: { type: OrderItemType.TRAIN_RUN, action } }] : [],
  }) as any;

describe('ArchivedOrdersContainerService', () => {
  let service: ArchivedOrdersContainerService;
  let mockOrderActionsService: any;
  let mockActionDialogService: any;
  let mockNavigationService: any;
  let mockConfigDataService: any;

  beforeEach(() => {
    const defaultState = signal({
      filters: INITIAL_ORDER_FILTER,
      paginationAndSorting: { pageIndex: 0, pageSize: 25, sortBy: '', sortOrder: 'asc', totalCount: 0 },
    });

    mockNavigationService = { navigate: jest.fn(), navigateToList: jest.fn() };
    mockOrderActionsService = {
      currentlySelectedOrderSig: jest.fn(),
      orderCancelableStates: [OrderState.SUBMITTED],
      orderDeletableStates: [OrderState.DRAFT],
      getOrderDetails: jest.fn().mockReturnValue(of({ externalId: 'ext-1', orderItems: [] } as OrderResponse)),
    };
    mockActionDialogService = {
      openTrainRunActionDialog: jest.fn().mockReturnValue(of(false)),
    };
    mockConfigDataService = {
      isInfrastructureManagerUser: jest.fn().mockReturnValue(false),
      configData: { maxNumberOfOrderItemsPerOrder: 1 },
    };

    TestBed.configureTestingModule({
      providers: [
        ArchivedOrdersContainerService,
        {
          provide: BaseListStateService,
          useValue: {
            getState: jest.fn().mockReturnValue(defaultState),
            updateFilters: jest.fn(),
            updatePagination: jest.fn(),
            updateSort: jest.fn(),
          },
        },
        {
          provide: TranslationsService,
          useValue: { translate: jest.fn().mockReturnValue('translated'), translateEnumValue: jest.fn().mockReturnValue('Enum') },
        },
        {
          provide: UserPermissionService,
          useValue: { checkPermissions: jest.fn().mockReturnValue(true), getRequiredPermission: jest.fn().mockReturnValue(null) },
        },
        { provide: ConfigDataService, useValue: mockConfigDataService },
        { provide: OrderActionsService, useValue: mockOrderActionsService },
        { provide: ActionDialogService, useValue: mockActionDialogService },
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: LoadingSpinnerService, useValue: { showSpinner: jest.fn(), hideSpinner: jest.fn() } },
        { provide: NotificationService, useValue: { pushNotification: jest.fn() } },
        { provide: MatDialog, useValue: { open: jest.fn().mockReturnValue({ afterClosed: jest.fn().mockReturnValue(of(false)) }) } },
        {
          provide: ChatService,
          useValue: {
            checkMessagePermission: jest.fn().mockReturnValue(EMPTY),
            openMessageDialog: jest.fn().mockReturnValue({ afterClosed: jest.fn().mockReturnValue(of(null)) }),
            getMatIcon: jest.fn(),
            getMessageTooltip: jest.fn(),
          },
        },
        {
          provide: OrdersDataService,
          useValue: { getArchivedOrdersList: jest.fn().mockReturnValue(of<OrderListResponse>({ orders: [], totalCount: 0 })) },
        },
      ],
    });

    service = TestBed.inject(ArchivedOrdersContainerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('actions', () => {
    it('should define View, Cancel Train Run and Modify Train Run actions', () => {
      const actions = service['actions'];
      expect(actions.length).toBe(3);
      expect(actions[0].icon).toBe('visibility');
      expect(actions[1].icon).toBe('cancel');
      expect(actions[2].icon).toBe('edit');
    });

    it('all actions should have icon and handler', () => {
      service['actions'].forEach(action => {
        expect(action.icon).toBeTruthy();
        expect(action.handler).toBeInstanceOf(Function);
      });
    });
  });

  describe('canCancelTrainRun', () => {
    it('should be true for AGREED state without existing cancellation', () => {
      expect(service['canCancelTrainRun'](makeItem(OrderState.AGREED))).toBe(true);
    });

    it('should be false for non-AGREED state', () => {
      expect(service['canCancelTrainRun'](makeItem(OrderState.CANCELLED))).toBe(false);
    });

    it('should be false when order already has a TRAIN_RUN_CANCELLATION item', () => {
      const item = makeItem(OrderState.AGREED, OrderItemAction.CANCELLATION);
      expect(service['canCancelTrainRun'](item)).toBe(false);
    });

    it('should be false when more than one order item per order is allowed', () => {
      mockConfigDataService.configData = { maxNumberOfOrderItemsPerOrder: 3 };
      expect(service['canCancelTrainRun'](makeItem(OrderState.AGREED))).toBe(false);
    });

    it('should be false when the order item limit is unset', () => {
      mockConfigDataService.configData = { maxNumberOfOrderItemsPerOrder: undefined };
      expect(service['canCancelTrainRun'](makeItem(OrderState.AGREED))).toBe(false);
    });
  });

  describe('canModifyTrainRun', () => {
    it('should be true for AGREED state without existing cancellation', () => {
      expect(service['canModifyTrainRun'](makeItem(OrderState.AGREED))).toBe(true);
    });

    it('should be false for non-AGREED state', () => {
      expect(service['canModifyTrainRun'](makeItem(OrderState.SUBMITTED))).toBe(false);
    });

    it('should be false when order already has a TRAIN_RUN_CANCELLATION item', () => {
      const item = makeItem(OrderState.AGREED, OrderItemAction.CANCELLATION);
      expect(service['canModifyTrainRun'](item)).toBe(false);
    });
  });

  describe('handleTrainRunAction', () => {
    it('should call getOrderDetails with the item externalId', () => {
      service['handleTrainRunAction'](makeItem(OrderState.AGREED), ArchivedOrderActions.CANCEL_TRAIN_RUN);
      expect(mockOrderActionsService.getOrderDetails).toHaveBeenCalledWith('ext-1');
    });

    it('should call openTrainRunActionDialog after fetching order details', () => {
      service['handleTrainRunAction'](makeItem(OrderState.AGREED), ArchivedOrderActions.CANCEL_TRAIN_RUN);
      expect(mockActionDialogService.openTrainRunActionDialog).toHaveBeenCalledWith(
        ArchivedOrderActions.CANCEL_TRAIN_RUN,
        expect.objectContaining({ externalId: 'ext-1' }),
        undefined,
      );
    });

    it('should not call getOrderDetails when externalId is missing', () => {
      service['handleTrainRunAction']({ externalId: undefined } as any, ArchivedOrderActions.CANCEL_TRAIN_RUN);
      expect(mockOrderActionsService.getOrderDetails).not.toHaveBeenCalled();
    });

    it('should call reload when dialog closes with true', () => {
      mockActionDialogService.openTrainRunActionDialog.mockReturnValue(of(true));
      const reloadSpy = jest.spyOn(service, 'reload');
      service['handleTrainRunAction'](makeItem(OrderState.AGREED), ArchivedOrderActions.CANCEL_TRAIN_RUN);
      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should NOT call reload when dialog closes with false', () => {
      mockActionDialogService.openTrainRunActionDialog.mockReturnValue(of(false));
      const reloadSpy = jest.spyOn(service, 'reload');
      service['handleTrainRunAction'](makeItem(OrderState.AGREED), ArchivedOrderActions.CANCEL_TRAIN_RUN);
      expect(reloadSpy).not.toHaveBeenCalled();
    });
  });
});
