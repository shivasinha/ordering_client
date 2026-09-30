import { inject, computed } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { PaginationAndSorting } from '@Ordering/api';

import { BaseListStateService } from '@Ordering/shared/services/base-list-state.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { LocalConfigService } from '@Ordering/shared/services/local-config.service';
import { BaseListConfig } from '@Ordering/shared/models/base-list-config.model';
import { ColumnConfig } from '@Ordering/shared/models/base-list-column.model';
import { ActionConfig } from '@Ordering/shared/models/base-list-action.model';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';

/**
 * Base response interface for list APIs
 * All list responses should have totalCount
 */
export interface BaseListResponse {
  totalCount: number;
}

/**
 * Abstract base service for managing list containers with filtering, pagination, sorting, and view model mapping.
 *
 * This class provides reusable state management, data fetching, and transformation logic for list-based UI components.
 * Subclasses must define entity-specific properties and implement abstract methods for data retrieval and formatting.
 *
 * @template TFilter - Type representing the filter model for the list.
 * @template TItem - Type representing the raw item returned from the API.
 * @template TViewModel - Type representing the formatted item for display in the UI.
 * @template TResponse - Type extending BaseListResponse, representing the API response structure.
 *
 * @remarks
 * - Handles state management via `BaseListStateService`.
 * - Integrates with `rxResource` for reactive data fetching.
 * - Provides computed signals for loading, error, and formatted data.
 * - Supports lazy-loaded columns and actions for efficient UI rendering.
 * - Offers event handlers for filter, pagination, and sorting changes.
 *
 * @example
 * ```typescript
 * class OrdersListService extends BaseListContainerService<OrderFilter, Order, OrderViewModel, OrdersListResponse> {
 *   // Implement required properties and methods...
 * }
 * ```
 */
export abstract class BaseListContainerService<TFilter, TItem, TViewModel, TResponse extends BaseListResponse> {
  protected readonly listStateService = inject(BaseListStateService);
  protected readonly tr = inject(TranslationsService);
  protected readonly userPermissionService = inject(UserPermissionService);
  protected readonly configDataService = inject(ConfigDataService);

  // Abstract properties that each entity must define
  protected abstract entityType: string;
  protected abstract defaultFilter: TFilter;
  protected abstract noDataMessage: string;

  /** Set to false in subclasses to prevent pagination, filter, and sort state from being persisted to localStorage. */
  protected readonly persistState: boolean = true;

  // Abstract methods that each entity must implement
  protected abstract fetchData(filters: TFilter, pagination: PaginationAndSorting): Observable<TResponse>;

  protected abstract extractItems(response: TResponse): TItem[];
  protected abstract get columns(): ColumnConfig<TViewModel>[];
  protected abstract get actions(): ActionConfig<TViewModel>[] | undefined;

  /**
   * Map API item to view model
   * Override this to transform/format data before sending to the component
   * This is where you format dates, numbers, arrays, etc. for display
   * Default implementation: spreads item properties
   */
  protected mapToViewModel(item: TItem): TViewModel {
    return item as unknown as TViewModel;
  }

  /**
   * Return a row-click handler for this list.
   * Override in a subclass to make rows navigable. The returned function is
   * placed in `listConfig.onRowClick` and called by the template on every row
   * click. Use `NavigationService.navigate()` inside so that the `activeTab`
   * query param is appended automatically.
   */
  protected getOnRowClick?(): (item: TViewModel) => void;

  //Reusable state management
  protected readonly stateSig = computed(() =>
    this.listStateService.getState<TFilter>(this.entityType, this.defaultFilter, this.persistState)(),
  );

  //Reusable data resource with rxResource
  protected readonly dataResource = rxResource({
    params: () => {
      const state = this.stateSig();
      const pagination = state.paginationAndSorting;
      // Resolve the display field (e.g. 'formattedCreationDateTime') to the API
      // sort field (e.g. 'creationDateTime') only here, so the state always stores
      // the column's field name — which matches matColumnDef and keeps the sort arrow visible.
      const column = this.columns.find(c => c.field === pagination.sortBy);
      const resolvedSortBy = column?.sortField ?? pagination.sortBy;
      return {
        filters: state.filters,
        paginationAndSorting: resolvedSortBy !== pagination.sortBy ? { ...pagination, sortBy: resolvedSortBy } : pagination,
      };
    },
    stream: ({ params }) => this.fetchData(params.filters, params.paginationAndSorting),
  });

  //Computed signals
  readonly currentFilters = computed(() => this.stateSig().filters);
  readonly isLoading = this.dataResource.isLoading;
  readonly hasError = computed(() => this.dataResource.error() !== undefined);

  //Reusable view model mapping
  readonly formattedData = computed((): TViewModel[] => {
    const response = this.dataResource.value() as TResponse;
    if (!response) return [];

    return this.extractItems(response).map(item => this.mapToViewModel(item));
  });

  //Reusable config composition
  readonly listConfig = computed((): BaseListConfig<TViewModel> => {
    const state = this.stateSig();
    const response = this.dataResource.value() as TResponse;

    return {
      data: this.formattedData(),
      columns: this.columns,
      actions: this.actions,
      onRowClick: this.getOnRowClick?.(),
      paginationAndSorting: {
        ...state.paginationAndSorting,
        totalCount: response?.totalCount ?? 0,
        pageSizeOptions: LocalConfigService.paginatorPageSizes,
        show: true,
      },
      ui: {
        noDataMessage: this.noDataMessage,
      },
    };
  });

  /**
   * Handles changes to the filter criteria for the list.
   * Updates the filters in the list state service for the specified entity type.
   *
   * @param {TFilter} filters - The new filter criteria to apply.
   */
  public onFilterChange(filters: TFilter): void {
    this.listStateService.updateFilters(this.entityType, filters);
  }

  /**
   * Handles the page change event from a paginated component.
   * Updates the pagination state for the current entity type using the provided page index and page size.
   *
   * @param {PageEvent} event - The page event containing the new page index and page size.
   */
  public onPageChange(event: PageEvent): void {
    this.listStateService.updatePagination(this.entityType, {
      pageIndex: event.pageIndex,
      pageSize: event.pageSize,
    });
  }

  /**
   * Handles changes to the sort order of a list.
   * Stores the column's display field name (matching matColumnDef) in state so the
   * Material sort arrow stays visible. Resolution to the actual API field name
   * happens in the rxResource params callback before calling fetchData.
   *
   * @param {Sort} sort - The sorting configuration containing the active sort field and direction.
   */
  public onSortChange(sort: Sort): void {
    this.listStateService.updateSort(this.entityType, sort);
  }

  /**
   * Forces an immediate re-fetch of the list data.
   * Call this after any mutation (delete, cancel, etc.) to refresh the list.
   */
  public reload(): void {
    this.dataResource.reload();
  }
}
