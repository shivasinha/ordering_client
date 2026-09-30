import { Component, inject } from '@angular/core';
import { KeyValue } from '@angular/common';

import { OrderState } from '@Ordering/api';

import { BaseListComponent } from '@Ordering/shared/components/base-list/base-list.component';
import { OrdersFilterComponent } from '@Ordering/portalComponents/orders-list/orders-filter/orders-filter.component';
import { ArchivedOrdersContainerService } from '@Ordering/portalComponents/orders-list/archived-orders-container/services/archived-orders-container.service';
import { OrdersListContainerBaseComponent } from '@Ordering/portalComponents/orders-list/orders-list-container-base.component';

/**
 * Smart container component for the Archived Orders list.
 * All shared logic lives in OrdersListContainerBaseComponent.
 */
@Component({
  selector: 'app-archived-orders-container',
  standalone: true,
  imports: [BaseListComponent, OrdersFilterComponent],
  providers: [ArchivedOrdersContainerService],
  templateUrl: '../orders-list-container.component.html',
  styleUrl: './archived-orders-container.component.scss',
})
export class ArchivedOrdersContainerComponent extends OrdersListContainerBaseComponent {
  protected override readonly containerService = inject(ArchivedOrdersContainerService);
  protected override readonly orderStateOptions: KeyValue<OrderState | undefined, string>[] =
    this.ordersListFilterService.archivedOrderStateOptions;
}
