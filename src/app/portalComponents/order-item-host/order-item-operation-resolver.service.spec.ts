import { signal } from '@angular/core';

import { OrderItemAction, OrderItemType, OrderState } from '@Ordering/api';
import { OrderItemModuleRegistry } from '@Ordering/shared/services/order-item-module-registry.service';
import { ViewActionType } from '@Ordering/shared/models/order-item-module.interface';

import { OrderItemOperationResolverService, OperationResolution } from './order-item-operation-resolver.service';

describe('OrderItemOperationResolverService', () => {
  let service: OrderItemOperationResolverService;
  let registryMock: any;
  let trainRunModuleMock: any;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

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
    };

    registryMock = {
      resolveStrategy: jest.fn(),
      resolveModule: jest.fn().mockReturnValue(trainRunModuleMock),
      availableModules: jest.fn().mockReturnValue([trainRunModuleMock]),
      findModuleByCatalogSegment: jest.fn().mockReturnValue(undefined),
    } as unknown as OrderItemModuleRegistry;

    service = new OrderItemOperationResolverService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('detectCatalogModule', () => {
    it('should return undefined when no catalog segment matches', () => {
      const segments = [{ path: 'order-items' }, { path: 'add' }];

      const result = service.detectCatalogModule(segments, registryMock);

      expect(result).toBeUndefined();
      expect(registryMock.findModuleByCatalogSegment).toHaveBeenCalledWith('order-items');
    });

    it('should return module when a catalog segment matches', () => {
      registryMock.findModuleByCatalogSegment.mockReturnValue(trainRunModuleMock);
      const segments = [{ path: 'train-run' }, { path: '123' }];

      const result = service.detectCatalogModule(segments, registryMock);

      expect(result).toBe(trainRunModuleMock);
    });
  });

  describe('resolveItemFromRouteData', () => {
    it('should resolve item from module-specific resolver key', () => {
      const mockItem = { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: {} };
      const data = { trainRun: mockItem };

      const result = service.resolveItemFromRouteData(data, registryMock);

      expect(result).toBe(mockItem);
    });

    it('should fall back to orderItem key', () => {
      const mockItem = { externalId: 'OI-1', content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: {} } };
      registryMock.availableModules.mockReturnValue([{ resolverKeys: ['other'] }]);
      const data = { orderItem: mockItem };

      const result = service.resolveItemFromRouteData(data, registryMock);

      expect(result).toBe(mockItem);
    });

    it('should fall back to offerItem key', () => {
      const mockItem = { externalId: 'OFFER-1' };
      registryMock.availableModules.mockReturnValue([{ resolverKeys: ['other'] }]);
      const data = { offerItem: mockItem };

      const result = service.resolveItemFromRouteData(data, registryMock);

      expect(result).toBe(mockItem);
    });

    it('should return null when no item is found', () => {
      registryMock.availableModules.mockReturnValue([{ resolverKeys: ['other'] }]);
      const data = {};

      const result = service.resolveItemFromRouteData(data, registryMock);

      expect(result).toBeNull();
    });
  });

  describe('resolveOperationInfo', () => {
    it('should resolve copy flow when module extractCopyData returns data', () => {
      const copyData = {
        item: { trainNumber: '100' } as any,
        operationType: OrderItemAction.CREATION,
        extraContext: { src: 'copy' },
      };
      trainRunModuleMock.extractCopyData.mockReturnValue(copyData);

      const result = service.resolveOperationInfo({
        resolvedItem: null,
        navState: { copySource: true },
        isCatalogView: false,
        catalogModule: undefined,
        registry: registryMock,
      });

      expect(result.contentItem).toBe(copyData.item);
      expect(result.operationType).toBe(OrderItemAction.CREATION);
      expect(result.copyExtra).toEqual({ src: 'copy' });
    });

    it('should resolve edit flow from content envelope', () => {
      const resolvedItem = {
        externalId: 'OI-1',
        content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: { trainNumber: '200' } },
      } as any;

      const result = service.resolveOperationInfo({
        resolvedItem,
        navState: {},
        isCatalogView: false,
        catalogModule: undefined,
        registry: registryMock,
      });

      expect(result.contentItem).toBe(resolvedItem.content.item);
      expect(result.operationType).toBe(OrderItemAction.CREATION);
    });

    it('should resolve catalog view with catalog strategy', () => {
      const catalogItem = { trainNumber: '300' } as any;

      const result = service.resolveOperationInfo({
        resolvedItem: catalogItem,
        navState: {},
        isCatalogView: true,
        catalogModule: trainRunModuleMock,
        registry: registryMock,
      });

      expect(result.contentItem).toBe(catalogItem);
      expect(result.operationType).toBe(ViewActionType.TRAIN_RUN_CATALOG);
      expect(result.activeModule).toBe(trainRunModuleMock);
    });

    it('should resolve add flow with default creation operation', () => {
      const result = service.resolveOperationInfo({
        resolvedItem: null,
        navState: {},
        isCatalogView: false,
        catalogModule: undefined,
        registry: registryMock,
      });

      expect(result.contentItem).toBeNull();
      expect(result.operationType).toBe(OrderItemAction.CREATION);
      expect(result.activeModule).toBe(trainRunModuleMock);
    });

    it('should use moduleId from navState to resolve module', () => {
      const result = service.resolveOperationInfo({
        resolvedItem: null,
        navState: { moduleId: OrderItemType.TRAIN_RUN },
        isCatalogView: false,
        catalogModule: undefined,
        registry: registryMock,
      });

      expect(registryMock.resolveModule).toHaveBeenCalledWith(OrderItemType.TRAIN_RUN);
      expect(result.activeModule).toBe(trainRunModuleMock);
    });

    it('should resolve module from content.type when navState has no moduleId (edit flow)', () => {
      const restrictionModuleMock = {
        moduleId: OrderItemType.RESTRICTION,
        labelKey: 'lblRestriction',
        icon: 'block',
        defaultCreationOperation: OrderItemAction.CREATION,
        resolverKeys: ['restriction'],
      };
      registryMock.availableModules.mockReturnValue([trainRunModuleMock, restrictionModuleMock]);
      registryMock.resolveModule.mockImplementation((id: OrderItemType) =>
        id === OrderItemType.RESTRICTION ? restrictionModuleMock : trainRunModuleMock,
      );
      const resolvedItem = {
        externalId: 'OI-2',
        content: { type: OrderItemType.RESTRICTION, action: OrderItemAction.CREATION, item: { name: 'p1' } },
      } as any;

      const result = service.resolveOperationInfo({
        resolvedItem,
        navState: {},
        isCatalogView: false,
        catalogModule: undefined,
        registry: registryMock,
      });

      expect(registryMock.resolveModule).toHaveBeenCalledWith(OrderItemType.RESTRICTION);
      expect(result.activeModule).toBe(restrictionModuleMock);
    });
  });

  describe('applyOperationOverride', () => {
    it('should not override for catalog views', () => {
      const resolution: OperationResolution = {
        contentItem: { trainNumber: '100' } as any,
        operationType: OrderItemAction.CREATION,
        activeModule: trainRunModuleMock,
      };
      trainRunModuleMock.detectOperationOverride.mockReturnValue(OrderItemAction.REPLACEMENT);

      service.applyOperationOverride(resolution, {
        isCatalogView: true,
        orderActionsService: {} as any,
      });

      expect(resolution.operationType).toBe(OrderItemAction.CREATION);
    });

    it('should not override when contentItem is null', () => {
      const resolution: OperationResolution = {
        contentItem: null,
        operationType: OrderItemAction.CREATION,
        activeModule: trainRunModuleMock,
      };

      service.applyOperationOverride(resolution, {
        isCatalogView: false,
        orderActionsService: { currentlySelectedOrderSig: signal({ state: OrderState.DRAFT, orderItems: [{}] }) } as any,
      });

      expect(resolution.operationType).toBe(OrderItemAction.CREATION);
    });

    it('should not override when copyExtra is present', () => {
      const resolution: OperationResolution = {
        contentItem: { trainNumber: '100' } as any,
        operationType: OrderItemAction.CREATION,
        activeModule: trainRunModuleMock,
        copyExtra: { src: 'copy' },
      };

      service.applyOperationOverride(resolution, {
        isCatalogView: false,
        orderActionsService: { currentlySelectedOrderSig: signal({ state: OrderState.DRAFT, orderItems: [{}] }) } as any,
      });

      expect(resolution.operationType).toBe(OrderItemAction.CREATION);
    });

    it('should apply override when order is DRAFT with existing items', () => {
      const resolution: OperationResolution = {
        contentItem: { trainNumber: '100' } as any,
        operationType: OrderItemAction.CREATION,
        activeModule: trainRunModuleMock,
      };
      trainRunModuleMock.detectOperationOverride.mockReturnValue(OrderItemAction.REPLACEMENT);

      service.applyOperationOverride(resolution, {
        isCatalogView: false,
        orderActionsService: { currentlySelectedOrderSig: signal({ state: OrderState.DRAFT, orderItems: [{ externalId: 'x' }] }) } as any,
      });

      expect(resolution.operationType).toBe(OrderItemAction.REPLACEMENT);
    });

    it('should NOT override when order is not DRAFT', () => {
      const resolution: OperationResolution = {
        contentItem: { trainNumber: '100' } as any,
        operationType: OrderItemAction.CREATION,
        activeModule: trainRunModuleMock,
      };
      trainRunModuleMock.detectOperationOverride.mockReturnValue(OrderItemAction.REPLACEMENT);

      service.applyOperationOverride(resolution, {
        isCatalogView: false,
        orderActionsService: { currentlySelectedOrderSig: signal({ state: OrderState.AGREED, orderItems: [{ externalId: 'x' }] }) } as any,
      });

      expect(resolution.operationType).toBe(OrderItemAction.CREATION);
    });
  });
});
