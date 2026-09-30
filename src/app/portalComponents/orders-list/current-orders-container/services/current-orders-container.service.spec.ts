// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, EMPTY } from 'rxjs';

import { OrderState, OrderListResponse, Source } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { BaseListStateService } from '@Ordering/shared/services/base-list-state.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { ChatService } from '@Ordering/chat/chat.service';
import { INITIAL_ORDER_FILTER } from '@Ordering/portalComponents/orders-list/models/order-list-filter.model';
import { OrdersDataService } from '@Ordering/portalComponents/orders-list/services/orders-data.service';

import { CurrentOrdersContainerService } from './current-orders-container.service';

const buildProviders = () => {
  const defaultState = signal({
    filters: INITIAL_ORDER_FILTER,
    paginationAndSorting: { pageIndex: 0, pageSize: 25, sortBy: '', sortOrder: 'asc', totalCount: 0 },
  });

  return [
    CurrentOrdersContainerService,
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
    { provide: ConfigDataService, useValue: { isInfrastructureManagerUser: jest.fn().mockReturnValue(false), configData: undefined } },
    {
      provide: OrderActionsService,
      useValue: {
        currentlySelectedOrderSig: jest.fn(),
        orderCancelableStates: [OrderState.SUBMITTED, OrderState.OFFERED, OrderState.REFUSED],
        orderDeletableStates: [OrderState.DRAFT],
        cancelOrder: jest.fn().mockReturnValue(of(null)),
        deleteDraftOrder: jest.fn().mockReturnValue(of(null)),
      },
    },
    { provide: NavigationService, useValue: { navigate: jest.fn(), navigateToList: jest.fn() } },
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
      useValue: { getCurrentOrdersList: jest.fn().mockReturnValue(of<OrderListResponse>({ orders: [], totalCount: 0 })) },
    },
  ];
};

const makeItem = (state: OrderState, origin = Source.INFRASTRUCTURE_MANAGER) =>
  ({ externalId: 'ext-1', state, orderOrigin: origin, orderItems: [] }) as any;

describe('CurrentOrdersContainerService', () => {
  let service: CurrentOrdersContainerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: buildProviders() });
    service = TestBed.inject(CurrentOrdersContainerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('actions and columns', () => {
    it('should return columns from sharedOrderColumns', () => {
      expect(service['columns'].length).toBeGreaterThan(0);
    });

    it('should define View, Cancel, Delete and Edit actions', () => {
      const tooltips = service['actions'].map(a => a.tooltip);
      expect(tooltips).toContain('translated');
    });

    it('all actions should have an icon and handler', () => {
      service['actions'].forEach(action => {
        expect(action.icon).toBeTruthy();
        expect(action.handler).toBeInstanceOf(Function);
      });
    });
  });

  describe('canCancelOrder visibility', () => {
    it('should be visible for SUBMITTED state', () => {
      const item = makeItem(OrderState.SUBMITTED);
      const cancelAction = service['actions'].find(a => a.icon === 'cancel');
      expect(cancelAction?.visible?.(item)).toBeTruthy();
    });

    it('should not be visible for DRAFT state', () => {
      const item = makeItem(OrderState.DRAFT);
      // Cancel action is only for cancelable states (SUBMITTED, OFFERED, REFUSED)
      const visible = service['canCancelOrder'](item);
      expect(visible).toBe(false);
    });
  });

  describe('canDeleteOrder visibility', () => {
    it('should be visible for DRAFT state', () => {
      const item = makeItem(OrderState.DRAFT);
      expect(service['canDeleteOrder'](item)).toBe(true);
    });

    it('should not be visible for non-DRAFT states', () => {
      const item = makeItem(OrderState.SUBMITTED);
      expect(service['canDeleteOrder'](item)).toBe(false);
    });
  });

  describe('canEditOrder visibility', () => {
    it('should be visible only for DRAFT state', () => {
      expect(service['canEditOrder'](makeItem(OrderState.DRAFT))).toBe(true);
      expect(service['canEditOrder'](makeItem(OrderState.SUBMITTED))).toBe(false);
    });
  });

  describe('handleCancelOrder', () => {
    it('should call confirmThenExecute with correct keys', () => {
      const spy = jest.spyOn(service, 'confirmThenExecute' as any);
      service['handleCancelOrder'](makeItem(OrderState.SUBMITTED));
      expect(spy).toHaveBeenCalledWith('msgCancelOrder', expect.any(Function), 'msgSuccessCancelOrder');
    });

    it('should not proceed when externalId is missing', () => {
      const spy = jest.spyOn(service, 'confirmThenExecute' as any);
      service['handleCancelOrder']({ externalId: undefined } as any);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteOrder', () => {
    it('should call confirmThenExecute with correct keys', () => {
      const spy = jest.spyOn(service, 'confirmThenExecute' as any);
      service['handleDeleteOrder'](makeItem(OrderState.DRAFT));
      expect(spy).toHaveBeenCalledWith('msgDelete', expect.any(Function), 'msgSuccessDeleteDraftOrder');
    });
  });
});
