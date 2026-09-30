import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OrderingService, OrderListResponse, OrderResponse, OrderFilters, OrderState } from '@Ordering/api';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { OrdersListFilterService } from '@Ordering/portalComponents/orders-list/services/orders-list-filter.service';

import { OrdersDataService } from './orders-data.service';

describe('OrdersDataService', () => {
  let service: OrdersDataService;
  let mockOrderingService: { getOrders: jest.Mock };
  let mockLoadingSpinnerService: jest.Mocked<LoadingSpinnerService>;
  let mockErrorHandlingService: jest.Mocked<ErrorHandlingService>;
  let mockOrdersListFilterService: jest.Mocked<
    Pick<OrdersListFilterService, 'resolveCurrentOrdersFilters' | 'resolveArchivedOrdersFilters'>
  >;

  const mockFilters: OrderFilters = { orderState: [OrderState.DRAFT], orderType: [] };
  const mockPagination = { pageIndex: 0, pageSize: 25, sortBy: 'subject', sortOrder: 'asc' as any };
  const mockOrderResponse: OrderListResponse = {
    orders: [{ externalId: '1', subject: 'Test' } as OrderResponse],
    totalCount: 1,
  };

  beforeEach(() => {
    mockOrderingService = { getOrders: jest.fn() };
    mockLoadingSpinnerService = { showSpinner: jest.fn(), hideSpinner: jest.fn() } as any;
    mockErrorHandlingService = { handleError: jest.fn() } as any;
    mockOrdersListFilterService = {
      resolveCurrentOrdersFilters: jest.fn().mockImplementation(f => f ?? {}),
      resolveArchivedOrdersFilters: jest.fn().mockImplementation(f => f ?? {}),
    };

    TestBed.configureTestingModule({
      providers: [
        OrdersDataService,
        { provide: OrderingService, useValue: mockOrderingService },
        { provide: LoadingSpinnerService, useValue: mockLoadingSpinnerService },
        { provide: ErrorHandlingService, useValue: mockErrorHandlingService },
        { provide: OrdersListFilterService, useValue: mockOrdersListFilterService },
      ],
    });

    service = TestBed.inject(OrdersDataService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getCurrentOrdersList', () => {
    it('should resolve filters via OrdersListFilterService', done => {
      mockOrderingService.getOrders.mockReturnValue(of(mockOrderResponse));

      service.getCurrentOrdersList(mockFilters, mockPagination).subscribe({
        complete: () => {
          expect(mockOrdersListFilterService.resolveCurrentOrdersFilters).toHaveBeenCalledWith(mockFilters);
          done();
        },
      });
    });

    it('should show and hide spinner', () => {
      mockOrderingService.getOrders.mockReturnValue(of(mockOrderResponse));

      service.getCurrentOrdersList(mockFilters, mockPagination).subscribe();

      expect(mockLoadingSpinnerService.showSpinner).toHaveBeenCalled();
      expect(mockLoadingSpinnerService.hideSpinner).toHaveBeenCalled();
    });

    it('should emit the normalized response', done => {
      mockOrderingService.getOrders.mockReturnValue(of(mockOrderResponse));

      service.getCurrentOrdersList(mockFilters, mockPagination).subscribe({
        next: result => {
          expect(result).toEqual(mockOrderResponse);
          done();
        },
      });
    });

    it('should normalize a legacy flat-array response', done => {
      const legacyResponse = [{ externalId: '1' } as OrderResponse];
      mockOrderingService.getOrders.mockReturnValue(of(legacyResponse as any));

      service.getCurrentOrdersList(mockFilters, mockPagination).subscribe({
        next: result => {
          expect(result.orders).toEqual(legacyResponse);
          expect(result.totalCount).toBe(1);
          done();
        },
      });
    });

    it('should handle errors and return empty response', done => {
      const error = new Error('fetch failed');
      mockOrderingService.getOrders.mockReturnValue(throwError(() => error));

      service.getCurrentOrdersList(mockFilters, mockPagination).subscribe({
        next: result => {
          expect(result).toEqual({ orders: [], totalCount: 0 });
          expect(mockErrorHandlingService.handleError).toHaveBeenCalledWith(error, OrderingApiName.GetCurrentOrdersList);
          done();
        },
      });
    });

    it('should still hide spinner on error', () => {
      mockOrderingService.getOrders.mockReturnValue(throwError(() => new Error('error')));

      service.getCurrentOrdersList(mockFilters, mockPagination).subscribe();

      expect(mockLoadingSpinnerService.hideSpinner).toHaveBeenCalled();
    });
  });

  describe('getArchivedOrdersList', () => {
    it('should resolve filters via OrdersListFilterService', done => {
      mockOrderingService.getOrders.mockReturnValue(of(mockOrderResponse));

      service.getArchivedOrdersList(mockFilters, mockPagination).subscribe({
        complete: () => {
          expect(mockOrdersListFilterService.resolveArchivedOrdersFilters).toHaveBeenCalledWith(mockFilters);
          done();
        },
      });
    });

    it('should emit the normalized response', done => {
      mockOrderingService.getOrders.mockReturnValue(of(mockOrderResponse));

      service.getArchivedOrdersList(mockFilters, mockPagination).subscribe({
        next: result => {
          expect(result).toEqual(mockOrderResponse);
          done();
        },
      });
    });

    it('should handle errors with the archived API name', done => {
      const error = new Error('fetch failed');
      mockOrderingService.getOrders.mockReturnValue(throwError(() => error));

      service.getArchivedOrdersList(mockFilters, mockPagination).subscribe({
        next: result => {
          expect(result).toEqual({ orders: [], totalCount: 0 });
          expect(mockErrorHandlingService.handleError).toHaveBeenCalledWith(error, OrderingApiName.GetArchivedOrdersList);
          done();
        },
      });
    });
  });
});
