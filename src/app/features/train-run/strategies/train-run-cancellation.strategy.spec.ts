import { TestBed } from '@angular/core/testing';
import { OrderItemAction, OrderItemType, TrainRunCancellation } from '@Ordering/api';
import { TrainRunCancellationStrategy } from './train-run-cancellation.strategy';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ItemRouteType } from '@Ordering/shared/models/order-item-module.interface';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    orderState: undefined,
    isReadonlyOrderState: false,
    isOfferItemView: false,
    isIMViewingRUOrder: false,
    isCatalogView: false,
    userPermissions: { checkPermissions: jest.fn().mockReturnValue(true) },
    routeType: ItemRouteType.ORDER_ITEM_EDIT,
    translate: jest.fn((k: string) => k),
    ...overrides,
  } as any;
}

describe('TrainRunCancellationStrategy', () => {
  let strategy: TrainRunCancellationStrategy;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TrainRunCancellationStrategy] });
    strategy = TestBed.inject(TrainRunCancellationStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(strategy).toBeTruthy();
  });

  it('should have correct operationType and moduleId', () => {
    expect(strategy.operationType).toBe(OrderItemAction.CANCELLATION);
    expect(strategy.moduleId).toBe(OrderItemType.TRAIN_RUN);
  });

  describe('getComponentSlots', () => {
    it('should return three slots with stops hidden', () => {
      const slots = strategy.getComponentSlots();
      expect(slots).toHaveLength(3);
      expect(slots[0].visible).toBeUndefined();
      expect(slots[1].visible).toBeUndefined();
      expect(slots[2].visible!({} as any, {})).toBe(false);
    });
  });

  describe('getTitleConfig', () => {
    it('should return lblCancelledTrainRun for the title', () => {
      const config = strategy.getTitleConfig(null, createMockContext());
      expect(config.title).toBe('lblCancelledTrainRun');
      expect(config.stateBadge).toBeUndefined();
    });

    it('should not include trainNumber in title', () => {
      const item = { trainNumber: 'TR200' } as any;
      const config = strategy.getTitleConfig(item, createMockContext());
      expect(config.title).toBe('lblCancelledTrainRun');
    });
  });

  describe('resolveEditMode', () => {
    it('should always return READONLY', () => {
      expect(strategy.resolveEditMode(createMockContext()).globalMode).toBe(SlotDisplayMode.READONLY);
    });
  });

  describe('assembleSavePayload', () => {
    it('should build OrderContent with TRAIN_RUN_CANCELLATION type', () => {
      const aggregatedData = {
        trainHeader: { trainNo: 'TR200' },
        operatingDays: [{ beginDate: '2025-03-01' }],
      };
      const contextData = { orderId: 'ORD2' } as any;

      const result = strategy.assembleSavePayload(aggregatedData, contextData);

      expect(result.type).toBe(OrderItemType.TRAIN_RUN);
      expect(result.action).toBe(OrderItemAction.CANCELLATION);
      expect((result.item as TrainRunCancellation).trainNumber).toBe('TR200');
      expect((result.item as TrainRunCancellation).cancellationDays).toEqual([{ beginDate: '2025-03-01' }]);
    });
  });

  describe('extractInitialData', () => {
    it('should extract cancellation data into keyed sections', () => {
      const item = {
        trainNumber: 'TR200',
        operatingCompany: 'SBB',
        cancellationDays: [{ beginDate: '2025-03-01' }],
      } as any;

      const data = strategy.extractInitialData(item);

      expect(data[ContributorKey.TRAIN_HEADER]).toEqual(expect.objectContaining({ trainNo: 'TR200' }));
      expect(data[ContributorKey.OPERATING_DAYS]).toEqual([{ beginDate: '2025-03-01' }]);
      expect(data[ContributorKey.STOPS]).toEqual([]);
    });
  });

  describe('validateBeforeSave', () => {
    it('should always return valid', () => {
      expect(strategy.validateBeforeSave!({})).toEqual({ valid: true });
    });
  });
});
