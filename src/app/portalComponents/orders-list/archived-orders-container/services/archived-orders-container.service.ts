import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { OrderFilters, OrderItemAction, OrderItemType, OrderListResponse, OrderState, PaginationAndSorting, TrainRun } from '@Ordering/api';
import { ActionNamesEnum } from '@Ordering/data/custom/enum/listTypes';

import { OrderListViewModel } from '@Ordering/portalComponents/orders-list/models/order-list-view.model';
import { OrdersDataService } from '@Ordering/portalComponents/orders-list/services/orders-data.service';
import { BaseOrdersContainerService } from '@Ordering/portalComponents/orders-list/services/base-orders-container.service';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { ColumnConfig } from '@Ordering/shared/models/base-list-column.model';
import { ActionConfig } from '@Ordering/shared/models/base-list-action.model';
import { ActionDialogService } from '@Ordering/shared/services/action-dialog.service';
import { ArchivedOrderActions } from '@Ordering/data/custom/enum/archived-order-actions.enum';

/**
 * Container service for the Archived Orders list.
 * Extends BaseOrdersContainerService with archived-order-specific columns and actions.
 */
@Injectable()
export class ArchivedOrdersContainerService extends BaseOrdersContainerService {
  private readonly ordersDataService = inject(OrdersDataService);
  private readonly actionDialogService = inject(ActionDialogService);

  protected entityType = TabsTypesEnum.ARCHIVE_ORDERS;

  protected fetchData(filters: OrderFilters, pagination: PaginationAndSorting): Observable<OrderListResponse> {
    return this.ordersDataService.getArchivedOrdersList(filters, pagination);
  }

  protected get columns(): ColumnConfig<OrderListViewModel>[] {
    return this.sharedOrderColumns();
  }

  // Actions: only train-run related actions for AGREED orders
  protected get actions(): ActionConfig<OrderListViewModel>[] {
    return [
      {
        icon: 'visibility',
        tooltip: this.tr.translate('lblView'),
        handler: (item: OrderListViewModel) => this.navigateToOrderDetails(item),
      },
      {
        icon: 'cancel',
        tooltip: this.tr.translate('lblCancelTrainRun'),
        visible: (item: OrderListViewModel) => this.canCancelTrainRun(item),
        handler: (item: OrderListViewModel) => this.handleTrainRunAction(item, ArchivedOrderActions.CANCEL_TRAIN_RUN),
      },
      {
        icon: 'edit',
        tooltip: this.tr.translate('lblModifyTrainRun'),
        visible: (item: OrderListViewModel) => this.canModifyTrainRun(item),
        handler: (item: OrderListViewModel) => this.handleTrainRunAction(item, ArchivedOrderActions.MODIFY_TRAIN_RUN),
      },
    ];
  }

  private canCancelTrainRun(item: OrderListViewModel): boolean {
    return (
      this.isSingleTrainCancellationAllowed() &&
      this.isActionAllowed(ActionNamesEnum.CANCEL_TRAIN_RUN, item) &&
      item.state === OrderState.AGREED &&
      !this.hasTrainCancellationItem(item)
    );
  }

  // Path cancellation targets a single train run; hide it when orders may hold more than one order item.
  private isSingleTrainCancellationAllowed(): boolean {
    return this.configDataService.configData?.maxNumberOfOrderItemsPerOrder === 1;
  }

  private canModifyTrainRun(item: OrderListViewModel): boolean {
    return (
      this.isActionAllowed(ActionNamesEnum.MODIFY_TRAIN_RUN, item) &&
      item.state === OrderState.AGREED &&
      !this.hasTrainCancellationItem(item)
    );
  }

  private hasTrainCancellationItem(item: OrderListViewModel): boolean {
    return (
      item.orderItems?.[0]?.content?.type === OrderItemType.TRAIN_RUN &&
      item.orderItems?.[0]?.content?.action === OrderItemAction.CANCELLATION
    );
  }

  private handleTrainRunAction(item: OrderListViewModel, action: ArchivedOrderActions): void {
    if (!item.externalId) return;

    this.orderActionsService.getOrderDetails(item.externalId).subscribe({
      next: orderResponse => {
        const trainRunData = orderResponse.orderItems?.[0]?.offerItems?.[0]?.content?.item as TrainRun;
        this.actionDialogService.openTrainRunActionDialog(action, orderResponse, trainRunData).subscribe({
          // Reload only when the dialog closes with `true`, which the dialog
          // sets only after the full cancellation chain succeeds. Dismissed or
          // failed dialogs close with undefined/false and are ignored.
          next: result => {
            if (result) this.reload();
          },
        });
      },
    });
  }
}
