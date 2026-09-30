// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of, EMPTY } from 'rxjs';

import { OrderListResponse, OrderResponse, OrderState, Source } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { ActionNamesEnum } from '@Ordering/data/custom/enum/listTypes';
import { BaseListStateService } from '@Ordering/shared/services/base-list-state.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { ChatService } from '@Ordering/chat/chat.service';

import { BaseOrdersContainerService } from './base-orders-container.service';
import { ColumnConfig } from '@Ordering/shared/models/base-list-column.model';
import { ActionConfig } from '@Ordering/shared/models/base-list-action.model';
import { OrderListViewModel } from '@Ordering/portalComponents/orders-list/models/order-list-view.model';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { INITIAL_ORDER_FILTER } from '@Ordering/portalComponents/orders-list/models/order-list-filter.model';

/** Minimal concrete subclass for testing the abstract base. */
class TestOrdersContainerService extends BaseOrdersContainerService {
  entityType = TabsTypesEnum.CURRENT_ORDERS;
  protected defaultFilter = INITIAL_ORDER_FILTER;
  protected fetchData = jest.fn().mockReturnValue(of<OrderListResponse>({ orders: [], totalCount: 0 }));
  protected get columns(): ColumnConfig<OrderListViewModel>[] {
    return [];
  }
  protected get actions(): ActionConfig<OrderListViewModel>[] | undefined {
    return undefined;
  }
}

