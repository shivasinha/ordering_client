import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of } from 'rxjs';

import { OrderListResponse, OrderFilters, OrderResponse, PaginationAndSorting, OrderingService } from '@Ordering/api';

import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { OrdersListFilterService } from '@Ordering/portalComponents/orders-list/services/orders-list-filter.service';

/**
 * Shared data-fetching service for the orders list.
 * Provides separate methods for current and archived orders while sharing the
 * common fetch pipeline (spinner, normalization, error handling).
 */
@Injectable({
  providedIn: 'root',
})
export class OrdersDataService {
  private readonly orderingService = inject(OrderingService);
  private readonly loadingSpinnerService = inject(LoadingSpinnerService);
  private readonly errorHandlingService = inject(ErrorHandlingService);
  private readonly ordersListFilterService = inject(OrdersListFilterService);

  /**
   * Retrieves the current orders list with backend filtering and pagination.
   * Falls back to the tab-scope current order states when no state is selected.
   *
   * @param {OrderFilters} filters - Filter criteria for the orders list.
   * @param {PaginationAndSorting} pagination - Pagination and sorting options.
   * @returns {Observable<OrderListResponse>}
   */
  public getCurrentOrdersList(filters?: OrderFilters, pagination?: PaginationAndSorting): Observable<OrderListResponse> {
    return this.fetchOrders(
      this.ordersListFilterService.resolveCurrentOrdersFilters(filters),
      pagination,
      OrderingApiName.GetCurrentOrdersList,
    );
  }

  /**
   * Retrieves the archived orders list with backend filtering and pagination.
   * Falls back to the tab-scope archived order states when no state is selected.
   *
   * @param {OrderFilters} filters - Filter criteria for the orders list.
   * @param {PaginationAndSorting} pagination - Pagination and sorting options.
   * @returns {Observable<OrderListResponse>}
   */
  public getArchivedOrdersList(filters?: OrderFilters, pagination?: PaginationAndSorting): Observable<OrderListResponse> {
    return this.fetchOrders(
      this.ordersListFilterService.resolveArchivedOrdersFilters(filters),
      pagination,
      OrderingApiName.GetArchivedOrdersList,
    );
  }

  /**
   * Fetches orders from the ordering API using the provided filters and pagination settings.
   *
   * Shows a loading spinner before the request starts and always hides it when the observable completes,
   * errors, or is unsubscribed.
   *
   * The response is normalized before being emitted. If an error occurs, it is delegated to the error
   * handling service and an empty fallback response is returned.
   *
   * @param {OrderFilters} resolvedFilters - The resolved set of filters used to query orders.
   * @param {PaginationAndSorting | undefined} pagination - Optional pagination and sorting information for the request.
   * @param {OrderingApiName} apiName - Identifier of the API context used for error handling.
   * @returns {Observable<OrderListResponse>} An observable that emits a normalized order list response, or an empty response on error.
   */
  private fetchOrders(
    resolvedFilters: OrderFilters,
    pagination: PaginationAndSorting | undefined,
    apiName: OrderingApiName,
  ): Observable<OrderListResponse> {
    this.loadingSpinnerService.showSpinner();

    return this.orderingService.getOrders(resolvedFilters, pagination, true).pipe(
      map(response => this.normalizeResponse(response)),
      catchError(error => {
        this.errorHandlingService.handleError(error, apiName);
        const emptyResponse: OrderListResponse = { orders: [], totalCount: 0 };
        return of(emptyResponse);
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Normalizes the API response to OrderListResponse format.
   * Handles both the new format ({ orders, totalCount }) and the legacy flat-array format.
   */
  private normalizeResponse(response: OrderListResponse | OrderResponse[]): OrderListResponse {
    if (Array.isArray(response)) {
      return { orders: response, totalCount: response.length };
    }
    return response;
  }
}
