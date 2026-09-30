import { TestBed } from '@angular/core/testing';

import { OrderItemType, OrderItemAction } from '@Ordering/api';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';
import { ItemRouteType } from '@Ordering/shared/models/order-item-module.interface';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { RestrictionHeaderFormComponent } from '../components/restriction-header-form/restriction-header-form.component';
import { SignalsSlotComponent } from '@Ordering/portalComponents/signals/signals-slot.component';
import { TimeSlotsSlotComponent } from '@Ordering/portalComponents/time-slots/time-slots-slot.component';

import { RestrictionCreationStrategy } from './restriction-creation.strategy';

function createMockContext(overrides: Record<string, unknown> = {}) {
  return {
    isReadonlyOrderState: false,
    isOfferItemView: false,
    isIMViewingRUOrder: false,
    routeType: ItemRouteType.ORDER_ITEM_ADD,
    userPermissions: {
      checkPermissions: jest.fn().mockReturnValue(true),
    },
    translate: jest.fn((key: string) => key),
    ...overrides,
  } as any;
}

const BASE_HEADER = {
  name: 'Test Restriction',
  referenceId: 'REF-1',
  busRefId: null,
  description: 'desc',
  operatingCompanyID: '1',
  projectId: '2',
  subProjectId: '3',
  workTypeId: '4',
  lineOfWorkId: '5',
  notesForPlanner: 'note',
  yellowFleetId: '6',
  interruptible: '7',
  speedRestriction: true,
  catShutOff: false,
};

