import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Input,
  ViewChild,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';

import { finalize, Subject, takeUntil } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslatableEnumPipe } from '@Ordering/core/pipes/translatable-enum.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ActionNamesEnum, ListTypesEnum } from '@Ordering/data/custom/enum/listTypes';
import { ConfirmationDialogComponent } from '@Ordering/shared/components/confirmation-dialog/confirmation-dialog.component';
import {
  OrderItemResponse,
  OrderResponse,
  TrainRun,
  MessageState,
  OrderItemContent,
  TrainState,
  OrderState,
  OrderItem,
  OrderItemAction,
  Source,
  TrainRunListItem,
} from '@Ordering/api';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { ListActionsService } from '@Ordering/shared/services/list-actions.service';
import { isRestriction, isTrainRun, isTrainRunCancellation } from '@Ordering/utils/type-guards/data';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { OrderItemHandlingService } from '@Ordering/shared/services/order-item-handling.service';
import { LocalConfigService } from '@Ordering/shared/services/local-config.service';
import { isFiniteNumber } from '@Ordering/utils/type-guards/common';
import { EnumNameList } from '@Ordering/data/custom/enum-name-list';
import { enumMaps } from '@Ordering/data/custom/enum-maps';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { SNACKBARCONFIG_SUCCESS } from '@Ordering/utils/snackbar';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { ActionDialogService } from '@Ordering/shared/services/action-dialog.service';
import { ArchivedOrderActions } from '@Ordering/data/custom/enum/archived-order-actions.enum';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { ActionFrom } from '@Ordering/data/custom/enum/action-from.enum';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { DateTimeFormat } from '@Ordering/utils/dates';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, SharedMaterialModule, TranslatePipe, TranslatableEnumPipe],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
/**
 * @deprecated Use `BaseListComponent` instead. This component is a legacy implementation and may be removed in future versions.
 * Currently, it is used for the order and offer item list. The `BaseListComponent` provides a more flexible and reusable approach for rendering lists.
 * @see BaseListComponent
 */
