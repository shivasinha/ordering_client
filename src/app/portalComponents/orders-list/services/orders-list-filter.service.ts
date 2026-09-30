import { Injectable, inject } from '@angular/core';
import { KeyValue } from '@angular/common';

import { OrderFilters, OrderState } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';

/**
 * Central service for orders-list filter logic.
 *
 * Responsibilities:
 *  - Owns the tab-scope order state lists (current / archived)
 *  - Owns the all-valid-order-types list
 *  - Builds the dropdown option arrays for each tab's filter component
 *  - Resolves and serializes filters before they are sent to the API
 */
@Injectable({
  providedIn: 'root',
})
export class OrdersListFilterService {
  private readonly tr = inject(TranslationsService);

  /** Order states shown on the Current Orders tab. */
  readonly currentOrderStates: OrderState[] = [OrderState.DRAFT, OrderState.SUBMITTED, OrderState.OFFERED, OrderState.REFUSED];

  /** Order states shown on the Archived Orders tab. */
  readonly archivedOrderStates: OrderState[] = [OrderState.CANCELLED, OrderState.AGREED, OrderState.REJECTED];

  /** Dropdown options for the order-state filter on the Current Orders tab. */
  readonly currentOrderStateOptions: KeyValue<OrderState | undefined, string>[] = [
    { key: undefined, value: this.tr.translate('lblAllStates') },
    { key: OrderState.DRAFT, value: this.tr.translate('lblDraft') },
    { key: OrderState.SUBMITTED, value: this.tr.translate('lblSubmitted') },
    { key: OrderState.OFFERED, value: this.tr.translate('lblOffered') },
    { key: OrderState.REFUSED, value: this.tr.translate('lblRefused') },
  ];

  /** Dropdown options for the order-state filter on the Archived Orders tab. */
  readonly archivedOrderStateOptions: KeyValue<OrderState | undefined, string>[] = [
    { key: undefined, value: this.tr.translate('lblAllStates') },
    { key: OrderState.AGREED, value: this.tr.translate('lblAgreed') },
    { key: OrderState.CANCELLED, value: this.tr.translate('lblCancelled') },
    { key: OrderState.REJECTED, value: this.tr.translate('lblRejected') },
  ];

  /**
   * Resolves and serializes filters for the Current Orders tab.
   * Falls back to `currentOrderStates` when no state is selected.
   */
  public resolveCurrentOrdersFilters(filters: OrderFilters | undefined): OrderFilters {
    return this.buildResolvedFilters(filters, this.currentOrderStates);
  }

  /**
   * Resolves and serializes filters for the Archived Orders tab.
   * Falls back to `archivedOrderStates` when no state is selected.
   */
  public resolveArchivedOrdersFilters(filters: OrderFilters | undefined): OrderFilters {
    return this.buildResolvedFilters(filters, this.archivedOrderStates);
  }

  /**
   * Applies fallbacks and serializes `orderState` as CSV strings
   * so the generated serializer emits `?orderState=1,0,5` instead of repeated params.
   */
  private buildResolvedFilters(filters: OrderFilters | undefined, fallbackStates: OrderState[]): OrderFilters {
    const resolvedStates = filters?.orderState?.length ? filters.orderState : fallbackStates;

    return {
      ...filters,
      orderState: resolvedStates.join(',') as unknown as Array<OrderState>,
    };
  }
}
