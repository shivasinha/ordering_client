import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { OrderItemAction, OrderItemType, OrderState } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { ItemRouteType } from '@Ordering/shared/models/order-item-module.interface';

import { OrderItemContextBuilderService } from './order-item-context-builder.service';

describe('OrderItemContextBuilderService', () => {
  let service: OrderItemContextBuilderService;
  let orderActionsServiceMock: any;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

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
    };

    TestBed.configureTestingModule({
      providers: [
        OrderItemContextBuilderService,
        { provide: TranslationsService, useValue: { translate: jest.fn((key: string) => key) } },
        { provide: OrderActionsService, useValue: orderActionsServiceMock },
        { provide: UserPermissionService, useValue: { checkPermissions: jest.fn().mockReturnValue(true) } },
      ],
    });

    service = TestBed.inject(OrderItemContextBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('buildItemContext', () => {
    it('should set routeType to ORDER_ITEM_ADD for add flow', () => {
      const context = service.buildItemContext({
        isCatalogView: false,
        isOfferItemView: false,
        isOrderItemView: true,
        hasOrderItemId: false,
      });

      expect(context.routeType).toBe(ItemRouteType.ORDER_ITEM_ADD);
      expect(context.orderState).toBe(OrderState.DRAFT);
      expect(context.isReadonlyOrderState).toBe(false);
      expect(context.isCatalogView).toBe(false);
    });

    it('should set routeType to ORDER_ITEM_EDIT when hasOrderItemId is true', () => {
      const context = service.buildItemContext({
        isCatalogView: false,
        isOfferItemView: false,
        isOrderItemView: true,
        hasOrderItemId: true,
      });

      expect(context.routeType).toBe(ItemRouteType.ORDER_ITEM_EDIT);
    });

    it('should set routeType to CATALOG for catalog view', () => {
      const context = service.buildItemContext({
        isCatalogView: true,
        isOfferItemView: false,
        isOrderItemView: false,
        hasOrderItemId: false,
      });

      expect(context.routeType).toBe(ItemRouteType.CATALOG);
      expect(context.isCatalogView).toBe(true);
    });

    it('should set routeType to OFFER_ITEM for offer-item view', () => {
      const context = service.buildItemContext({
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

      const context = service.buildItemContext({
        isCatalogView: false,
        isOfferItemView: false,
        isOrderItemView: true,
        hasOrderItemId: false,
      });

      expect(context.isReadonlyOrderState).toBe(true);
    });

    it('should include translate function', () => {
      const context = service.buildItemContext({
        isCatalogView: false,
        isOfferItemView: false,
        isOrderItemView: true,
        hasOrderItemId: false,
      });

      expect(context.translate).toBeInstanceOf(Function);
      expect(context.translate('testKey')).toBe('testKey');
    });
  });

  describe('buildLiveContext', () => {
    it('should return base context unchanged for catalog views', () => {
      const baseContext = { orderState: OrderState.DRAFT, isCatalogView: true } as any;

      const result = service.buildLiveContext(baseContext, true);

      expect(result).toBe(baseContext);
    });

    it('should update orderState from live signal for non-catalog views', () => {
      const baseContext = { orderState: OrderState.DRAFT, isReadonlyOrderState: false } as any;
      orderActionsServiceMock.currentlySelectedOrderSig.set({
        externalId: 'ORD1',
        state: OrderState.SUBMITTED,
        orderItems: [],
      });

      const result = service.buildLiveContext(baseContext, false);

      expect(result.orderState).toBe(OrderState.SUBMITTED);
      expect(result.isReadonlyOrderState).toBe(true);
    });
  });

  describe('buildItemContextData', () => {
    it('should include orderId', () => {
      const data = service.buildItemContextData({
        orderId: 'ORD1',
        isCatalogView: false,
        routeParams: {},
        resolvedItem: null,
      });

      expect(data.orderId).toBe('ORD1');
    });

    it('should include parent externalId from resolved item', () => {
      const resolvedItem = {
        externalId: 'PARENT-1',
        content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: {} },
      } as any;

      const data = service.buildItemContextData({
        orderId: 'ORD1',
        isCatalogView: false,
        routeParams: {},
        resolvedItem,
      });

      expect(data.parentExternalId).toBe('PARENT-1');
    });

    it('should include routeParams for catalog views', () => {
      const data = service.buildItemContextData({
        orderId: '',
        isCatalogView: true,
        routeParams: { trainRunId: '123' },
        resolvedItem: null,
      });

      expect(data['routeParams']).toEqual({ trainRunId: '123' });
    });

    it('should not include routeParams for non-catalog views', () => {
      const data = service.buildItemContextData({
        orderId: 'ORD1',
        isCatalogView: false,
        routeParams: {},
        resolvedItem: null,
      });

      expect(data['routeParams']).toBeUndefined();
    });
  });
});
