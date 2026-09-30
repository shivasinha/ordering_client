import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { OrderFilters, OrderListResponse, OrderState, PaginationAndSorting } from '@Ordering/api';
import { ActionNamesEnum } from '@Ordering/data/custom/enum/listTypes';

import { OrderListViewModel } from '@Ordering/portalComponents/orders-list/models/order-list-view.model';
import { OrdersDataService } from '@Ordering/portalComponents/orders-list/services/orders-data.service';
import { BaseOrdersContainerService } from '@Ordering/portalComponents/orders-list/services/base-orders-container.service';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { ColumnConfig } from '@Ordering/shared/models/base-list-column.model';
import { ActionConfig } from '@Ordering/shared/models/base-list-action.model';

/**
 * Container service for the Current Orders list.
 * Extends BaseOrdersContainerService with current-order-specific columns and actions.
 */
@Injectable()
export class CurrentOrdersContainerService extends BaseOrdersContainerService {
  private readonly ordersDataService = inject(OrdersDataService);

  protected entityType = TabsTypesEnum.CURRENT_ORDERS;

  protected fetchData(filters: OrderFilters, pagination: PaginationAndSorting): Observable<OrderListResponse> {
    return this.ordersDataService.getCurrentOrdersList(filters, pagination);
  }

  protected get columns(): ColumnConfig<OrderListViewModel>[] {
    return this.sharedOrderColumns();
  }

  protected get actions(): ActionConfig<OrderListViewModel>[] {
    return [
      {
        icon: 'visibility',
        tooltip: this.tr.translate('lblView'),
        handler: (item: OrderListViewModel) => this.navigateToOrderDetails(item),
      },
      {
        icon: 'cancel',
        tooltip: this.tr.translate('lblCancel'),
        visible: (item: OrderListViewModel) => this.canCancelOrder(item),
        handler: (item: OrderListViewModel) => this.handleCancelOrder(item),
      },
      {
        icon: 'delete',
        tooltip: this.tr.translate('lblDelete'),
        visible: (item: OrderListViewModel) => this.canDeleteOrder(item),
        handler: (item: OrderListViewModel) => this.handleDeleteOrder(item),
      },
      {
        icon: 'edit',
        tooltip: this.tr.translate('lblEdit'),
        visible: (item: OrderListViewModel) => this.canEditOrder(item),
        handler: (item: OrderListViewModel) => this.navigateToOrderDetails(item),
      },
    ];
  }

  private canCancelOrder(item: OrderListViewModel): boolean {
    return this.isActionAllowed(ActionNamesEnum.CANCEL, item) && this.orderActionsService.orderCancelableStates.includes(item.state);
  }

  private canDeleteOrder(item: OrderListViewModel): boolean {
    return this.isActionAllowed(ActionNamesEnum.DELETE, item) && this.orderActionsService.orderDeletableStates.includes(item.state);
  }

  private canEditOrder(item: OrderListViewModel): boolean {
    return this.isActionAllowed(ActionNamesEnum.EDIT, item) && item.state === OrderState.DRAFT;
  }

  private handleCancelOrder(item: OrderListViewModel): void {
    if (!item.externalId) return;
    this.confirmThenExecute('msgCancelOrder', () => this.orderActionsService.cancelOrder(item.externalId!), 'msgSuccessCancelOrder');
  }

  private handleDeleteOrder(item: OrderListViewModel): void {
    if (!item.externalId) return;
    this.confirmThenExecute('msgDelete', () => this.orderActionsService.deleteDraftOrder(item.externalId), 'msgSuccessDeleteDraftOrder');
  }
}