describe('RestrictionCreationStrategy', () => {
  let strategy: RestrictionCreationStrategy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RestrictionCreationStrategy],
    });
    strategy = TestBed.inject(RestrictionCreationStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(strategy).toBeTruthy();
  });

  // ─── Metadata ────────────────────────────────────────────────────────────

  it('should expose restriction creation operationType and moduleId', () => {
    expect(strategy.operationType).toBe(OrderItemAction.CREATION);
    expect(strategy.moduleId).toBe(OrderItemType.RESTRICTION);
  });

  // ─── getComponentSlots ───────────────────────────────────────────────────

  it('should return three slots in correct order', () => {
    const slots = strategy.getComponentSlots();
    expect(slots).toHaveLength(3);
    expect(slots[0].component).toBe(RestrictionHeaderFormComponent);
    expect(slots[0].contributorKey).toBe(ContributorKey.RESTRICTION_HEADER);
    expect(slots[0].layout).toBe('full');
    expect(slots[1].component).toBe(SignalsSlotComponent);
    expect(slots[1].contributorKey).toBe(ContributorKey.SIGNALS);
    expect(slots[1].layout).toBe('collapsible');
    expect(slots[2].component).toBe(TimeSlotsSlotComponent);
    expect(slots[2].contributorKey).toBe(ContributorKey.TIME_SLOTS);
    expect(slots[2].layout).toBe('collapsible');
  });

  // ─── getTitleConfig ───────────────────────────────────────────────────────

  it('should return lblRequestRestriction title for ORDER_ITEM_ADD route', () => {
    const context = createMockContext({ routeType: ItemRouteType.ORDER_ITEM_ADD });
    expect(strategy.getTitleConfig(null, context).title).toBe('lblRequestRestriction');
  });

  it('should return lblOfferedRestriction title for OFFER_ITEM route', () => {
    const context = createMockContext({ routeType: ItemRouteType.OFFER_ITEM });
    expect(strategy.getTitleConfig(null, context).title).toBe('lblOfferedRestriction');
  });

  // ─── extractInitialData ───────────────────────────────────────────────────

  it('should extract all header fields from an existing restriction', () => {
    const data = strategy.extractInitialData({
      name: 'pos-1',
      referenceId: 'REF-1',
      busRefId: 99,
      description: 'some desc',
      operatingCompanyID: '11',
      projectId: '22',
      subProjectId: '33',
      workTypeId: '44',
      lineOfWorkId: '55',
      notesForPlanner: 'planner note',
      yellowFleetId: '66',
      interruptible: '77',
      speedRestriction: true,
      catShutOff: false,
      area: [{ id: '1' }],
      time: [{ beginDate: '2026-01-01', endDate: '2026-01-01', fromTime: '08:00', toTime: '10:00', broken: false }],
    } as any);

    const header = data[ContributorKey.RESTRICTION_HEADER] as Record<string, unknown>;
    expect(header['name']).toBe('pos-1');
    expect(header['referenceId']).toBe('REF-1');
    expect(header['busRefId']).toBe(99);
    expect(header['operatingCompanyID']).toBe('11');
    expect(header['projectId']).toBe('22');
    expect(header['subProjectId']).toBe('33');
    expect(header['workTypeId']).toBe('44');
    expect(header['lineOfWorkId']).toBe('55');
    expect(header['notesForPlanner']).toBe('planner note');
    expect(header['yellowFleetId']).toBe('66');
    expect(header['interruptible']).toBe('77');
    expect(header['speedRestriction']).toBe(true);
    expect(header['catShutOff']).toBe(false);
    expect(header).not.toHaveProperty('reqChangeId');
  });

  it('should fall back to defaults when restriction fields are missing', () => {
    const data = strategy.extractInitialData({} as any);
    const header = data[ContributorKey.RESTRICTION_HEADER] as Record<string, unknown>;
    expect(header['name']).toBe('');
    expect(header['referenceId']).toBe('');
    expect(header['busRefId']).toBeNull();
    expect(header['operatingCompanyID']).toBeNull();
    expect(header['speedRestriction']).toBe(false);
    expect(header['catShutOff']).toBe(false);
    expect(data[ContributorKey.SIGNALS]).toEqual([]);
    expect(data[ContributorKey.TIME_SLOTS]).toEqual([]);
  });

  it('should extract signals and time slots into their contributor keys', () => {
    const signals = [{ id: '1' }, { id: '2' }];
    const timeSlots = [{ beginDate: '2026-01-01', endDate: '2026-01-01', fromTime: '08:00', toTime: '10:00', broken: false }];
    const data = strategy.extractInitialData({ area: signals, time: timeSlots } as any);
    expect(data[ContributorKey.SIGNALS]).toEqual(signals);
    expect(data[ContributorKey.TIME_SLOTS]).toEqual(timeSlots);
  });

  // ─── assembleSavePayload ──────────────────────────────────────────────────

  it('should assemble a full restriction payload', () => {
    const signals = [{ id: '10' }, { id: 'x' }];
    const timeSlots = [{ beginDate: '2026-01-01', endDate: '2026-01-01', fromTime: '01:00', toTime: '02:00', broken: false }];

    const result = strategy.assembleSavePayload(
      {
        [ContributorKey.RESTRICTION_HEADER]: BASE_HEADER,
        [ContributorKey.SIGNALS]: signals,
        [ContributorKey.TIME_SLOTS]: timeSlots,
      },
      { orderId: 'ORD-1' } as any,
    );

    expect(result.type).toBe(OrderItemType.RESTRICTION);
    expect(result.action).toBe(OrderItemAction.CREATION);
    const item = result.item as any;
    expect(item['name']).toBe('Test Restriction');
    expect(item['referenceId']).toBe('REF-1');
    expect(item['operatingCompanyID']).toBe('1');
    expect(item['projectId']).toBe('2');
    expect(item['subProjectId']).toBe('3');
    expect(item['workTypeId']).toBe('4');
    expect(item['lineOfWorkId']).toBe('5');
    expect(item['interruptible']).toBe('7');
    expect(item['speedRestriction']).toBe(true);
    expect(item['catShutOff']).toBe(false);
    expect(item['area']).toEqual(signals);
    expect(item['time']).toEqual(timeSlots);
    expect(item).not.toHaveProperty('reqChangeId');
  });

  it('should set undefined for optional fields when null/missing in header', () => {
    const result = strategy.assembleSavePayload(
      {
        [ContributorKey.RESTRICTION_HEADER]: {
          ...BASE_HEADER,
          busRefId: null,
          projectId: null,
          subProjectId: null,
          yellowFleetId: null,
          interruptible: null,
        },
        [ContributorKey.SIGNALS]: [],
        [ContributorKey.TIME_SLOTS]: [],
      },
      {} as any,
    );

    const item = result.item as any;
    expect(item['busRefId']).toBeUndefined();
    expect(item['projectId']).toBeUndefined();
    expect(item['subProjectId']).toBeUndefined();
    expect(item['yellowFleetId']).toBeUndefined();
    expect(item['interruptible']).toBeUndefined();
  });

  it('should merge originalItem from contextData into the payload', () => {
    const result = strategy.assembleSavePayload(
      {
        [ContributorKey.RESTRICTION_HEADER]: BASE_HEADER,
        [ContributorKey.SIGNALS]: [],
        [ContributorKey.TIME_SLOTS]: [],
      },
      { originalItem: { extId: 'EXT-99' } } as any,
    );

    expect((result.item as any)['extId']).toBe('EXT-99');
  });

  it('should use empty arrays for signals and time slots when not provided', () => {
    const result = strategy.assembleSavePayload({ [ContributorKey.RESTRICTION_HEADER]: BASE_HEADER }, {} as any);

    expect((result.item as any)['area']).toEqual([]);
    expect((result.item as any)['time']).toEqual([]);
  });

  // ─── validateBeforeSave ───────────────────────────────────────────────────

  it('should return valid when all required fields are present', () => {
    const result = strategy.validateBeforeSave({
      [ContributorKey.RESTRICTION_HEADER]: { name: 'MyRestriction', operatingCompanyID: '5', workTypeId: '22', lineOfWorkId: '33' },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should return error when name is missing', () => {
    const result = strategy.validateBeforeSave({
      [ContributorKey.RESTRICTION_HEADER]: { name: '', operatingCompanyID: '5', workTypeId: '22', lineOfWorkId: '33' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ key: 'name', message: 'msgErrorMissingRestrictionName' });
  });

  it('should return error when operatingCompanyID is null', () => {
    const result = strategy.validateBeforeSave({
      [ContributorKey.RESTRICTION_HEADER]: { name: 'MyRestriction', operatingCompanyID: null, workTypeId: '22', lineOfWorkId: '33' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ key: 'operatingCompanyID', message: 'msgErrorMissingOperatingCompany' });
  });

  it('should return error when workTypeId is null', () => {
    const result = strategy.validateBeforeSave({
      [ContributorKey.RESTRICTION_HEADER]: { name: 'MyRestriction', operatingCompanyID: '5', workTypeId: null, lineOfWorkId: '33' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ key: 'workTypeId', message: 'msgErrorMissingWorkType' });
  });

  it('should return error when lineOfWorkId is null', () => {
    const result = strategy.validateBeforeSave({
      [ContributorKey.RESTRICTION_HEADER]: { name: 'MyRestriction', operatingCompanyID: '5', workTypeId: '22', lineOfWorkId: null },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ key: 'lineOfWorkId', message: 'msgErrorMissingLineOfWork' });
  });

  it('should return all errors when every required field is missing', () => {
    const result = strategy.validateBeforeSave({
      [ContributorKey.RESTRICTION_HEADER]: { name: '', operatingCompanyID: null, workTypeId: null, lineOfWorkId: null },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });

  it('should return invalid when header is undefined', () => {
    const result = strategy.validateBeforeSave({});
    expect(result.valid).toBe(false);
  });

  // ─── resolveEditMode ─────────────────────────────────────────────────────

  it('should return EDITABLE when user has permissions and order is not readonly', () => {
    expect(strategy.resolveEditMode(createMockContext()).globalMode).toBe(SlotDisplayMode.EDITABLE);
  });

  it('should return READONLY when permissions are missing', () => {
    const context = createMockContext({
      userPermissions: { checkPermissions: jest.fn().mockReturnValue(false) },
    });
    expect(strategy.resolveEditMode(context).globalMode).toBe(SlotDisplayMode.READONLY);
  });

  it('should return READONLY when order state is readonly', () => {
    expect(strategy.resolveEditMode(createMockContext({ isReadonlyOrderState: true })).globalMode).toBe(SlotDisplayMode.READONLY);
  });

  it('should return READONLY when viewing an offer item', () => {
    expect(strategy.resolveEditMode(createMockContext({ isOfferItemView: true })).globalMode).toBe(SlotDisplayMode.READONLY);
  });

  it('should return READONLY when IM is viewing an RU order', () => {
    expect(strategy.resolveEditMode(createMockContext({ isIMViewingRUOrder: true })).globalMode).toBe(SlotDisplayMode.READONLY);
  });
});
