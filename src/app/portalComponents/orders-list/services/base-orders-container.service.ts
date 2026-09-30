import { inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';
import dayjs from 'dayjs';
import { MatDialog } from '@angular/material/dialog';

import type translations from '../../../../assets/lang/translations.json';

import { OrderFilters, OrderListResponse, OrderResponse, Source } from '@Ordering/api';
import { ChatService } from '@Ordering/chat/chat.service';

import { OrderListViewModel } from '@Ordering/portalComponents/orders-list/models/order-list-view.model';
import { INITIAL_ORDER_FILTER } from '@Ordering/portalComponents/orders-list/models/order-list-filter.model';
import { BaseListContainerService } from '@Ordering/shared/services/base-list-container.service';
import { ColumnConfig } from '@Ordering/shared/models/base-list-column.model';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { SNACKBARCONFIG_SUCCESS } from '@Ordering/utils/snackbar';
import { ConfirmationDialogComponent } from '@Ordering/shared/components/confirmation-dialog/confirmation-dialog.component';
import { DateTimeFormat } from '@Ordering/utils/dates';
import { ActionFrom } from '@Ordering/data/custom/enum/action-from.enum';
import { ActionNamesEnum } from '@Ordering/data/custom/enum/listTypes';

/**
 * Abstract base service shared by CurrentOrdersContainerService and ArchivedOrdersContainerService.
 * Contains all logic common to both order list containers:
 *  - view model mapping
 *  - item extraction
 *  - router link
 *  - shared column definitions
 *  - message dialog
 *  - confirmation + execute pattern
 */
export abstract class BaseOrdersContainerService extends BaseListContainerService<
  OrderFilters,
  OrderResponse,
  OrderListViewModel,
  OrderListResponse
> {
  protected readonly orderActionsService = inject(OrderActionsService);
  protected readonly navigationService = inject(NavigationService);
  protected readonly loadingSpinnerService = inject(LoadingSpinnerService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly dialog = inject(MatDialog);
  protected readonly chatService = inject(ChatService);

  protected override defaultFilter = INITIAL_ORDER_FILTER;
  protected override noDataMessage = this.tr.translate('msgNoListData');

  protected override extractItems(response: OrderListResponse): OrderResponse[] {
    return response.orders || [];
  }

  /**
   * Maps an {@link OrderResponse} object to an {@link OrderListViewModel}, formatting date fields,
   * counting order items, and translating enum values for display purposes.
   *
   * @param {OrderResponse} item - The order response object to be mapped.
   * @returns An {@link OrderListViewModel} containing the formatted and translated order data.
   */
  protected override mapToViewModel(item: OrderResponse): OrderListViewModel {
    const dateTimeFormat = DateTimeFormat.localeDateTime;
    return {
      ...item,
      formattedCreationDateTime: item.creationDateTime ? dayjs(item.creationDateTime).format(dateTimeFormat) : '',
      formattedLastModifiedDateTime: item.lastModifiedDateTime ? dayjs(item.lastModifiedDateTime).format(dateTimeFormat) : '',
      formattedExpirationDateTime: item.expirationDateTime ? dayjs(item.expirationDateTime).format(dateTimeFormat) : '',
      itemCount: item.orderItems?.length ?? 0,
      translatedState: this.tr.translateEnumValue(item.state, 'OrderState', true),
      translatedOrderType: this.tr.translateEnumValue(item.orderType, 'OrderType', true),
    };
  }

  /**
   * Row clicks navigate to the order detail page via NavigationService, which
   * automatically appends the `activeTab` query param from the current tab context.
   */
  protected override getOnRowClick(): (item: OrderListViewModel) => void {
    return (item: OrderListViewModel) => this.navigateToOrderDetails(item);
  }

  /**
   * Navigates to the order detail page. Used both by row clicks and explicit
   * "View" / "Edit" action buttons so the logic lives in one place.
   */
  protected navigateToOrderDetails(item: OrderResponse): void {
    if (item.externalId) {
      this.navigationService.navigate(['/orders', item.externalId]);
    }
  }

  /**
   * Returns the default column configuration for displaying order lists.
   *
   * Each column is defined by a `ColumnConfig<OrderListViewModel>` object, specifying properties such as:
   * - `field`: The property of the order to display.
   * - `header`: The translated header label for the column.
   * - `cssClass`: (Optional) A function to determine CSS classes based on the order's state.
   * - `sortable`: (Optional) Whether the column is sortable.
   * - `width`: (Optional) The width of the column.
   * - `icon`: (Optional) A function to determine the icon to display for the column.
   * - `tooltip`: (Optional) A function to determine the tooltip for the column.
   * - `iconClick`: (Optional) A function to handle icon click events.
   * - `iconPermission`: (Optional) Permission required to display the icon.
   *
   * The columns include order state, subject, order type, item count, creation and expiration dates,
   * last modification date, and message state with interactive icon and tooltip.
   *
   * @returns {ColumnConfig<OrderListViewModel>[]} The array of column configurations for the order list.
   */
  protected sharedOrderColumns(): ColumnConfig<OrderListViewModel>[] {
    return [
      {
        field: 'translatedState',
        sortField: 'state',
        header: this.tr.translate('lblState'),
        cssClass: (item: OrderListViewModel) => ['state', this.tr.translateEnumValue(item.state, 'OrderState')],
      },
      { field: 'externalId', header: this.tr.translate('lblOrderId') },
      { field: 'subject', header: this.tr.translate('lblSubject') },
      { field: 'translatedOrderType', sortField: 'orderType', header: this.tr.translate('lblOrderType') },
      { field: 'itemCount', sortable: false, header: this.tr.translate('lblItems') },
      { field: 'formattedCreationDateTime', sortField: 'creationDateTime', header: this.tr.translate('lblCreationDateTime') },
      { field: 'formattedExpirationDateTime', sortField: 'expirationDateTime', header: this.tr.translate('lblExpirtionDateTime') },
      { field: 'formattedLastModifiedDateTime', sortField: 'lastModifiedDateTime', header: this.tr.translate('lblLastChanged') },
      {
        field: 'messageState',
        header: this.tr.translate('lblMessage'),
        sortField: 'messageState',
        width: '60px',
        icon: (item: OrderListViewModel) => this.chatService.getMatIcon(item.messageState),
        tooltip: (item: OrderListViewModel) => this.chatService.getMessageTooltip(item.messageState),
        iconClick: (item: OrderListViewModel, event: MouseEvent) => this.openMessageDialog(item, event),
        iconPermission: 'canViewMessage',
      },
    ];
  }

  /**
   * Opens a message dialog for the specified order item after checking message permissions.
   *
   * This method first stops the propagation of the mouse event, then checks if the user has
   * permission to send a message regarding the given order. If permission is granted, it opens
   * the message dialog for the order item. After the dialog is closed, the order list is reloaded.
   *
   * @param {OrderListViewModel} item - The order item for which the message dialog should be opened.
   * @param {MouseEvent} event - The mouse event that triggered this action.
   */
  protected openMessageDialog(item: OrderListViewModel, event: MouseEvent): void {
    event.stopPropagation();
    this.chatService.checkMessagePermission(item.externalId).subscribe({
      next: () => {
        this.chatService
          .openMessageDialog(item)
          .afterClosed()
          .subscribe(() => this.reload());
      },
      error: () => {}, // suppress the rethrown error
    });
  }

  /**
   * Opens a confirmation dialog with the specified message.
   *
   * @param {string} message - The message to display in the confirmation dialog.
   * @returns {Observable<boolean>} An Observable that emits `true` if the user confirms, or `false` if the user cancels.
   */
  protected openConfirmationDialog(message: string): Observable<boolean> {
    return this.dialog.open(ConfirmationDialogComponent, { width: '450px', data: { message } }).afterClosed();
  }

  /**
   * Displays a confirmation dialog to the user and, upon confirmation, executes the provided action.
   * Shows a loading spinner while the action is in progress and displays a success notification upon completion.
   * Also triggers a reload after successful execution.
   *
   * @param confirmationKey - The translation key for the confirmation dialog message.
   * @param action - A function returning an Observable representing the action to execute upon confirmation.
   * @param successKey - The translation key for the success notification message.
   */
  protected confirmThenExecute(
    confirmationKey: keyof typeof translations,
    action: () => Observable<unknown>,
    successKey: keyof typeof translations,
  ): void {
    this.openConfirmationDialog(this.tr.translate(confirmationKey)).subscribe(confirmed => {
      if (!confirmed) return;

      this.loadingSpinnerService.showSpinner();
      action()
        .pipe(finalize(() => this.loadingSpinnerService.hideSpinner()))
        .subscribe({
          next: () => {
            this.notificationService.pushNotification(this.tr.translate(successKey), SNACKBARCONFIG_SUCCESS);
            this.reload();
          },
        });
    });
  }

  /**
   * Shared visibility guard for order-level actions.
   * Returns false if the user lacks the required permission for the action,
   * or if an Infrastructure Manager is viewing a Railway Undertaking order.
   *
   * @param {ActionNamesEnum} actionName - The ActionNamesEnum value for the action
   * @param element - The view model element; must have an `orderOrigin` field when IM/RU check applies
   */
  protected isActionAllowed(actionName: ActionNamesEnum, element: { orderOrigin?: Source }): boolean {
    const requiredPermission = this.userPermissionService.getRequiredPermission(actionName, ActionFrom.ORDER);
    if (requiredPermission && !this.userPermissionService.checkPermissions(requiredPermission)) {
      return false;
    }

    // TODO: This should be removed after train run list migration.
    // TODO: Discuss: Not required for all actions, only those that should be hidden from IM when viewing RU orders. Consider moving to a separate method if more actions are added.
    if (
      [
        ActionNamesEnum.EDIT,
        ActionNamesEnum.DELETE,
        ActionNamesEnum.CANCEL,
        ActionNamesEnum.MODIFY_TRAIN_RUN,
        ActionNamesEnum.CANCEL_TRAIN_RUN,
      ].includes(actionName as ActionNamesEnum)
    ) {
      const isIM = this.configDataService.isInfrastructureManagerUser();
      const isRUOrder = element.orderOrigin === Source.RAILWAY_UNDERTAKING_WEB_PORTAL;
      const isIMViewingRUOrder = isIM && isRUOrder;
      if (isIMViewingRUOrder) {
        return false;
      }
    }
    return true;
  }
}
