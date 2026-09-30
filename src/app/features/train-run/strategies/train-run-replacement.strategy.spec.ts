import { TestBed } from '@angular/core/testing';
import { OrderItemAction, OrderItemType, TrainRunReplacement } from '@Ordering/api';
import { TrainRunReplacementStrategy } from './train-run-replacement.strategy';
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

describe('TrainRunReplacementStrategy', () => {
  let strategy: TrainRunReplacementStrategy;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [TrainRunReplacementStrategy] });
    strategy = TestBed.inject(TrainRunReplacementStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(strategy).toBeTruthy();
  });

  it('should have correct operationType and moduleId', () => {
    expect(strategy.operationType).toBe(OrderItemAction.REPLACEMENT);
    expect(strategy.moduleId).toBe(OrderItemType.TRAIN_RUN);
  });

  describe('getComponentSlots', () => {
    it('should return three slots', () => {
      const slots = strategy.getComponentSlots();
      expect(slots).toHaveLength(3);
      expect(slots.map(s => s.contributorKey)).toEqual([ContributorKey.TRAIN_HEADER, ContributorKey.OPERATING_DAYS, ContributorKey.STOPS]);
    });

    it('should lock trainNo and operatingCompany in header inputs', () => {
      const slots = strategy.getComponentSlots();
      const headerInputs = slots[0].inputs as Record<string, unknown>;
      expect(headerInputs).toEqual({ lockTrainNo: true, lockOperatingCompany: true });
    });

    it('should hide operating days when hideOperatingDays is true', () => {
      const slots = strategy.getComponentSlots();
      const visibleFn = slots[1].visible as (...args: unknown[]) => boolean;
      const result = visibleFn({}, { trainHeader: { hideOperatingDays: true } });
      expect(result).toBe(false);
    });

    it('should pass trainRunOriginalOperatingDays from item to operatingDays slot', () => {
      const slots = strategy.getComponentSlots();
      const inputsFn = slots[1].inputs as (...args: unknown[]) => Record<string, unknown>;
      const item = { parentOperatingDays: [{ beginDate: '2025-01-01' }] } as any;
      const inputs = inputsFn(item);
      expect(inputs['trainRunOriginalOperatingDays']).toEqual([{ beginDate: '2025-01-01' }]);
    });
  });

  describe('getTitleConfig', () => {
    it('should return lblModifyTrainRun', () => {
      const config = strategy.getTitleConfig(null, createMockContext());
      expect(config.title).toBe('lblModifyTrainRun');
      expect(config.stateBadge).toBeUndefined();
    });
  });

  describe('resolveEditMode', () => {
    it('should return EDITABLE when user has permissions', () => {
      expect(strategy.resolveEditMode(createMockContext()).globalMode).toBe(SlotDisplayMode.EDITABLE);
    });

    it('should return READONLY for readonly order state', () => {
      const context = createMockContext({ isReadonlyOrderState: true });
      expect(strategy.resolveEditMode(context).globalMode).toBe(SlotDisplayMode.READONLY);
    });
  });

  describe('assembleSavePayload', () => {
    it('should build OrderContent with TRAIN_RUN_REPLACEMENT type and preserve parentOperatingDays from original item', () => {
      const aggregatedData = {
        trainHeader: { trainNo: 'TR400', isConditionalTrainRun: false, operatingCompany: 'DB', remark: 'r', cancellationReason: '' },
        operatingDays: [{ beginDate: '2025-01-01' }],
        stops: [],
      };
      const contextData = {
        orderId: 'ORD4',
        parentExternalId: 'P1',
        originalItem: { parentOperatingDays: [{ beginDate: '2025-02-01' }] },
      } as any;

      const result = strategy.assembleSavePayload(aggregatedData, contextData);

      expect(result.type).toBe(OrderItemType.TRAIN_RUN);
      expect(result.action).toBe(OrderItemAction.REPLACEMENT);
      expect((result.item as TrainRunReplacement).trainNumber).toBe('TR400');
      expect((result.item as TrainRunReplacement).parentExternalId).toBe('P1');
      // parentOperatingDays passes through from originalItem unchanged (backend-managed)
      expect((result.item as TrainRunReplacement).parentOperatingDays).toEqual([{ beginDate: '2025-02-01' }]);
    });
  });

  describe('extractInitialData', () => {
    it('should extract replacement data into keyed sections', () => {
      const item = {
        trainNumber: 'TR400',
        isConditionalTrainRun: false,
        operatingCompany: 'DB',
        remark: '',
        operatingDays: [],
        stops: [],
      } as any;

      const data = strategy.extractInitialData(item);

      expect(data[ContributorKey.TRAIN_HEADER]).toEqual(expect.objectContaining({ trainNo: 'TR400' }));
    });
  });

  describe('validateBeforeSave', () => {
    it('should delegate to validateTrainRunStops', () => {
      expect(strategy.validateBeforeSave!({ stops: [] }).valid).toBe(true);
      expect(strategy.validateBeforeSave!({ stops: [{}] }).valid).toBe(false);
    });
  });
});
