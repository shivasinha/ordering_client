import { TestBed } from '@angular/core/testing';

import { OrderItemAction, OrderItemType } from '@Ordering/api';
import { OrderItemModuleRegistry } from './order-item-module-registry.service';
import { ConfigDataService } from './config-data.service';
import { OrderItemModule } from '../models/order-item-module.interface';
import { ItemOperationStrategy } from '../models/item-operation-strategy.interface';
import { SlotDisplayMode } from '../models/component-slot.interface';

function createMockModule(overrides: Partial<OrderItemModule> = {}): OrderItemModule {
  return {
    moduleId: OrderItemType.TRAIN_RUN,
    labelKey: 'lblTrainRun',
    icon: 'train',
    defaultCreationOperation: OrderItemAction.CREATION,
    ...overrides,
  };
}

function createMockStrategy(operationType: OrderItemAction, moduleId: OrderItemType = OrderItemType.TRAIN_RUN): ItemOperationStrategy {
  return {
    operationType,
    moduleId,
    getComponentSlots: jest.fn().mockReturnValue([]),
    getTitleConfig: jest.fn().mockReturnValue({ title: 'test' }),
    extractInitialData: jest.fn().mockReturnValue({}),
    resolveEditMode: jest.fn().mockReturnValue({ globalMode: SlotDisplayMode.EDITABLE }),
  } as any;
}

describe('OrderItemModuleRegistry', () => {
  let registry: OrderItemModuleRegistry;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ConfigDataService,
          useValue: { orderItemTypes: jest.fn().mockReturnValue([OrderItemType.TRAIN_RUN]) },
        },
      ],
    });
    registry = TestBed.inject(OrderItemModuleRegistry);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(registry).toBeTruthy();
  });

  describe('registerModule', () => {
    it('should register a module and its strategies', () => {
      const module = createMockModule();
      const strategy = createMockStrategy(OrderItemAction.CREATION);

      registry.registerModule(module, [strategy]);

      expect(registry.resolveModule(OrderItemType.TRAIN_RUN)).toBe(module);
      expect(registry.resolveStrategy(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION)).toBe(strategy);
    });

    it('should keep same-operation strategies from different modules separate', () => {
      const trainRunModule = createMockModule();
      const restrictionModule = createMockModule({ moduleId: OrderItemType.RESTRICTION, labelKey: 'lblRestriction' });
      const trainRunCreation = createMockStrategy(OrderItemAction.CREATION, OrderItemType.TRAIN_RUN);
      const restrictionCreation = createMockStrategy(OrderItemAction.CREATION, OrderItemType.RESTRICTION);

      registry.registerModule(trainRunModule, [trainRunCreation]);
      registry.registerModule(restrictionModule, [restrictionCreation]);

      expect(registry.resolveStrategy(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION)).toBe(trainRunCreation);
      expect(registry.resolveStrategy(OrderItemType.RESTRICTION, OrderItemAction.CREATION)).toBe(restrictionCreation);
    });

    it('should register multiple strategies for one module', () => {
      const module = createMockModule();
      const creation = createMockStrategy(OrderItemAction.CREATION);
      const cancellation = createMockStrategy(OrderItemAction.CANCELLATION);

      registry.registerModule(module, [creation, cancellation]);

      expect(registry.resolveStrategy(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION)).toBe(creation);
      expect(registry.resolveStrategy(OrderItemType.TRAIN_RUN, OrderItemAction.CANCELLATION)).toBe(cancellation);
    });

    it('should register ViewActionType strategies', () => {
      const module = createMockModule();
      const catalog = createMockStrategy(OrderItemAction.CREATION);

      registry.registerModule(module, [catalog]);

      expect(registry.resolveStrategy(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION)).toBe(catalog);
    });
  });

  describe('resolveStrategy', () => {
    it('should throw when no strategy is registered for the given type', () => {
      expect(() => registry.resolveStrategy(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION)).toThrow(
        /No strategy registered for module/,
      );
    });
  });

  describe('resolveModule', () => {
    it('should throw when no module is registered with the given ID', () => {
      expect(() => registry.resolveModule(undefined)).toThrow(/Module ID is undefined/);
    });
  });

  describe('availableModules', () => {
    it('should return only enabled and registered modules', () => {
      const module = createMockModule();
      registry.registerModule(module, []);

      const available = registry.availableModules();

      expect(available).toEqual([module]);
    });

    it('should return empty array when enabled modules are not registered', () => {
      // enabledModuleIds returns [TRAIN_RUN] but nothing is registered yet in this fresh test
      // The registry filters out undefined entries, so it should be empty
      expect(registry.availableModules()).toEqual([]);
    });
  });

  describe('findModuleByCatalogSegment', () => {
    it('should return module matching catalogRouteSegment', () => {
      const module = createMockModule({ catalogRouteSegment: 'train-run' });
      registry.registerModule(module, []);

      expect(registry.findModuleByCatalogSegment('train-run')).toBe(module);
    });

    it('should return undefined when no module matches the segment', () => {
      const module = createMockModule({ catalogRouteSegment: 'train-run' });
      registry.registerModule(module, []);

      expect(registry.findModuleByCatalogSegment('restriction')).toBeUndefined();
    });

    it('should return undefined when no modules have catalogRouteSegment', () => {
      const module = createMockModule();
      registry.registerModule(module, []);

      expect(registry.findModuleByCatalogSegment('train-run')).toBeUndefined();
    });
  });
});
