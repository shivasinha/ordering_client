import { TestBed } from '@angular/core/testing';
import { OrderItemType, TrainRun, TrainState } from '@Ordering/api';
import { TrainRunCatalogStrategy } from './train-run-catalog.strategy';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ItemRouteType, ViewActionType } from '@Ordering/shared/models/order-item-module.interface';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';
import { ActionDialogService } from '@Ordering/shared/services/action-dialog.service';
import { TrainListActions } from '@Ordering/data/custom/enum/train-list-actions.enum';

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    orderState: undefined,
    isReadonlyOrderState: false,
    isOfferItemView: false,
    isIMViewingRUOrder: false,
    isCatalogView: true,
    userPermissions: {
      checkPermissions: jest.fn().mockReturnValue(true),
      canModifyTrainRun: jest.fn().mockReturnValue(true),
    },
    routeType: ItemRouteType.CATALOG,
    translate: jest.fn((k: string) => k),
    ...overrides,
  } as any;
}

describe('TrainRunCatalogStrategy', () => {
  let strategy: TrainRunCatalogStrategy;
  let actionDialogServiceMock: any;

  beforeEach(() => {
    actionDialogServiceMock = { openActionDialog: jest.fn() };

    TestBed.configureTestingModule({
      providers: [TrainRunCatalogStrategy, { provide: ActionDialogService, useValue: actionDialogServiceMock }],
    });
    strategy = TestBed.inject(TrainRunCatalogStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(strategy).toBeTruthy();
  });

  it('should have correct operationType and moduleId', () => {
    expect(strategy.operationType).toBe(ViewActionType.TRAIN_RUN_CATALOG);
    expect(strategy.moduleId).toBe(OrderItemType.TRAIN_RUN);
  });

  describe('getComponentSlots', () => {
    it('should return three slots', () => {
      const slots = strategy.getComponentSlots();
      expect(slots).toHaveLength(3);
      expect(slots.map(s => s.contributorKey)).toEqual([ContributorKey.TRAIN_HEADER, ContributorKey.OPERATING_DAYS, ContributorKey.STOPS]);
    });

    it('should pass showConditionalToggle=false to header', () => {
      const slots = strategy.getComponentSlots();
      const inputsFn = slots[0].inputs as (...args: unknown[]) => Record<string, unknown>;
      expect(inputsFn()).toEqual({ showConditionalToggle: false });
    });
  });

  describe('resolveEditMode', () => {
    it('should always return READONLY', () => {
      expect(strategy.resolveEditMode().globalMode).toBe(SlotDisplayMode.READONLY);
    });
  });

  describe('getTitleConfig', () => {
    it('should return lblDetailTrainRun', () => {
      const config = strategy.getTitleConfig(null, createMockContext());
      expect(config.title).toBe('lblDetailTrainRun');
    });

    it('should include trainNumber in title when item has state', () => {
      const item = { trainNumber: 'TR500', state: TrainState.PUBLISHED, trainSource: 'SRC' } as any;
      const config = strategy.getTitleConfig(item, createMockContext());
      expect(config.title).toBe('lblDetailTrainRun - TR500');
      expect(config.stateBadge).toBeDefined();
      expect(config.stateBadge!.state).toBe(TrainState.PUBLISHED);
    });
  });

  describe('extractInitialData', () => {
    it('should extract train run data', () => {
      const item = {
        trainNumber: 'TR500',
        isConditionalTrainRun: false,
        operatingCompany: 'DB',
        remark: '',
        cancellationReason: '',
        operatingDays: [],
        stops: [],
      } as any;

      const data = strategy.extractInitialData(item);
      expect(data[ContributorKey.TRAIN_HEADER]).toEqual(expect.objectContaining({ trainNo: 'TR500' }));
    });
  });

  describe('getActionButtons', () => {
    it('should return Modify button when user can modify', () => {
      const item = { trainNumber: 'TR500', trainSource: 'SRC' } as any;
      const context = createMockContext();
      const contextData = { orderId: '', routeParams: { trainId: '100', schedVersionId: '200' } } as any;
      const buttons = strategy.getActionButtons!(item, context, contextData);

      expect(buttons).toHaveLength(1);
      expect(buttons[0].label).toBe('lblModifyTrainRun');
    });

    it('should return empty array when user cannot modify', () => {
      const item = { trainNumber: 'TR500', trainSource: 'SRC' } as any;
      const context = createMockContext({
        userPermissions: {
          checkPermissions: jest.fn().mockReturnValue(false),
          canModifyTrainRun: jest.fn().mockReturnValue(true),
        },
      });
      const contextData = { orderId: '', routeParams: { trainId: '100', schedVersionId: '200' } } as any;
      const buttons = strategy.getActionButtons!(item, context, contextData);

      expect(buttons).toEqual([]);
    });

    it('should call actionDialogService when execute is invoked', () => {
      const item = { trainNumber: 'TR500', trainSource: 'SRC' } as unknown as TrainRun;
      const context = createMockContext();
      const contextData = { orderId: '', routeParams: { trainId: '100', schedVersionId: '200' } } as any;
      const buttons = strategy.getActionButtons!(item, context, contextData);

      buttons[0].execute();

      expect(actionDialogServiceMock.openActionDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: TrainListActions.MODIFY_TRAIN_RUN,
          trainRunData: expect.objectContaining({ trainNumber: 'TR500', trainId: 100, schedVersionId: 200 }),
        }),
      );
    });
  });
});
