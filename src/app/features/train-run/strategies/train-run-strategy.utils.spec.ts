import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ItemRouteType } from '@Ordering/shared/models/order-item-module.interface';
import { OperatingDaysListComponent } from '@Ordering/portalComponents/operating-days/operating-days-list/operating-days-list.component';
import { StationListComponent } from '@Ordering/portalComponents/stations/station-list.component';

import {
  resolveTrainRunEditMode,
  validateTrainRunStops,
  extractOperatingCompany,
  resolveEffectiveOperatingDays,
  buildTrainRunBasePayload,
  extractTrainRunInitialData,
  buildTrainRunTitleConfig,
  buildTrainRunSlots,
  isOperatingDaysVisible,
  isConditionalTrainRunVisible,
  TrainHeaderData,
  ContributorKey,
} from './train-run-strategy.utils';
import { TrainHeaderFormComponent } from '../train-header-form/train-header-form.component';

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

describe('train-run-strategy.utils', () => {
  // ─── resolveTrainRunEditMode ─────────────────────────────────────────

  describe('resolveTrainRunEditMode', () => {
    it('should return EDITABLE when user has permissions and conditions are met', () => {
      const context = createMockContext();
      expect(resolveTrainRunEditMode(context).globalMode).toBe(SlotDisplayMode.EDITABLE);
    });

    it('should return READONLY when user lacks permissions', () => {
      const context = createMockContext({
        userPermissions: { checkPermissions: jest.fn().mockReturnValue(false) },
      });
      expect(resolveTrainRunEditMode(context).globalMode).toBe(SlotDisplayMode.READONLY);
    });

    it('should return READONLY for offer item view', () => {
      const context = createMockContext({ isOfferItemView: true });
      expect(resolveTrainRunEditMode(context).globalMode).toBe(SlotDisplayMode.READONLY);
    });

    it('should return READONLY for readonly order state', () => {
      const context = createMockContext({ isReadonlyOrderState: true });
      expect(resolveTrainRunEditMode(context).globalMode).toBe(SlotDisplayMode.READONLY);
    });

    it('should return READONLY when IM viewing RU order', () => {
      const context = createMockContext({ isIMViewingRUOrder: true });
      expect(resolveTrainRunEditMode(context).globalMode).toBe(SlotDisplayMode.READONLY);
    });
  });

  // ─── validateTrainRunStops ───────────────────────────────────────────

  describe('validateTrainRunStops', () => {
    it('should return valid when stops are empty', () => {
      expect(validateTrainRunStops({ stops: [] }).valid).toBe(true);
    });

    it('should return valid when stops key is missing', () => {
      expect(validateTrainRunStops({}).valid).toBe(true);
    });

    it('should return valid when first stop has trainType and tractionUnit', () => {
      const result = validateTrainRunStops({
        stops: [{ trainType: 'ICE', tractionUnit: ['E101'] }],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors when first stop is missing trainType', () => {
      const result = validateTrainRunStops({
        stops: [{ tractionUnit: ['E101'] }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ key: 'trainType' }));
    });

    it('should return errors when first stop has empty tractionUnit', () => {
      const result = validateTrainRunStops({
        stops: [{ trainType: 'ICE', tractionUnit: [] }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ key: 'tractionUnit' }));
    });

    it('should return errors when first stop is missing tractionUnit entirely', () => {
      const result = validateTrainRunStops({
        stops: [{ trainType: 'ICE' }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.objectContaining({ key: 'tractionUnit' }));
    });

    it('should return both errors when first stop is missing both fields', () => {
      const result = validateTrainRunStops({ stops: [{}] });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  // ─── extractOperatingCompany ─────────────────────────────────────────

  describe('extractOperatingCompany', () => {
    it('should return abbreviation from object', () => {
      expect(extractOperatingCompany({ abbreviation: 'DB-N' })).toBe('DB-N');
    });

    it('should return empty string when object has no abbreviation', () => {
      expect(extractOperatingCompany({ name: 'Deutsche Bahn' })).toBe('');
    });

    it('should return string value directly', () => {
      expect(extractOperatingCompany('SBB')).toBe('SBB');
    });

    it('should return empty string for null', () => {
      expect(extractOperatingCompany(null)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(extractOperatingCompany('')).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(extractOperatingCompany(undefined)).toBe('');
    });
  });

  // ─── resolveEffectiveOperatingDays ───────────────────────────────────

  describe('resolveEffectiveOperatingDays', () => {
    it('should return user-entered days when not conditional', () => {
      const header = { isConditionalTrainRun: false } as TrainHeaderData;
      const days = [{ beginDate: '2025-01-01' }];
      expect(resolveEffectiveOperatingDays(header, days, { orderId: '1' })).toEqual(days);
    });

    it('should return project defaults when conditional', () => {
      const header = { isConditionalTrainRun: true } as TrainHeaderData;
      const defaults = [{ beginDate: '2025-06-01' }];
      const contextData = { orderId: '1', defaultOperatingDays: defaults } as any;
      expect(resolveEffectiveOperatingDays(header, [{ beginDate: '2025-01-01' }], contextData)).toEqual(defaults);
    });

    it('should return empty array when conditional and no defaults exist', () => {
      const header = { isConditionalTrainRun: true } as TrainHeaderData;
      expect(resolveEffectiveOperatingDays(header, [{ beginDate: '2025-01-01' }], { orderId: '1' })).toEqual([]);
    });

    it('should return empty array when not conditional and operatingDays is undefined', () => {
      const header = { isConditionalTrainRun: false } as TrainHeaderData;
      expect(resolveEffectiveOperatingDays(header, undefined, { orderId: '1' })).toEqual([]);
    });
  });

  // ─── buildTrainRunBasePayload ────────────────────────────────────────

  describe('buildTrainRunBasePayload', () => {
    const baseAggregatedData = {
      trainHeader: {
        trainNo: 'TR100',
        isConditionalTrainRun: false,
        operatingCompany: 'DB',
        remark: 'remark',
        cancellationReason: '',
      },
      operatingDays: [{ beginDate: '2025-01-01' }],
      stops: [{ station: 'A' }],
    };

    it('should map all base fields correctly', () => {
      const result = buildTrainRunBasePayload(baseAggregatedData, { orderId: 'ORD1' });

      expect(result['trainNumber']).toBe('TR100');
      expect(result['isConditionalTrainRun']).toBe(false);
      expect(result['orderId']).toBe('ORD1');
      expect(result['operatingCompany']).toBe('DB');
      expect(result['remark']).toBe('remark');
      expect(result['operatingDays']).toEqual([{ beginDate: '2025-01-01' }]);
      expect(result['stops']).toEqual([{ station: 'A' }]);
    });

    it('should spread originalItem fields', () => {
      const contextData = { orderId: 'ORD1', originalItem: { existingField: 'preserved' } } as any;
      const result = buildTrainRunBasePayload(baseAggregatedData, contextData);

      expect(result['existingField']).toBe('preserved');
    });

    it('should extract abbreviation from object operatingCompany', () => {
      const data = {
        ...baseAggregatedData,
        trainHeader: { ...baseAggregatedData.trainHeader, operatingCompany: { abbreviation: 'DB-N' } },
      };
      const result = buildTrainRunBasePayload(data, { orderId: 'ORD1' });

      expect(result['operatingCompany']).toBe('DB-N');
    });

    it('should use project defaults for conditional train runs', () => {
      const data = {
        ...baseAggregatedData,
        trainHeader: { ...baseAggregatedData.trainHeader, isConditionalTrainRun: true },
      };
      const contextData = { orderId: 'ORD1', defaultOperatingDays: [{ beginDate: '2025-06-01' }] } as any;
      const result = buildTrainRunBasePayload(data, contextData);

      expect(result['operatingDays']).toEqual([{ beginDate: '2025-06-01' }]);
    });
  });

  // ─── extractTrainRunInitialData ──────────────────────────────────────

  describe('extractTrainRunInitialData', () => {
    const baseItem = {
      trainNumber: 'TR100',
      isConditionalTrainRun: true,
      operatingCompany: 'DB',
      remark: 'note',
      cancellationReason: 'reason',
      state: 'PUBLISHED',
      operatingDays: [{ beginDate: '2025-01-01' }],
      stops: [{ station: 'A' }],
    } as any;

    it('should extract base fields into trainHeader, operatingDays, stops', () => {
      const data = extractTrainRunInitialData(baseItem);

      expect(data[ContributorKey.TRAIN_HEADER]).toEqual({
        trainNo: 'TR100',
        isConditionalTrainRun: true,
        operatingCompany: 'DB',
        remark: 'note',
        cancellationReason: '',
      });
      expect(data[ContributorKey.OPERATING_DAYS]).toEqual([{ beginDate: '2025-01-01' }]);
      expect(data[ContributorKey.STOPS]).toEqual([{ station: 'A' }]);
    });

    it('should include cancellationReason when option is set', () => {
      const data = extractTrainRunInitialData(baseItem, { includeCancellationReason: true });
      expect((data[ContributorKey.TRAIN_HEADER] as any).cancellationReason).toBe('reason');
    });

    it('should include state when option is set', () => {
      const data = extractTrainRunInitialData(baseItem, { includeState: true });
      expect((data[ContributorKey.TRAIN_HEADER] as any).state).toBe('PUBLISHED');
    });

    it('should not include state by default', () => {
      const data = extractTrainRunInitialData(baseItem);
      expect((data[ContributorKey.TRAIN_HEADER] as any).state).toBeUndefined();
    });

    it('should handle missing optional fields gracefully', () => {
      const item = { trainNumber: 'TR1' } as any;
      const data = extractTrainRunInitialData(item);

      expect((data[ContributorKey.TRAIN_HEADER] as any).isConditionalTrainRun).toBe(false);
      expect((data[ContributorKey.TRAIN_HEADER] as any).remark).toBe('');
      expect(data[ContributorKey.OPERATING_DAYS]).toEqual([]);
      expect(data[ContributorKey.STOPS]).toEqual([]);
    });
  });

  // ─── buildTrainRunTitleConfig ────────────────────────────────────────

  describe('buildTrainRunTitleConfig', () => {
    const translate = jest.fn((k: string) => k);

    afterEach(() => translate.mockClear());

    it('should return translated label as title when no item', () => {
      const config = buildTrainRunTitleConfig(null, 'lblRequestTrainRun', translate);
      expect(config.title).toBe('lblRequestTrainRun');
      expect(config.stateBadge).toBeUndefined();
    });

    it('should not append trainNumber when showTrainNumber is not set', () => {
      const item = { trainNumber: 'TR100' } as any;
      const config = buildTrainRunTitleConfig(item, 'lblRequestTrainRun', translate);
      expect(config.title).toBe('lblRequestTrainRun');
    });

    it('should append trainNumber when showTrainNumber is true', () => {
      const item = { trainNumber: 'TR100' } as any;
      const config = buildTrainRunTitleConfig(item, 'lblModifyTrainRun', translate, { showTrainNumber: true });
      expect(config.title).toBe('lblModifyTrainRun - TR100');
    });

    it('should not append trainNumber when showTrainNumber is true but item is null', () => {
      const config = buildTrainRunTitleConfig(null, 'lblModifyTrainRun', translate, { showTrainNumber: true });
      expect(config.title).toBe('lblModifyTrainRun');
    });

    it('should include stateBadge when showStateBadge is true and item has state', () => {
      const item = { trainNumber: 'TR100', state: 'REQUESTED' } as any;
      const config = buildTrainRunTitleConfig(item, 'lbl', translate, {
        showStateBadge: true,
        stateEnumName: 'TrainState',
      });
      expect(config.stateBadge).toEqual({ state: 'REQUESTED', stateEnumName: 'TrainState' });
    });

    it('should not include stateBadge when item has no state property', () => {
      const item = { trainNumber: 'TR100' } as any;
      const config = buildTrainRunTitleConfig(item, 'lbl', translate, {
        showStateBadge: true,
        stateEnumName: 'TrainState',
      });
      expect(config.stateBadge).toBeUndefined();
    });

    it('should not include stateBadge when stateEnumName is missing', () => {
      const item = { trainNumber: 'TR100', state: 'REQUESTED' } as any;
      const config = buildTrainRunTitleConfig(item, 'lbl', translate, { showStateBadge: true });
      expect(config.stateBadge).toBeUndefined();
    });

    it('should support both showTrainNumber and showStateBadge together', () => {
      const item = { trainNumber: 'TR500', state: 'PUBLISHED' } as any;
      const config = buildTrainRunTitleConfig(item, 'lblDetail', translate, {
        showTrainNumber: true,
        showStateBadge: true,
        stateEnumName: 'TrainState',
      });
      expect(config.title).toBe('lblDetail - TR500');
      expect(config.stateBadge).toEqual({ state: 'PUBLISHED', stateEnumName: 'TrainState' });
    });
  });

  // ─── buildTrainRunSlots ──────────────────────────────────────────────

  describe('buildTrainRunSlots', () => {
    it('should return three slots with correct components', () => {
      const slots = buildTrainRunSlots();
      expect(slots).toHaveLength(3);
      expect(slots[0].component).toBe(TrainHeaderFormComponent);
      expect(slots[1].component).toBe(OperatingDaysListComponent);
      expect(slots[2].component).toBe(StationListComponent);
    });

    it('should return correct contributor keys', () => {
      const slots = buildTrainRunSlots();
      expect(slots.map(s => s.contributorKey)).toEqual([ContributorKey.TRAIN_HEADER, ContributorKey.OPERATING_DAYS, ContributorKey.STOPS]);
    });

    it('should not include inputs/visible when config is empty', () => {
      const slots = buildTrainRunSlots();
      expect(slots[0].inputs).toBeUndefined();
      expect(slots[1].visible).toBeUndefined();
      expect(slots[2].visible).toBeUndefined();
    });

    it('should apply headerInputs', () => {
      const slots = buildTrainRunSlots({ headerInputs: { lockTrainNo: true } });
      expect(slots[0].inputs).toEqual({ lockTrainNo: true });
    });

    it('should apply operatingDaysVisible', () => {
      const visibleFn = () => false;
      const slots = buildTrainRunSlots({ operatingDaysVisible: visibleFn });
      expect(slots[1].visible).toBe(visibleFn);
    });

    it('should apply operatingDaysInputs', () => {
      const inputsFn = jest.fn();
      const slots = buildTrainRunSlots({ operatingDaysInputs: inputsFn });
      expect(slots[1].inputs).toBe(inputsFn);
    });

    it('should apply stopsVisible', () => {
      const visibleFn = () => false;
      const slots = buildTrainRunSlots({ stopsVisible: visibleFn });
      expect(slots[2].visible).toBe(visibleFn);
    });
  });

  // ─── isOperatingDaysVisible ────────────────────────────────────────

  describe('isOperatingDaysVisible', () => {
    it('should return false when hideOperatingDays is true', () => {
      const result = isOperatingDaysVisible({} as any, { trainHeader: { hideOperatingDays: true } });
      expect(result).toBe(false);
    });

    it('should return true when hideOperatingDays is false', () => {
      const result = isOperatingDaysVisible({} as any, { trainHeader: { hideOperatingDays: false } });
      expect(result).toBe(true);
    });

    it('should return true when trainHeader is missing', () => {
      const result = isOperatingDaysVisible({} as any, {});
      expect(result).toBe(true);
    });
  });

  // ─── isConditionalTrainRunVisible ──────────────────────────────────

  describe('isConditionalTrainRunVisible', () => {
    it('should return false when isConditionalTrainRun is true', () => {
      const result = isConditionalTrainRunVisible({} as any, { trainHeader: { isConditionalTrainRun: true } });
      expect(result).toBe(false);
    });

    it('should return true when isConditionalTrainRun is false', () => {
      const result = isConditionalTrainRunVisible({} as any, { trainHeader: { isConditionalTrainRun: false } });
      expect(result).toBe(true);
    });

    it('should return true when trainHeader is missing', () => {
      const result = isConditionalTrainRunVisible({} as any, {});
      expect(result).toBe(true);
    });
  });
});
