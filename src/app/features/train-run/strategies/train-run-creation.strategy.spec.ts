import { TestBed } from '@angular/core/testing';
import { OrderItemAction, OrderItemType, TrainRun, TrainState } from '@Ordering/api';
import { TrainRunCreationStrategy } from './train-run-creation.strategy';
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
    userPermissions: {
      checkPermissions: jest.fn().mockReturnValue(true),
    },
    routeType: ItemRouteType.ORDER_ITEM_ADD,
    translate: jest.fn((k: string) => k),
    ...overrides,
  } as any;
}

describe('TrainRunCreationStrategy', () => {
  let strategy: TrainRunCreationStrategy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TrainRunCreationStrategy],
    });
    strategy = TestBed.inject(TrainRunCreationStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(strategy).toBeTruthy();
  });

  it('should have correct operationType and moduleId', () => {
    expect(strategy.operationType).toBe(OrderItemAction.CREATION);
    expect(strategy.moduleId).toBe(OrderItemType.TRAIN_RUN);
  });

  describe('getComponentSlots', () => {
    it('should return three slots (header, operatingDays, stops)', () => {
      const slots = strategy.getComponentSlots();
      expect(slots).toHaveLength(3);
      expect(slots.map(s => s.contributorKey)).toEqual([ContributorKey.TRAIN_HEADER, ContributorKey.OPERATING_DAYS, ContributorKey.STOPS]);
    });

    it('should hide operating days when header.hideOperatingDays is true', () => {
      const slots = strategy.getComponentSlots();
      const opDaysSlot = slots[1];
      const visibleFn = opDaysSlot.visible as (...args: unknown[]) => boolean;
      const result = visibleFn({}, { trainHeader: { hideOperatingDays: true } });
      expect(result).toBe(false);
    });

    it('should show operating days when header.hideOperatingDays is false', () => {
      const slots = strategy.getComponentSlots();
      const opDaysSlot = slots[1];
      const visibleFn = opDaysSlot.visible as (...args: unknown[]) => boolean;
      const result = visibleFn({}, { trainHeader: { hideOperatingDays: false } });
      expect(result).toBe(true);
    });
  });

  describe('getTitleConfig', () => {
    it('should return lblRequestTrainRun for order item add', () => {
      const context = createMockContext({ routeType: ItemRouteType.ORDER_ITEM_ADD });
      const config = strategy.getTitleConfig(null, context);
      expect(config.title).toBe('lblRequestTrainRun');
      expect(config.stateBadge).toBeUndefined();
    });

    it('should return lblOfferedTrainRun for offer item view', () => {
      const context = createMockContext({ routeType: ItemRouteType.OFFER_ITEM });
      const config = strategy.getTitleConfig(null, context);
      expect(config.title).toBe('lblOfferedTrainRun');
    });

    it('should not include trainNumber in title (no state badge)', () => {
      const context = createMockContext();
      const item = { trainNumber: 'TR100' } as TrainRun;
      const config = strategy.getTitleConfig(item, context);
      expect(config.title).toBe('lblRequestTrainRun');
    });
  });

  describe('extractInitialData', () => {
    it('should extract train run data into keyed sections', () => {
      const item = {
        trainNumber: 'TR100',
        isConditionalTrainRun: true,
        operatingCompany: 'DB',
        remark: 'test remark',
        cancellationReason: '',
        state: TrainState.PUBLISHED,
        operatingDays: [{ beginDate: '2025-01-01' }],
        stops: [{ station: 'A' }],
      } as any;

      const data = strategy.extractInitialData(item);

      expect(data[ContributorKey.TRAIN_HEADER]).toEqual({
        trainNo: 'TR100',
        isConditionalTrainRun: true,
        operatingCompany: 'DB',
        remark: 'test remark',
        cancellationReason: '',
        state: TrainState.PUBLISHED,
      });
      expect(data[ContributorKey.OPERATING_DAYS]).toEqual([{ beginDate: '2025-01-01' }]);
      expect(data[ContributorKey.STOPS]).toEqual([{ station: 'A' }]);
    });
  });

  describe('resolveEditMode', () => {
    it('should return EDITABLE when user has permissions and not readonly', () => {
      const context = createMockContext();
      expect(strategy.resolveEditMode(context).globalMode).toBe(SlotDisplayMode.EDITABLE);
    });

    it('should return READONLY for readonly order state', () => {
      const context = createMockContext({ isReadonlyOrderState: true });
      expect(strategy.resolveEditMode(context).globalMode).toBe(SlotDisplayMode.READONLY);
    });
  });

  describe('assembleSavePayload', () => {
    it('should build OrderContent with TRAIN_RUN_CREATION type', () => {
      const aggregatedData = {
        trainHeader: { trainNo: 'TR100', isConditionalTrainRun: false, operatingCompany: 'DB', remark: 'r', cancellationReason: '' },
        operatingDays: [{ beginDate: '2025-01-01' }],
        stops: [{ station: 'A' }],
      };
      const contextData = { orderId: 'ORD1' } as any;

      const result = strategy.assembleSavePayload(aggregatedData, contextData);

      expect(result.type).toBe(OrderItemType.TRAIN_RUN);
      expect(result.action).toBe(OrderItemAction.CREATION);
      expect((result.item as TrainRun).trainNumber).toBe('TR100');
      expect((result.item as TrainRun).orderId).toBe('ORD1');
      expect((result.item as TrainRun).operatingDays).toEqual([{ beginDate: '2025-01-01' }]);
    });

    it('should use project default operating days for conditional train runs', () => {
      const aggregatedData = {
        trainHeader: { trainNo: 'TR100', isConditionalTrainRun: true, operatingCompany: '', remark: '', cancellationReason: '' },
        operatingDays: [{ beginDate: '2025-01-01' }],
        stops: [],
      };
      const contextData = { orderId: 'ORD1', defaultOperatingDays: [{ beginDate: '2025-06-01' }] } as any;

      const result = strategy.assembleSavePayload(aggregatedData, contextData);

      expect((result.item as TrainRun).operatingDays).toEqual([{ beginDate: '2025-06-01' }]);
    });
  });

  describe('validateBeforeSave', () => {
    it('should delegate to validateTrainRunStops', () => {
      expect(strategy.validateBeforeSave!({ stops: [] }).valid).toBe(true);
      expect(strategy.validateBeforeSave!({ stops: [{ trainType: 'ICE', tractionUnit: ['E101'] }] }).valid).toBe(true);
      expect(strategy.validateBeforeSave!({ stops: [{}] }).valid).toBe(false);
    });
  });
});
