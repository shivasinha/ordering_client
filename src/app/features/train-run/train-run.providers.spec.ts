import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { OrderItemAction, OrderItemType } from '@Ordering/api';
import { OrderItemModuleRegistry } from '@Ordering/shared/services/order-item-module-registry.service';
import { ActionDialogService } from '@Ordering/shared/services/action-dialog.service';
import { provideTrainRunModule } from './train-run.providers';
import { ViewActionType } from '@Ordering/shared/models/order-item-module.interface';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';

describe('provideTrainRunModule', () => {
  let registry: OrderItemModuleRegistry;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTrainRunModule(),
        { provide: ActionDialogService, useValue: { openActionDialog: jest.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
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

  it('should register the train-run module', () => {
    const module = registry.resolveModule(OrderItemType.TRAIN_RUN);
    expect(module).toBeDefined();
    expect(module.moduleId).toBe(OrderItemType.TRAIN_RUN);
    expect(module.defaultCreationOperation).toBe(OrderItemAction.CREATION);
  });

  it('should register the creation strategy', () => {
    const strategy = registry.resolveStrategy(OrderItemType.TRAIN_RUN, OrderItemAction.CREATION);
    expect(strategy).toBeDefined();
    expect(strategy.operationType).toBe(OrderItemAction.CREATION);
  });

  it('should register the catalog strategy', () => {
    const strategy = registry.resolveStrategy(OrderItemType.TRAIN_RUN, ViewActionType.TRAIN_RUN_CATALOG);
    expect(strategy).toBeDefined();
    expect(strategy.operationType).toBe(ViewActionType.TRAIN_RUN_CATALOG);
  });

  it('should register the cancellation strategy', () => {
    const strategy = registry.resolveStrategy(OrderItemType.TRAIN_RUN, OrderItemAction.CANCELLATION);
    expect(strategy).toBeDefined();
    expect(strategy.operationType).toBe(OrderItemAction.CANCELLATION);
  });

  it('should register the replacement strategy', () => {
    const strategy = registry.resolveStrategy(OrderItemType.TRAIN_RUN, OrderItemAction.REPLACEMENT);
    expect(strategy).toBeDefined();
    expect(strategy.operationType).toBe(OrderItemAction.REPLACEMENT);
  });

  it('should make train-run module available via availableModules', () => {
    const available = registry.availableModules();
    expect(available).toHaveLength(1);
    expect(available[0].moduleId).toBe(OrderItemType.TRAIN_RUN);
  });
});
