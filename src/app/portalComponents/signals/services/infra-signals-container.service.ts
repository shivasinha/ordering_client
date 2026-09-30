import { computed, Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { defaultIfEmpty } from 'rxjs/operators';

import { AdminDataEntry, InfraSignalsFilters, InfraSignalsList, PaginationAndSorting } from '@Ordering/api';
import { ColumnConfig } from '@Ordering/shared/models/base-list-column.model';
import { ActionConfig } from '@Ordering/shared/models/base-list-action.model';
import { BaseListContainerService } from '@Ordering/shared/services/base-list-container.service';
import { InfraSignalsService } from './infra-signals.service';

export const INFRA_SIGNALS_ENTITY_TYPE = 'INFRA_SIGNALS';

/**
 * Container service for the signals search list.
 * Bridges the BaseListContainerService pattern to the searchOrderItemSignals endpoint.
 * Intended to be provided at the dialog component level (not root).
 */
@Injectable()
export class InfraSignalsContainerService extends BaseListContainerService<
  InfraSignalsFilters,
  AdminDataEntry,
  AdminDataEntry,
  InfraSignalsList
> {
  private readonly infraSignalsService = inject(InfraSignalsService);

  protected entityType = INFRA_SIGNALS_ENTITY_TYPE;
  protected defaultFilter: InfraSignalsFilters = {};
  protected noDataMessage = this.tr.translate('lblNoSignals');
  protected override readonly persistState = false;

  /** True once the first data response has been received (even if empty). */
  readonly hasLoaded = computed(() => this.dataResource.value() !== undefined);

  /**
   * Fetches signals from the backend using the provided filter and pagination.
   * @param {InfraSignalsFilters} filters - Display-name or ID filter.
   * @param {PaginationAndSorting} pagination - Pagination and sorting params.
   * @returns {Observable<InfraSignalsList>} The paginated signal list.
   */
  protected fetchData(filters: InfraSignalsFilters, pagination: PaginationAndSorting): Observable<InfraSignalsList> {
    return this.infraSignalsService
      .searchSignals({ filters, paginationAndSorting: pagination })
      .pipe(defaultIfEmpty({ items: [], totalCount: 0 } as InfraSignalsList));
  }

  protected extractItems(response: InfraSignalsList): AdminDataEntry[] {
    return response.items ?? [];
  }

  protected get columns(): ColumnConfig<AdminDataEntry>[] {
    return [{ field: 'display', header: this.tr.translate('lblArea') }];
  }

  protected get actions(): ActionConfig<AdminDataEntry>[] {
    return [];
  }

  /**
   * Builds an OrderItemSignalsFilters object from a raw search query string.
   * @param {string} query - The search text from the dialog input.
   * @returns {InfraSignalsFilters} The filter object to pass to onFilterChange.
   */
  public buildFilter(query: string): InfraSignalsFilters {
    const trimmed = query.trim();
    if (!trimmed) return {};
    return { display: [trimmed], substringSearch: true };
  }
}
