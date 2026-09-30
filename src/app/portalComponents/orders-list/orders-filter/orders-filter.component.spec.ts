// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { KeyValue } from '@angular/common';

import { OrderFilters, OrderState, OrderType } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { INITIAL_ORDER_FILTER } from '@Ordering/portalComponents/orders-list/models/order-list-filter.model';
import { OrderDateTimeEnum } from '@Ordering/data/custom/enum/orderDateTime';

import { OrdersFilterComponent } from './orders-filter.component';

describe('OrdersFilterComponent', () => {
  let component: OrdersFilterComponent;
  let fixture: ComponentFixture<OrdersFilterComponent>;

  const mockTranslationsService = {
    translate: jest.fn().mockImplementation((key: string) => `translated(${key})`),
  };

  const mockOrderStates: KeyValue<OrderState | undefined, string>[] = [
    { key: undefined, value: 'All States' },
    { key: OrderState.DRAFT, value: 'Draft' },
    { key: OrderState.SUBMITTED, value: 'Submitted' },
  ];

  const mockOrderTypes: KeyValue<OrderType | undefined, string>[] = [
    { key: undefined, value: 'All Types' },
    { key: OrderType.LTP, value: 'LTP' },
    { key: OrderType.STP, value: 'STP' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrdersFilterComponent, NoopAnimationsModule],
      providers: [{ provide: TranslationsService, useValue: mockTranslationsService }],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersFilterComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('orderStates', mockOrderStates);
    fixture.componentRef.setInput('orderTypes', mockOrderTypes);
    fixture.componentRef.setInput('initialFilters', INITIAL_ORDER_FILTER);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    TestBed.resetTestingModule();
    fixture?.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit — form seeding', () => {
    it('should seed form from INITIAL_ORDER_FILTER by default', () => {
      expect(component['filterForm'].value.dateRangeType).toBe(OrderDateTimeEnum.CREATION_DATETIME);
    });

    it('should seed searchString from initialFilters', () => {
      const filters: OrderFilters = { ...INITIAL_ORDER_FILTER, searchString: 'hello' };
      fixture.componentRef.setInput('initialFilters', filters);
      component.ngOnInit();

      expect(component['filterForm'].value.searchString).toBe('hello');
    });

    it('should seed orderState from initialFilters', () => {
      const filters: OrderFilters = { ...INITIAL_ORDER_FILTER, orderState: [OrderState.DRAFT] };
      fixture.componentRef.setInput('initialFilters', filters);
      component.ngOnInit();

      expect(component['filterForm'].value.orderState).toBe(OrderState.DRAFT);
    });

    it('should seed dateRangeType from initialFilters when provided', () => {
      const filters: OrderFilters = { ...INITIAL_ORDER_FILTER, dateRangeType: OrderDateTimeEnum.EXPIRATION_DATETIME };
      fixture.componentRef.setInput('initialFilters', filters);
      component.ngOnInit();

      expect(component['filterForm'].getRawValue().dateRangeType).toBe(OrderDateTimeEnum.EXPIRATION_DATETIME);
    });

    it('should set lastEmittedFilterJson baseline after ngOnInit', () => {
      expect(component['lastEmittedFilterJson']).toBeDefined();
    });
  });

  describe('filterChange output', () => {
    // The component's debounceTime(300) uses RxJS asyncScheduler (setInterval).
    // fakeAsync + tick() does not reliably flush setInterval-based schedulers.
    // Following the pattern established in spare-capacity-filter.component.spec.ts:
    // create a fresh component AFTER jest.useFakeTimers() so that the debounce
    // subscription is set up against the fake timer and jest.advanceTimersByTime
    // controls it.
    let fakeFixture: ComponentFixture<OrdersFilterComponent>;
    let fakeComponent: OrdersFilterComponent;

    beforeEach(() => {
      jest.useFakeTimers();
      fakeFixture = TestBed.createComponent(OrdersFilterComponent);
      fakeComponent = fakeFixture.componentInstance;
      fakeFixture.componentRef.setInput('orderStates', mockOrderStates);
      fakeFixture.componentRef.setInput('orderTypes', mockOrderTypes);
      fakeFixture.componentRef.setInput('initialFilters', INITIAL_ORDER_FILTER);
      fakeFixture.detectChanges();
    });

    afterEach(() => {
      fakeFixture?.destroy();
      jest.useRealTimers();
    });

    it('should emit filterChange after debounce when searchString changes', () => {
      const emitted: OrderFilters[] = [];
      fakeComponent.filterChange.subscribe(f => emitted.push(f));

      fakeComponent['filterForm'].patchValue({ searchString: 'new search' });
      jest.advanceTimersByTime(300);

      expect(emitted.length).toBe(1);
      expect(emitted[0].searchString).toBe('new search');
    });

    it('should not emit duplicate filter values', () => {
      const emitted: OrderFilters[] = [];
      fakeComponent.filterChange.subscribe(f => emitted.push(f));

      fakeComponent['filterForm'].patchValue({ searchString: 'same' });
      jest.advanceTimersByTime(300);
      fakeComponent['filterForm'].patchValue({ searchString: 'same' });
      jest.advanceTimersByTime(300);

      expect(emitted.length).toBe(1);
    });

    it('should emit undefined orderState when no state is selected', () => {
      const emitted: OrderFilters[] = [];
      fakeComponent.filterChange.subscribe(f => emitted.push(f));

      fakeComponent['filterForm'].patchValue({ orderState: undefined, searchString: 'trigger' });
      jest.advanceTimersByTime(300);

      expect(emitted[0].orderState).toEqual([]);
    });

    it('should wrap selected orderState in an array', () => {
      const emitted: OrderFilters[] = [];
      fakeComponent.filterChange.subscribe(f => emitted.push(f));

      fakeComponent['filterForm'].patchValue({ orderState: OrderState.DRAFT });
      jest.advanceTimersByTime(300);

      expect(emitted[0].orderState).toEqual([OrderState.DRAFT]);
    });

    it('should trim whitespace from searchString', () => {
      const emitted: OrderFilters[] = [];
      fakeComponent.filterChange.subscribe(f => emitted.push(f));

      fakeComponent['filterForm'].patchValue({ searchString: '  trimmed  ' });
      jest.advanceTimersByTime(300);

      expect(emitted[0].searchString).toBe('trimmed');
    });

    it('should not emit when only one date of the range is filled', () => {
      const emitted: OrderFilters[] = [];
      fakeComponent.filterChange.subscribe(f => emitted.push(f));

      fakeComponent['dateRange'].patchValue({ beginDate: new Date(), endDate: undefined });
      jest.advanceTimersByTime(300);

      expect(emitted.length).toBe(0);
    });

    it('should not include dateRange or dateRangeType when no dates are selected', () => {
      const emitted: OrderFilters[] = [];
      fakeComponent.filterChange.subscribe(f => emitted.push(f));

      fakeComponent['filterForm'].patchValue({ searchString: 'no-range' });
      jest.advanceTimersByTime(300);

      expect(emitted[0].dateRange).toBeUndefined();
      expect(emitted[0].dateRangeType).toBeUndefined();
    });
  });

  describe('clearDateRange', () => {
    it('should reset the date range group', () => {
      component['dateRange'].patchValue({ beginDate: new Date(), endDate: new Date() });

      const event = { stopPropagation: jest.fn() } as any;
      component['clearDateRange'](event);

      // dateRange FormControl has nonNullable: true with initial value { beginDate: undefined, endDate: undefined },
      // so reset() restores the initial value (undefined), not null.
      expect(component['dateRange'].value.beginDate).toBeUndefined();
      expect(component['dateRange'].value.endDate).toBeUndefined();
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });
});
