import { TestBed } from '@angular/core/testing';

import { OrderFilters, OrderState, OrderType } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';

import { OrdersListFilterService } from './orders-list-filter.service';

describe('OrdersListFilterService', () => {
  let service: OrdersListFilterService;

  const mockTranslationsService = {
    translate: jest.fn().mockImplementation((key: string) => `translated(${key})`),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OrdersListFilterService, { provide: TranslationsService, useValue: mockTranslationsService }],
    });
    service = TestBed.inject(OrdersListFilterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('state arrays', () => {
    it('should expose currentOrderStates', () => {
      expect(service.currentOrderStates).toEqual([OrderState.DRAFT, OrderState.SUBMITTED, OrderState.OFFERED, OrderState.REFUSED]);
    });

    it('should expose archivedOrderStates', () => {
      expect(service.archivedOrderStates).toEqual([OrderState.CANCELLED, OrderState.AGREED, OrderState.REJECTED]);
    });
  });

  describe('dropdown option arrays', () => {
    it('currentOrderStateOptions should start with an "All" option (key: undefined)', () => {
      expect(service.currentOrderStateOptions[0].key).toBeUndefined();
    });

    it('currentOrderStateOptions should include all current states', () => {
      const keys = service.currentOrderStateOptions.map(o => o.key).filter(k => k !== undefined);
      expect(keys).toEqual(expect.arrayContaining(service.currentOrderStates));
    });

    it('archivedOrderStateOptions should start with an "All" option (key: undefined)', () => {
      expect(service.archivedOrderStateOptions[0].key).toBeUndefined();
    });

    it('archivedOrderStateOptions should include all archived states', () => {
      const keys = service.archivedOrderStateOptions.map(o => o.key).filter(k => k !== undefined);
      expect(keys).toEqual(expect.arrayContaining(service.archivedOrderStates));
    });
  });

  describe('resolveCurrentOrdersFilters', () => {
    it('should use fallback currentOrderStates when orderState is empty', () => {
      const result = service.resolveCurrentOrdersFilters({ orderState: [] });
      expect(result.orderState as unknown as string).toBe(service.currentOrderStates.join(','));
    });

    it('should use provided orderState when non-empty', () => {
      const filters: OrderFilters = { orderState: [OrderState.DRAFT] };
      const result = service.resolveCurrentOrdersFilters(filters);
      expect(result.orderState as unknown as string).toBe(String(OrderState.DRAFT));
    });

    it('should use provided orderType when non-empty', () => {
      const filters: OrderFilters = { orderType: [OrderType.STP], orderState: [] };
      const result = service.resolveCurrentOrdersFilters(filters);
      expect(result.orderType).toEqual([OrderType.STP]);
    });

    it('should pass through other filter fields unchanged', () => {
      const filters: OrderFilters = { searchString: 'hello', orderState: [], orderType: undefined };
      const result = service.resolveCurrentOrdersFilters(filters);
      expect(result.searchString).toBe('hello');
    });

    it('should handle undefined filters', () => {
      const result = service.resolveCurrentOrdersFilters(undefined);
      expect(result.orderState as unknown as string).toBe(service.currentOrderStates.join(','));
    });
  });

  describe('resolveArchivedOrdersFilters', () => {
    it('should use fallback archivedOrderStates when orderState is empty', () => {
      const result = service.resolveArchivedOrdersFilters({ orderState: [] });
      expect(result.orderState as unknown as string).toBe(service.archivedOrderStates.join(','));
    });

    it('should use provided orderState when non-empty', () => {
      const filters: OrderFilters = { orderState: [OrderState.AGREED] };
      const result = service.resolveArchivedOrdersFilters(filters);
      expect(result.orderState as unknown as string).toBe(String(OrderState.AGREED));
    });

    it('should handle undefined filters', () => {
      const result = service.resolveArchivedOrdersFilters(undefined);
      expect(result.orderState as unknown as string).toBe(service.archivedOrderStates.join(','));
    });
  });
});
