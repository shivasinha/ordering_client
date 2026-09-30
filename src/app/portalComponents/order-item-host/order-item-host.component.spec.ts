import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { OrderItemAction, OrderItemType, OrderState, TrainRun } from '@Ordering/api';
import { OrderItemHostComponent } from './order-item-host.component';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { OrderItemModuleRegistry } from '@Ordering/shared/services/order-item-module-registry.service';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ItemRouteType, ViewActionType } from '@Ordering/shared/models/order-item-module.interface';
import { OrderItemContextBuilderService } from './order-item-context-builder.service';

describe('OrderItemHostComponent', () => {
  let component: OrderItemHostComponent;
  let fixture: ComponentFixture<OrderItemHostComponent>;

  let orderActionsServiceMock: any;
  let navigationServiceMock: any;
  let registryMock: any;
  let errorHandlingServiceMock: any;
  let notificationServiceMock: any;
  let routerMock: any;
  let routeMock: any;
  let trainRunModuleMock: any;

  function createMockStrategy(overrides: any = {}) {
    return {
      operationType: OrderItemAction.CREATION,
      moduleId: OrderItemType.TRAIN_RUN,
      getComponentSlots: jest.fn().mockReturnValue([]),
      getTitleConfig: jest.fn().mockReturnValue({ title: 'lblTest' }),
      assembleSavePayload: jest.fn().mockReturnValue({ type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: {} }),
      extractInitialData: jest.fn().mockReturnValue({}),
      resolveEditMode: jest.fn().mockReturnValue({ globalMode: SlotDisplayMode.EDITABLE }),
      validateBeforeSave: jest.fn().mockReturnValue({ valid: true }),
      ...overrides,
    };
  }

  let mockStrategy: ReturnType<typeof createMockStrategy>;

  function configureTestBed(routeOverrides: any = {}, routeData: any = {}) {
    routeMock = {
      snapshot: {
        params: { 'order-id': 'ORD1' },
        url: [{ path: 'order-items' }, { path: 'add' }],
        ...routeOverrides.snapshot,
      },
      data: of(routeData),
      ...routeOverrides,
    };

    TestBed.configureTestingModule({
      imports: [OrderItemHostComponent],
      providers: [
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: Router, useValue: routerMock },
        { provide: TranslationsService, useValue: { translate: jest.fn((key: string) => key) } },
        { provide: OrderActionsService, useValue: orderActionsServiceMock },
        { provide: NavigationService, useValue: navigationServiceMock },
        { provide: ErrorHandlingService, useValue: errorHandlingServiceMock },
        { provide: UserPermissionService, useValue: { checkPermissions: jest.fn().mockReturnValue(true) } },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: OrderItemModuleRegistry, useValue: registryMock },
      ],
    });

    fixture = TestBed.createComponent(OrderItemHostComponent);
    component = fixture.componentInstance;
  }

  function getContextBuilder(): OrderItemContextBuilderService {
    return fixture.debugElement.injector.get(OrderItemContextBuilderService);
  }

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockStrategy = createMockStrategy();

    trainRunModuleMock = {
      moduleId: OrderItemType.TRAIN_RUN,
      labelKey: 'lblTrainRun',
      icon: 'train',
      defaultCreationOperation: OrderItemAction.CREATION,
      catalogRouteSegment: 'train-run',
      catalogViewStrategy: ViewActionType.TRAIN_RUN_CATALOG,
      resolverKeys: ['trainRun'],
      extractCopyData: jest.fn().mockReturnValue(null),
      detectOperationOverride: jest.fn().mockReturnValue(null),
      buildContextData: jest.fn().mockReturnValue({}),
      onSaveComplete: jest.fn(),
    };

    orderActionsServiceMock = {
      currentlySelectedOrderSig: signal({
        externalId: 'ORD1',
        state: OrderState.DRAFT,
        orderItems: [],
      }),
      readonlyOrderStates: [
        OrderState.AGREED,
        OrderState.CANCELLED,
        OrderState.OFFERED,
        OrderState.REFUSED,
        OrderState.REJECTED,
        OrderState.SUBMITTED,
      ],
      isIMViewingRUOrder: false,
      getOrderDetails: jest.fn().mockReturnValue(of({})),
      createOrderItem: jest.fn().mockReturnValue(of({})),
      editOrderItem: jest.fn().mockReturnValue(of({})),
    };

    navigationServiceMock = {
      navigate: jest.fn(),
      navigateToList: jest.fn(),
    };

    registryMock = {
      resolveStrategy: jest.fn().mockReturnValue(mockStrategy),
      resolveModule: jest.fn().mockReturnValue(trainRunModuleMock),
      availableModules: jest.fn().mockReturnValue([trainRunModuleMock]),
      findModuleByCatalogSegment: jest.fn().mockReturnValue(undefined),
    };

    routerMock = {
      getCurrentNavigation: jest.fn().mockReturnValue(null),
    };

    errorHandlingServiceMock = { handleError: jest.fn() };
    notificationServiceMock = { pushNotification: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    configureTestBed();
    expect(component).toBeTruthy();
  });

  // ─── ngOnInit / ensureOrderContext ──────────────────────────────────
  describe('ngOnInit', () => {
    it('should resolve strategy and set titleConfig for add flow', () => {
      configureTestBed();
      component.ngOnInit();

      expect(registryMock.resolveStrategy).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION);
      expect(mockStrategy.getTitleConfig).toHaveBeenCalled();
      expect(component['titleConfig']()).toEqual({ title: 'lblTest' });
    });

    it('should load order details when currentlySelectedOrder externalId is empty', () => {
      orderActionsServiceMock.currentlySelectedOrderSig.set({
        externalId: '',
        state: OrderState.DRAFT,
        orderItems: [],
      });
      configureTestBed();
      component.ngOnInit();

      expect(orderActionsServiceMock.getOrderDetails).toHaveBeenCalledWith('ORD1');
    });

    it('should load order details when currentlySelectedOrder externalId mismatches', () => {
      orderActionsServiceMock.currentlySelectedOrderSig.set({
        externalId: 'OTHER_ORDER',
        state: OrderState.DRAFT,
        orderItems: [],
      });
      configureTestBed();
      component.ngOnInit();

      expect(orderActionsServiceMock.getOrderDetails).toHaveBeenCalledWith('ORD1');
    });

    it('should NOT load order details when currentlySelectedOrder matches orderId', () => {
      configureTestBed();
      component.ngOnInit();

      expect(orderActionsServiceMock.getOrderDetails).not.toHaveBeenCalled();
    });

    it('should resolve edit flow from resolved order item route data', () => {
      const orderItemData = {
        orderItem: {
          externalId: 'OI-1',
          content: {
            type: OrderItemType.TRAIN_RUN,
            action: OrderItemAction.CREATION,
            item: { trainNo: '123' } as unknown as TrainRun,
          },
        },
      };
      configureTestBed(
        {
          snapshot: {
            params: { 'order-id': 'ORD1', 'order-item-id': 'OI-1' },
            url: [{ path: 'order-items' }, { path: 'OI-1' }],
          },
        },
        orderItemData,
      );
      component.ngOnInit();

      expect(registryMock.resolveStrategy).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION);
    });

    it('should handle copy flow via module.extractCopyData', () => {
      const copyItem = { trainNo: '99' } as unknown as TrainRun;
      trainRunModuleMock.extractCopyData.mockReturnValue({
        item: copyItem,
        operationType: OrderItemAction.CREATION,
        extraContext: { copiedTrainRunNumber: '99' },
      });
      routerMock.getCurrentNavigation.mockReturnValue({
        extras: {
          state: {
            trainRunData: copyItem,
            copiedTrainRunNumber: '99',
          },
        },
      });
      configureTestBed();
      component.ngOnInit();

      expect(registryMock.resolveStrategy).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION);
    });

    it('should show notification and navigate back when no strategy is found for operation type', () => {
      registryMock.resolveStrategy.mockImplementation(() => {
        throw new Error('No strategy');
      });
      configureTestBed();
      component.ngOnInit();

      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('msgOrderItemModuleNotAvailable', expect.anything());
      expect(navigationServiceMock.navigate).toHaveBeenCalledWith(['/orders', 'ORD1']);
      expect(component['strategySig']()).toBeNull();
    });
  });

  // ─── resolveStrategyAndItem: train-run catalog view ────────────────
  describe('train-run catalog view', () => {
    it('should resolve ViewActionType.TRAIN_RUN_CATALOG for train-run route', () => {
      registryMock.findModuleByCatalogSegment.mockReturnValue(trainRunModuleMock);
      const trainRunData = {
        trainRun: { trainNo: '111' } as unknown as TrainRun,
      };
      configureTestBed(
        {
          snapshot: {
            params: {},
            url: [{ path: 'train-run' }, { path: '111' }],
          },
        },
        trainRunData,
      );
      component.ngOnInit();

      expect(registryMock.resolveStrategy).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN, ViewActionType.TRAIN_RUN_CATALOG);
    });

    it('should NOT call ensureOrderContext for catalog views', () => {
      registryMock.findModuleByCatalogSegment.mockReturnValue(trainRunModuleMock);
      orderActionsServiceMock.currentlySelectedOrderSig.set({
        externalId: '',
        state: OrderState.DRAFT,
        orderItems: [],
      });
      configureTestBed({
        snapshot: {
          params: {},
          url: [{ path: 'train-run' }, { path: '111' }],
        },
      });
      component.ngOnInit();

      expect(orderActionsServiceMock.getOrderDetails).not.toHaveBeenCalled();
    });
  });

  // ─── Replacement detection ─────────────────────────────────────────
  describe('replacement detection', () => {
    it('should detect replacement via module.detectOperationOverride', () => {
      trainRunModuleMock.detectOperationOverride.mockReturnValue(OrderItemAction.REPLACEMENT);
      orderActionsServiceMock.currentlySelectedOrderSig.set({
        externalId: 'ORD1',
        state: OrderState.DRAFT,
        orderItems: [
          {
            externalId: 'OI-PARENT',
            content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.REPLACEMENT, item: {} },
          },
        ],
      });
      const orderItemData = {
        orderItem: {
          externalId: 'OI-EDIT',
          content: {
            type: OrderItemType.TRAIN_RUN,
            action: OrderItemAction.CREATION,
            item: { trainNo: '55' } as unknown as TrainRun,
          },
        },
      };
      configureTestBed(
        {
          snapshot: {
            params: { 'order-id': 'ORD1', 'order-item-id': 'OI-EDIT' },
            url: [{ path: 'order-items' }, { path: 'OI-EDIT' }],
          },
        },
        orderItemData,
      );
      component.ngOnInit();

      expect(trainRunModuleMock.detectOperationOverride).toHaveBeenCalled();
      expect(registryMock.resolveStrategy).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN, OrderItemAction.REPLACEMENT);
    });

    it('should NOT detect replacement when order is not DRAFT', () => {
      orderActionsServiceMock.currentlySelectedOrderSig.set({
        externalId: 'ORD1',
        state: OrderState.SUBMITTED,
        orderItems: [
          {
            externalId: 'OI-PARENT',
            content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.REPLACEMENT, item: {} },
          },
        ],
      });
      const orderItemData = {
        orderItem: {
          externalId: 'OI-EDIT',
          content: {
            type: OrderItemType.TRAIN_RUN,
            action: OrderItemAction.CREATION,
            item: { trainNo: '55' } as unknown as TrainRun,
          },
        },
      };
      configureTestBed(
        {
          snapshot: {
            params: { 'order-id': 'ORD1', 'order-item-id': 'OI-EDIT' },
            url: [{ path: 'order-items' }, { path: 'OI-EDIT' }],
          },
        },
        orderItemData,
      );
      component.ngOnInit();

      // Should NOT call detectOperationOverride since order is not DRAFT
      expect(trainRunModuleMock.detectOperationOverride).not.toHaveBeenCalled();
      expect(registryMock.resolveStrategy).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION);
    });
  });

  // ─── detectFallbackOperationType ─────────────────────────────────
  describe('detectFallbackOperationType', () => {
    it('should use module default creation operation when moduleId is provided', () => {
      routerMock.getCurrentNavigation.mockReturnValue({
        extras: { state: { moduleId: OrderItemType.TRAIN_RUN } },
      });
      configureTestBed();
      component.ngOnInit();

      expect(registryMock.resolveModule).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN);
      expect(registryMock.resolveStrategy).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION);
    });

    it('should fall back to first available module default when resolveModule throws', () => {
      registryMock.resolveModule.mockImplementation(() => {
        throw new Error('Not found');
      });
      routerMock.getCurrentNavigation.mockReturnValue({
        extras: { state: { moduleId: 'unknown' } },
      });
      configureTestBed();
      component.ngOnInit();

      expect(registryMock.resolveStrategy).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION);
    });
  });

  // ─── onExit ────────────────────────────────────────────────────────
  describe('onExit', () => {
    it('should navigate to order page for order-item views', () => {
      configureTestBed();
      component['onExit']();

      expect(navigationServiceMock.navigate).toHaveBeenCalledWith(['/orders', 'ORD1']);
    });

    it('should navigate to list for catalog views', () => {
      registryMock.findModuleByCatalogSegment.mockReturnValue(trainRunModuleMock);
      configureTestBed({
        snapshot: {
          params: {},
          url: [{ path: 'train-run' }, { path: '111' }],
        },
      });
      component['onExit']();

      expect(navigationServiceMock.navigateToList).toHaveBeenCalled();
    });
  });

  // ─── onSave ────────────────────────────────────────────────────────
  describe('onSave', () => {
    beforeEach(() => {
      configureTestBed();
      component.ngOnInit();
    });

    it('should not save when strategy is null', () => {
      component['strategySig'].set(null);
      component['onSave']();

      expect(orderActionsServiceMock.createOrderItem).not.toHaveBeenCalled();
    });

    it('should not save when itemContextData is null', () => {
      component['itemContextDataSig'].set(null);
      component['onSave']();

      expect(orderActionsServiceMock.createOrderItem).not.toHaveBeenCalled();
    });

    it('should show error notifications when pre-save validation fails', () => {
      mockStrategy.validateBeforeSave.mockReturnValueOnce({
        valid: false,
        errors: [{ key: 'stops', message: 'msgMissingStops' }],
      });

      component['onSave']();

      expect(notificationServiceMock.pushNotification).toHaveBeenCalledWith('msgMissingStops', expect.anything());
      expect(orderActionsServiceMock.createOrderItem).not.toHaveBeenCalled();
    });

    it('should show multiple error notifications', () => {
      mockStrategy.validateBeforeSave.mockReturnValueOnce({
        valid: false,
        errors: [
          { key: 'a', message: 'err1' },
          { key: 'b', message: 'err2' },
        ],
      });

      component['onSave']();

      expect(notificationServiceMock.pushNotification).toHaveBeenCalledTimes(2);
    });

    it('should call createOrderItem for new items (add flow)', () => {
      component['onSave']();

      expect(orderActionsServiceMock.createOrderItem).toHaveBeenCalledWith('ORD1', expect.any(Object));
      expect(orderActionsServiceMock.editOrderItem).not.toHaveBeenCalled();
    });

    it('should navigate to order page on successful save', () => {
      component['onSave']();

      expect(navigationServiceMock.navigate).toHaveBeenCalledWith(['/orders', 'ORD1']);
    });

    it('should call module onSaveComplete on successful save', () => {
      component['onSave']();

      expect(trainRunModuleMock.onSaveComplete).toHaveBeenCalled();
    });

    it('should call editOrderItem for existing items with externalId', () => {
      // Re-configure with an existing order item
      TestBed.resetTestingModule();
      const itemData = {
        orderItem: {
          externalId: 'OI-EXISTING',
          content: {
            type: OrderItemType.TRAIN_RUN,
            action: OrderItemAction.CREATION,
            item: { trainNo: '777' } as unknown as TrainRun,
          },
        },
      };
      configureTestBed(
        {
          snapshot: {
            params: { 'order-id': 'ORD1', 'order-item-id': 'OI-EXISTING' },
            url: [{ path: 'order-items' }, { path: 'OI-EXISTING' }],
          },
        },
        itemData,
      );
      component.ngOnInit();

      component['onSave']();

      expect(orderActionsServiceMock.editOrderItem).toHaveBeenCalledWith('ORD1', 'OI-EXISTING', expect.any(Object));
      expect(orderActionsServiceMock.createOrderItem).not.toHaveBeenCalled();
    });

    it('should handle save errors via errorHandlingService', () => {
      const saveError = new Error('Save failed');
      orderActionsServiceMock.createOrderItem.mockReturnValue(throwError(() => saveError));

      component['onSave']();

      expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(saveError, expect.anything());
    });

    it('should re-enable save when the save observable completes without emitting a value (server-handled error)', () => {
      // createOrderItem/editOrderItem swallow HTTP errors internally and resolve to a
      // completed observable with no emitted value, instead of erroring. Regression test
      // for TPRPLAN-37579: the save button must not remain permanently disabled in that case.
      orderActionsServiceMock.createOrderItem.mockReturnValue(EMPTY);

      component['onSave']();

      expect(component['isSaving']()).toBe(false);
      expect(navigationServiceMock.navigate).not.toHaveBeenCalled();
    });
  });

  // ─── canSave ───────────────────────────────────────────────────────
  describe('canSave', () => {
    it('should be true for new items when form is valid (even if not dirty)', () => {
      configureTestBed();
      component.ngOnInit();

      // With no contributors, formAggregator isAllValid=true. Add flow = new item.
      expect(component['canSave']()).toBe(true);
    });

    it('should be false when isSaving is true', () => {
      configureTestBed();
      component.ngOnInit();

      component['isSaving'].set(true);

      expect(component['canSave']()).toBe(false);
    });
  });

  // ─── isEditMode ────────────────────────────────────────────────────
  describe('isEditMode', () => {
    it('should return true when strategy resolves EDITABLE', () => {
      configureTestBed();
      component.ngOnInit();

      expect(component['isEditMode']()).toBe(true);
    });

    it('should return false when strategy resolves READONLY', () => {
      mockStrategy.resolveEditMode.mockReturnValue({ globalMode: SlotDisplayMode.READONLY });
      configureTestBed();
      component.ngOnInit();

      expect(component['isEditMode']()).toBe(false);
    });

    it('should return false when no strategy is set', () => {
      configureTestBed();
      // No ngOnInit — no strategy
      expect(component['isEditMode']()).toBe(false);
    });
  });

  // ─── actionButtons ─────────────────────────────────────────────────
  describe('actionButtons', () => {
    it('should return empty array when strategy has no getActionButtons', () => {
      configureTestBed();
      component.ngOnInit();

      expect(component['actionButtons']()).toEqual([]);
    });

    it('should return buttons from strategy.getActionButtons', () => {
      const buttons = [{ label: 'btnModify', execute: jest.fn() }];
      mockStrategy.getActionButtons = jest.fn().mockReturnValue(buttons);
      configureTestBed();
      component.ngOnInit();

      expect(component['actionButtons']()).toEqual(buttons);
    });
  });

  // ─── renderedButtons ───────────────────────────────────────────────
  describe('renderedButtons', () => {
    it('should include Exit button in readonly mode', () => {
      mockStrategy.resolveEditMode.mockReturnValue({ globalMode: SlotDisplayMode.READONLY });
      configureTestBed();
      component.ngOnInit();

      const buttons = component['renderedButtons']();
      expect(buttons.length).toBeGreaterThanOrEqual(1);
      expect(buttons[buttons.length - 1].label).toBe('lblExit');
    });

    it('should include Cancel and Save buttons in edit mode', () => {
      mockStrategy.resolveEditMode.mockReturnValue({ globalMode: SlotDisplayMode.EDITABLE });
      configureTestBed();
      component.ngOnInit();

      const buttons = component['renderedButtons']();
      const labels = buttons.map(b => b.label);
      expect(labels).toContain('lblCancel');
      expect(labels).toContain('lblSave');
    });

    it('should prepend strategy action buttons before fixed buttons', () => {
      mockStrategy.resolveEditMode.mockReturnValue({ globalMode: SlotDisplayMode.READONLY });
      const strategyBtn = { label: 'btnModify', execute: jest.fn() };
      mockStrategy.getActionButtons = jest.fn().mockReturnValue([strategyBtn]);
      configureTestBed();
      component.ngOnInit();

      const buttons = component['renderedButtons']();
      expect(buttons[0].label).toBe('btnModify');
      expect(buttons[buttons.length - 1].label).toBe('lblExit');
    });
  });

  // ─── activeSlots ───────────────────────────────────────────────────
  describe('activeSlots', () => {
    it('should return empty when no strategy is set', () => {
      configureTestBed();
      expect(component['activeSlots']()).toEqual([]);
    });

    it('should resolve slots from strategy with correct display modes', () => {
      class MockComp {}
      mockStrategy.getComponentSlots.mockReturnValue([{ component: MockComp, contributorKey: 'header' }]);
      configureTestBed();
      component.ngOnInit();

      const slots = component['activeSlots']();

      expect(slots).toHaveLength(1);
      expect(slots[0].contributorKey).toBe('header');
      expect(slots[0].isVisible).toBe(true);
    });

    it('should mark slot as not visible when visible function returns false', () => {
      class MockComp {}
      mockStrategy.getComponentSlots.mockReturnValue([
        {
          component: MockComp,
          contributorKey: 'days',
          visible: () => false,
        },
      ]);
      configureTestBed();
      component.ngOnInit();

      const slots = component['activeSlots']();

      expect(slots[0].isVisible).toBe(false);
    });
  });

  // ─── buildItemContext ──────────────────────────────────────────────
  describe('buildItemContext (via OrderItemContextBuilderService)', () => {
    it('should set routeType to ORDER_ITEM_ADD for add flow', () => {
      configureTestBed();
      const contextBuilder = getContextBuilder();
      const context = contextBuilder.buildItemContext({
        isCatalogView: false,
        isOfferItemView: false,
        isOrderItemView: true,
        hasOrderItemId: false,
      });

      expect(context.routeType).toBe(ItemRouteType.ORDER_ITEM_ADD);
      expect(context.orderState).toBe(OrderState.DRAFT);
      expect(context.isReadonlyOrderState).toBe(false);
      expect(context.isCatalogView).toBe(false);
      expect(context.translate).toBeInstanceOf(Function);
    });

    it('should set routeType to ORDER_ITEM_EDIT when order-item-id param exists', () => {
      configureTestBed({
        snapshot: {
          params: { 'order-id': 'ORD1', 'order-item-id': 'OI-1' },
          url: [{ path: 'order-items' }, { path: 'OI-1' }],
        },
      });
      const contextBuilder = getContextBuilder();
      const context = contextBuilder.buildItemContext({
        isCatalogView: false,
        isOfferItemView: false,
        isOrderItemView: true,
        hasOrderItemId: true,
      });

      expect(context.routeType).toBe(ItemRouteType.ORDER_ITEM_EDIT);
    });

    it('should set routeType to CATALOG for catalog view', () => {
      registryMock.findModuleByCatalogSegment.mockReturnValue(trainRunModuleMock);
      configureTestBed({
        snapshot: {
          params: {},
          url: [{ path: 'train-run' }, { path: '111' }],
        },
      });
      const contextBuilder = getContextBuilder();
      const context = contextBuilder.buildItemContext({
        isCatalogView: true,
        isOfferItemView: false,
        isOrderItemView: false,
        hasOrderItemId: false,
      });

      expect(context.routeType).toBe(ItemRouteType.CATALOG);
      expect(context.isCatalogView).toBe(true);
    });

    it('should set routeType to OFFER_ITEM for offer-item view', () => {
      configureTestBed({
        snapshot: {
          params: { 'order-id': 'ORD1' },
          url: [{ path: 'offer-items' }, { path: 'OI-1' }],
        },
      });
      const contextBuilder = getContextBuilder();
      const context = contextBuilder.buildItemContext({
        isCatalogView: false,
        isOfferItemView: true,
        isOrderItemView: false,
        hasOrderItemId: false,
      });

      expect(context.routeType).toBe(ItemRouteType.OFFER_ITEM);
      expect(context.isOfferItemView).toBe(true);
    });

    it('should mark isReadonlyOrderState true for non-DRAFT orders', () => {
      orderActionsServiceMock.currentlySelectedOrderSig.set({
        externalId: 'ORD1',
        state: OrderState.AGREED,
        orderItems: [],
      });
      configureTestBed();
      const contextBuilder = getContextBuilder();
      const context = contextBuilder.buildItemContext({
        isCatalogView: false,
        isOfferItemView: false,
        isOrderItemView: true,
        hasOrderItemId: false,
      });

      expect(context.isReadonlyOrderState).toBe(true);
    });
  });

  // ─── buildItemContextData ──────────────────────────────────────────
  describe('buildItemContextData (via OrderItemContextBuilderService)', () => {
    it('should include orderId', () => {
      configureTestBed();
      const contextBuilder = getContextBuilder();
      const data = contextBuilder.buildItemContextData({
        orderId: 'ORD1',
        isCatalogView: false,
        routeParams: {},
        resolvedItem: null,
      });

      expect(data.orderId).toBe('ORD1');
    });

    it('should include parent externalId from resolved item', () => {
      configureTestBed();
      const contextBuilder = getContextBuilder();
      const resolvedItem = {
        externalId: 'PARENT-1',
        content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: {} },
      } as any;
      const data = contextBuilder.buildItemContextData({
        orderId: 'ORD1',
        isCatalogView: false,
        routeParams: {},
        resolvedItem,
      });

      expect(data.parentExternalId).toBe('PARENT-1');
    });

    it('should include routeParams for catalog views', () => {
      registryMock.findModuleByCatalogSegment.mockReturnValue(trainRunModuleMock);
      configureTestBed({
        snapshot: {
          params: {},
          url: [{ path: 'train-run' }, { path: '111' }],
        },
      });
      const contextBuilder = getContextBuilder();
      const data = contextBuilder.buildItemContextData({
        orderId: '',
        isCatalogView: true,
        routeParams: { trainRunId: '123' },
        resolvedItem: null,
      });

      expect(data['routeParams']).toEqual({ trainRunId: '123' });
    });

    it('should not include routeParams for non-catalog views', () => {
      configureTestBed();
      const contextBuilder = getContextBuilder();
      const data = contextBuilder.buildItemContextData({
        orderId: 'ORD1',
        isCatalogView: false,
        routeParams: {},
        resolvedItem: null,
      });

      expect(data['routeParams']).toBeUndefined();
    });
  });

  // ─── isUnsavedChanges ──────────────────────────────────────────────
  describe('isUnsavedChanges', () => {
    it('should return false when already saved', () => {
      configureTestBed();
      component['isSaved'].set(true);

      expect(component.isUnsavedChanges()).toBe(false);
    });

    it('should return false for readonly order states', () => {
      orderActionsServiceMock.currentlySelectedOrderSig.set({
        externalId: 'ORD1',
        state: OrderState.AGREED,
        orderItems: [],
      });
      configureTestBed();

      expect(component.isUnsavedChanges()).toBe(false);
    });

    it('should return false when form is not dirty', () => {
      configureTestBed();

      // No contributors → isAnyDirty = false
      expect(component.isUnsavedChanges()).toBe(false);
    });
  });
});
