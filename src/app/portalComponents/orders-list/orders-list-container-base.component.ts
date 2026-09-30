import { inject, Signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { KeyValue } from '@angular/common';

import { OrderFilters, OrderState } from '@Ordering/api';

import { BaseOrdersContainerService } from '@Ordering/portalComponents/orders-list/services/base-orders-container.service';
import { OrdersListFilterService } from '@Ordering/portalComponents/orders-list/services/orders-list-filter.service';
import { BaseListConfig } from '@Ordering/shared/models/base-list-config.model';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { OrderListViewModel } from './models/order-list-view.model';

/**
 * Abstract base class shared by CurrentOrdersContainerComponent and ArchivedOrdersContainerComponent.
 *
 * Contains all shared template bindings and event-handler delegations.
 * Concrete subclasses only need to declare their `@Component` metadata,
 * provide their specific container service, and set `orderStateOptions`.
 */
export abstract class OrdersListContainerBaseComponent {
  /** Concrete service instance provided by each subclass. */
  protected abstract readonly containerService: BaseOrdersContainerService;

  /** Tab-specific order state options forwarded to the filter component. */
  protected abstract readonly orderStateOptions: KeyValue<OrderState | undefined, string>[];

  protected readonly ordersListFilterService = inject(OrdersListFilterService);
  protected readonly filterService = inject(FilterService);

  /**
   * Getter-based delegation: lazy so it works even though `containerService`
   * is set by the derived class after the base class fields are initialised.
   */
  protected get currentFilters(): Signal<OrderFilters> {
    return this.containerService.currentFilters;
  }

  protected get listConfig(): Signal<BaseListConfig<OrderListViewModel>> {
    return this.containerService.listConfig;
  }

  protected onFilterChange(filters: OrderFilters): void {
    this.containerService.onFilterChange(filters);
  }

  protected onPageChange(event: PageEvent): void {
    this.containerService.onPageChange(event);
  }

  protected onSortChange(sort: Sort): void {
    this.containerService.onSortChange(sort);
  }
}