describe('BaseOrdersContainerService', () => {
  let service: TestOrdersContainerService;
  let mockNavigationService: jest.Mocked<Pick<NavigationService, 'navigate' | 'navigateToList'>>;
  let mockUserPermissionService: jest.Mocked<Pick<UserPermissionService, 'checkPermissions' | 'getRequiredPermission'>>;
  let mockConfigDataService: jest.Mocked<Pick<ConfigDataService, 'isInfrastructureManagerUser' | 'configData'>>;
  let mockDialog: jest.Mocked<MatDialog>;
  let mockChatService: jest.Mocked<Pick<ChatService, 'checkMessagePermission' | 'openMessageDialog' | 'getMatIcon' | 'getMessageTooltip'>>;
  let mockOrderActionsService: jest.Mocked<
    Pick<OrderActionsService, 'currentlySelectedOrderSig' | 'orderCancelableStates' | 'orderDeletableStates'>
  >;

  const makeOrder = (overrides: Partial<OrderResponse> = {}): OrderResponse =>
    ({
      externalId: 'ext-1',
      subject: 'Test',
      state: OrderState.DRAFT,
      orderType: 0,
      orderItems: [],
      ...overrides,
    }) as OrderResponse;

  beforeEach(() => {
    const defaultState = signal({
      filters: INITIAL_ORDER_FILTER,
    });

    mockNavigationService = { navigate: jest.fn(), navigateToList: jest.fn() };
    mockUserPermissionService = {
      checkPermissions: jest.fn().mockReturnValue(true),
      getRequiredPermission: jest.fn().mockReturnValue(null),
    };
    mockConfigDataService = {
      isInfrastructureManagerUser: jest.fn().mockReturnValue(false),
      configData: undefined,
    };
    mockDialog = { open: jest.fn() } as any;
    mockChatService = {
      checkMessagePermission: jest.fn().mockReturnValue(EMPTY),
      openMessageDialog: jest.fn().mockReturnValue({ afterClosed: jest.fn().mockReturnValue(of(null)) }),
      getMatIcon: jest.fn().mockReturnValue('chat'),
      getMessageTooltip: jest.fn().mockReturnValue('Messages'),
    };
    mockOrderActionsService = {
      currentlySelectedOrderSig: jest.fn(),
      orderCancelableStates: [OrderState.SUBMITTED, OrderState.OFFERED, OrderState.REFUSED],
      orderDeletableStates: [OrderState.DRAFT],
    };

    TestBed.configureTestingModule({
      providers: [
        TestOrdersContainerService,
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
          useValue: {
            translate: jest.fn().mockReturnValue('translated'),
            translateEnumValue: jest.fn().mockReturnValue('Translated Enum'),
          },
        },
        { provide: UserPermissionService, useValue: mockUserPermissionService },
        { provide: ConfigDataService, useValue: mockConfigDataService },
        { provide: OrderActionsService, useValue: mockOrderActionsService },
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: LoadingSpinnerService, useValue: { showSpinner: jest.fn(), hideSpinner: jest.fn() } },
        { provide: NotificationService, useValue: { pushNotification: jest.fn() } },
        { provide: MatDialog, useValue: mockDialog },
        { provide: ChatService, useValue: mockChatService },
      ],
    });

    service = TestBed.inject(TestOrdersContainerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('mapToViewModel', () => {
    it('should format creation/expiration/lastModified dates', () => {
      const order = makeOrder({
        creationDateTime: '2025-01-15T10:00:00Z',
        expirationDateTime: '2025-06-30T00:00:00Z',
        lastModifiedDateTime: '2025-02-01T08:00:00Z',
      });
      const vm = service['mapToViewModel'](order);

      expect(vm.formattedCreationDateTime).toBeTruthy();
      expect(vm.formattedExpirationDateTime).toBeTruthy();
      expect(vm.formattedLastModifiedDateTime).toBeTruthy();
    });

    it('should produce empty strings for missing dates', () => {
      const order = makeOrder({ creationDateTime: undefined, expirationDateTime: undefined, lastModifiedDateTime: undefined });
      const vm = service['mapToViewModel'](order);

      expect(vm.formattedCreationDateTime).toBe('');
      expect(vm.formattedExpirationDateTime).toBe('');
      expect(vm.formattedLastModifiedDateTime).toBe('');
    });

    it('should count order items', () => {
      const order = makeOrder({ orderItems: [{ id: 1 }, { id: 2 }] as any });
      const vm = service['mapToViewModel'](order);
      expect(vm.itemCount).toBe(2);
    });

    it('should use 0 for missing orderItems', () => {
      const order = makeOrder({ orderItems: undefined });
      const vm = service['mapToViewModel'](order);
      expect(vm.itemCount).toBe(0);
    });

    it('should spread all original order fields', () => {
      const order = makeOrder({ subject: 'My Order', externalId: 'ext-42' });
      const vm = service['mapToViewModel'](order);

      expect(vm.subject).toBe('My Order');
      expect(vm.externalId).toBe('ext-42');
    });
  });

  describe('isActionAllowed', () => {
    const ruOrder = { orderOrigin: Source.RAILWAY_UNDERTAKING_WEB_PORTAL };
    const imOrder = { orderOrigin: Source.INFRASTRUCTURE_MANAGER };

    it('should return true when no permission is required', () => {
      mockUserPermissionService.getRequiredPermission.mockReturnValue(null);
      expect(service['isActionAllowed'](ActionNamesEnum.VIEW, ruOrder)).toBe(true);
    });

    it('should return false when required permission is not granted', () => {
      mockUserPermissionService.getRequiredPermission.mockReturnValue('canCancelOrder');
      mockUserPermissionService.checkPermissions.mockReturnValue(false);
      expect(service['isActionAllowed'](ActionNamesEnum.CANCEL, ruOrder)).toBe(false);
    });

    it('should return false when IM user views RU order for CANCEL', () => {
      mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(true);
      expect(service['isActionAllowed'](ActionNamesEnum.CANCEL, ruOrder)).toBe(false);
    });

    it('should return false when IM user views RU order for DELETE', () => {
      mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(true);
      expect(service['isActionAllowed'](ActionNamesEnum.DELETE, ruOrder)).toBe(false);
    });

    it('should return false when IM user views RU order for CANCEL_TRAIN_RUN', () => {
      mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(true);
      expect(service['isActionAllowed'](ActionNamesEnum.CANCEL_TRAIN_RUN, ruOrder)).toBe(false);
    });

    it('should return true when IM user views IM order', () => {
      mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(true);
      expect(service['isActionAllowed'](ActionNamesEnum.CANCEL, imOrder)).toBe(true);
    });

    it('should return true when RU user views RU order', () => {
      mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(false);
      expect(service['isActionAllowed'](ActionNamesEnum.CANCEL, ruOrder)).toBe(true);
    });
  });

  describe('navigateToOrderDetails', () => {
    it('should navigate to order detail route', () => {
      const order = makeOrder({ externalId: 'ext-123' });
      service['navigateToOrderDetails'](order);
      expect(mockNavigationService.navigate).toHaveBeenCalledWith(['/orders', 'ext-123']);
    });

    it('should not navigate when externalId is missing', () => {
      service['navigateToOrderDetails']({ externalId: undefined } as any);
      expect(mockNavigationService.navigate).not.toHaveBeenCalled();
    });
  });

  describe('getOnRowClick', () => {
    it('should return a function that calls navigateToOrderDetails', () => {
      const handler = service['getOnRowClick']();
      const order = makeOrder({ externalId: 'ext-789' });
      handler(order as any);
      expect(mockNavigationService.navigate).toHaveBeenCalledWith(['/orders', 'ext-789']);
    });
  });

  describe('sharedOrderColumns', () => {
    it('should return the expected column fields', () => {
      const columns = service['sharedOrderColumns']();
      const fields = columns.map(c => c.field);
      expect(fields).toContain('translatedState');
      expect(fields).toContain('subject');
      expect(fields).toContain('translatedOrderType');
      expect(fields).toContain('itemCount');
      expect(fields).toContain('messageState');
    });

    it('should mark itemCount as not sortable', () => {
      const col = service['sharedOrderColumns']().find(c => c.field === 'itemCount');
      expect(col?.sortable).toBe(false);
    });
  });
});
