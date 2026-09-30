import { Component, inject } from '@angular/core';
import { KeyValue } from '@angular/common';

import { OrderState } from '@Ordering/api';

import { BaseListComponent } from '@Ordering/shared/components/base-list/base-list.component';
import { OrdersFilterComponent } from '@Ordering/portalComponents/orders-list/orders-filter/orders-filter.component';
import { CurrentOrdersContainerService } from '@Ordering/portalComponents/orders-list/current-orders-container/services/current-orders-container.service';
import { OrdersListContainerBaseComponent } from '@Ordering/portalComponents/orders-list/orders-list-container-base.component';

/**
 * Smart container component for the Current Orders list.
 * All shared logic lives in OrdersListContainerBaseComponent.
 */
@Component({
  selector: 'app-current-orders-container',
  standalone: true,
  imports: [BaseListComponent, OrdersFilterComponent],
  providers: [CurrentOrdersContainerService],
  templateUrl: '../orders-list-container.component.html',
  styleUrl: './current-orders-container.component.scss',
})
export class CurrentOrdersContainerComponent extends OrdersListContainerBaseComponent {
  protected override readonly containerService = inject(CurrentOrdersContainerService);
  protected override readonly orderStateOptions: KeyValue<OrderState | undefined, string>[] =
    this.ordersListFilterService.currentOrderStateOptions;
}