export class ListComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;
  @ViewChild(MatSort) sort: MatSort | undefined;

  @Input() columns: any[] = [];
  @Input() data: MatTableDataSource<any> | undefined;
  @Input() listType: ListTypesEnum | undefined;
  @Input() enableRouting: boolean = false;
  @Input() itemsId: string[] = [];

  @Output() public refreshCurrentOrdersList = new EventEmitter<void>();
  @Output() public refreshOrderData = new EventEmitter<void>();

  private navigationService = inject(NavigationService);
  private listActionsService = inject(ListActionsService);
  private orderActionsService = inject(OrderActionsService);
  private orderItemHandlingService = inject(OrderItemHandlingService);
  private dialog = inject(MatDialog);
  private tr = inject(TranslationsService);
  private errorHandlingService = inject(ErrorHandlingService);
  private loadingSpinnerService = inject(LoadingSpinnerService);
  private notificationService = inject(NotificationService);
  protected messageState = MessageState;
  protected EnumNameList = EnumNameList;
  protected enumMaps = enumMaps;
  protected ListTypesEnum = ListTypesEnum;
  private route = inject(ActivatedRoute);
  private orderId = this.route.snapshot.paramMap.get('externalId');
  private destroy$ = new Subject<void>();
  private actionDialogService = inject(ActionDialogService);
  private readonly userPermissionService: UserPermissionService = inject(UserPermissionService);
  private readonly configDataService = inject(ConfigDataService);

  protected tableDataSource: MatTableDataSource<any> | undefined;

  protected displayedColumns: string[] = [];

  protected paginatorPageSizes: number[] = LocalConfigService.paginatorPageSizes;

  protected readonly dateTimeFormat: string = DateTimeFormat.localeDateTime;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params: ParamMap) => {
      this.orderId = params.get('externalId');
    });

    this.orderItemHandlingService.highlightIncompleteRowsSig.set(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && changes['data'].currentValue) {
      this.tableDataSource = this.data;
      this.displayedColumns = this.columns
        .filter(col => (typeof col.columnVisibility === 'function' ? col.columnVisibility() : col.columnVisibility !== false))
        .map(col => col.columnDef);
      this.defferedTableSetup();
    }
  }

  ngAfterViewInit(): void {
    this.defferedTableSetup();
  }

  /**
   * Sets up the table after a delay using `setTimeout`.
   * This method defers the table setup to ensure that any necessary
   * asynchronous operations or rendering processes have completed.
   *
   * @returns {void}
   */
  private defferedTableSetup(): void {
    setTimeout(() => {
      this.setupTable();
    });
  }
  /**
   * Sets up the table by assigning the paginator and sort to the table data source.
   * This method ensures that the table data source has the necessary paginator and sort
   * functionalities if they are available.
   *
   * @returns {void}
   */
  private setupTable(): void {
    if (this.tableDataSource && this.paginator && this.sort) {
      this.tableDataSource.paginator = this.paginator;
      this.tableDataSource.sort = this.sort;
    }
  }

  /**
   * Perform the action based on the action name.
   * @param {OrderResponse | TrainRun} data
   * @param {string} action
   * @returns {void}
   */
  protected performAction(
    data: OrderResponse | TrainRun | TrainRunListItem | OrderItemResponse,
    actionName: ActionNamesEnum,
    index?: number,
  ): void {
    switch (actionName) {
      case ActionNamesEnum.DELETE:
        this.delete(index);
        break;
      case ActionNamesEnum.EDIT:
        this.navigateByListType(data, index);
        break;
      case ActionNamesEnum.VIEW:
        this.navigateByListType(data, index);
        break;
      case ActionNamesEnum.CANCEL_TRAIN_RUN:
        // This will only be triggered from order detail view for order items. List view implementation for tabs has been moved.
        this.actionDialogService.openTrainRunActionDialog(
          actionName as unknown as ArchivedOrderActions,
          this.orderActionsService.currentlySelectedOrderSig(),
          data as TrainRun,
        );
        break;
      case ActionNamesEnum.MODIFY_TRAIN_RUN:
        // This will only be triggered from order detail view order items. List view implementation for tabs has been moved.
        this.actionDialogService.openTrainRunActionDialog(
          actionName as unknown as ArchivedOrderActions,
          this.orderActionsService.currentlySelectedOrderSig(),
          data as TrainRun,
        );
        break;
      default:
        break;
    }
    event?.stopPropagation();
  }

  /**
   * Deletes an order item by its ID and index.
   *
   * @param {string} orderId - The ID of the order to delete the item from.
   * @param {number} index - The index of the item to delete in the order items array.
   * @returns void
   *
   * This method shows a loading spinner while the deletion is in progress.
   * On successful deletion, it pushes a success notification and emits an event to refresh order data.
   * On error, it pushes an error notification.
   * The loading spinner is hidden once the operation is complete.
   */
  private deleteOrderItem(orderId: string, index: number): void {
    this.loadingSpinnerService.showSpinner();
    this.listActionsService
      .deleteOrderItem(orderId, this.itemsId[index])
      .pipe(
        finalize(() => {
          this.loadingSpinnerService.hideSpinner();
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.pushNotification(this.tr.translate('msgSuccessDeleteOrderItem'), SNACKBARCONFIG_SUCCESS);
          this.refreshOrderData.emit();
        },
        error: error => {
          this.errorHandlingService.handleError(error, OrderingApiName.DeleteOrderItem);
        },
      });
  }

  /**
   * Delete the clicked data.
   * Used for deleting order items in the order detail view. Shows a confirmation dialog before deletion.
   * @param {number} [index] Optional index parameter
   * @returns {void}
   */
  private delete(index?: number): void {
    switch (this.listType) {
      case ListTypesEnum.ORDER_ITEMS: {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
          width: '450px',
          height: '200px',
          data: { message: this.tr.translate('msgDeleteItem') },
        });
        dialogRef.afterClosed().subscribe(result => {
          if (result && isFiniteNumber(index) && this.orderId) {
            this.deleteOrderItem(this.orderId, index);
          }
        });
        break;
      }

      default:
        return;
    }
  }

  /**
   * Navigate to a route with base path and dynamic parameters.
   * This method allows for dynamic route construction by appending any number of route parameters to a base path.
   * The 'activeTab' query param is automatically added by BreadcrumbService for breadcrumb navigation.
   *
   * Examples:
   * 1. Navigate to order detail:
   *    this.navigate('/orders', '12345');
   *    // Resulting route: '/orders/12345?activeTab=CURRENT_ORDERS'
   *
   * 2. Navigate to a specific order item within an order:
   *    this.navigate('/orders', '12345', 'order-items', '67890');
   *    // Resulting route: '/orders/12345/order-items/67890?activeTab=CURRENT_ORDERS'
   *
   * @param {string} basePath - The base route path
   * @param {string[]} params - Dynamic parameters to append to the route
   * @returns {void}
   */
  protected navigate(basePath: string, ...params: string[]): void {
    if (!this.enableRouting || !basePath) {
      return;
    }

    const route = [basePath, ...params];

    this.navigationService.navigate(route);
  }

  /**
   * Navigate to the appropriate route based on the data.
   * @param {OrderResponse | TrainRun | OrderItemResponse} data
   * @param {number | undefined} index - The index of the row (optional)
   * @returns {void}
   */
  private navigateByListType(data: OrderResponse | TrainRun | TrainRunListItem | OrderItemResponse, index?: number): void {
    switch (this.listType) {
      case ListTypesEnum.ORDER_ITEMS:
        if ((isTrainRun(data) || isTrainRunCancellation(data) || isRestriction(data)) && isFiniteNumber(index) && this.orderId) {
          this.navigate('/orders', this.orderId, 'order-items', this.itemsId[index]);
        }
        break;
      case ListTypesEnum.OFFER_ITEMS:
        if (isTrainRun(data) && isFiniteNumber(index) && this.orderId) {
          this.navigate('/orders', this.orderId, 'offer-items', this.itemsId[index]);
        }
        break;
      default:
        return;
    }
  }

  /**
   * Handle row click and navigate to the appropriate route based on the row data.
   * @param {TrainRun | OrderItemResponse} row - The row data containing necessary parameters for navigation
   * @param {number} index - The index of the row
   * @returns {void}
   */
  public onRowClick(row: TrainRun | OrderItemResponse, index: number): void {
    this.navigateByListType(row, index);
  }

  /**
   * Checks if the order item at the given index is incomplete and returns a boolean value.
   *
   * @param {number} index - The index of the order item to check
   * @returns {boolean} A boolean value indicating whether the order item is incomplete
   */
  protected isOrderItemIncomplete(orderItem: OrderItemContent): boolean {
    return (
      this.orderItemHandlingService.highlightIncompleteRowsSig() &&
      (this.orderItemHandlingService.missingFieldsCache.get((orderItem as TrainRun).trainNumber)?.length ?? 0) > 0
    );
  }

  /**
   * Determines whether the action should be visible based on the element's state or project name.
   *
   * @param {Action} action - The action object.
   * @param {Object} element - The element object with state and projectName properties.
   * @param {OrderState | TrainState} element.state - The current state of the element.
   * @param {string} element.projectName - The project name associated with the element.
   * @returns {boolean} - Returns true if the action should be visible based on the specified conditions.
   */
  protected isActionVisible(
    actionVisibility: OrderState[] | TrainState[] | boolean | string | ((element: any) => boolean) | undefined,
    element: { state: OrderState | TrainState; isWithinProjectPeriod: boolean; orderItems: OrderItem[]; orderOrigin: Source },
    actionName: string,
  ): boolean {
    const requiredPermission = this.userPermissionService.getRequiredPermission(actionName, ActionFrom.ORDER);

    // If there are specific permission requirements for this action, check them.
    // If the user lacks the required permission, the action is not visible.
    if (requiredPermission && !this.userPermissionService.checkPermissions(requiredPermission)) {
      return false;
    }

    // This case handles the case where the icon should always be visible if the user has permission.
    // i.e ., for view action.
    if (actionName === ActionNamesEnum.VIEW) {
      return true;
    }

    // Handle function-based visibility (generic and configurable approach)
    if (typeof actionVisibility === 'function') {
      return actionVisibility(element);
    }

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

    return (
      (typeof actionVisibility === 'boolean' && actionVisibility !== element.isWithinProjectPeriod) ||
      (actionVisibility instanceof Object &&
        (actionVisibility as (OrderState | TrainState)[]).includes(element.state) &&
        element.orderItems?.[0].content?.action !== OrderItemAction.CANCELLATION)
    );
  }

  /**
   * Checks if the given date is valid.
   * This method uses the Date.parse() function to determine if the date is valid.\
   * @param {any} date - The date to check.
   * @returns {boolean} - Returns true if the date is valid, false otherwise.
   */
  protected isValidDate(date: any): boolean {
    return !isNaN(Date.parse(date));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
