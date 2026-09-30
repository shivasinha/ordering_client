import { CommonModule, KeyValue } from '@angular/common';
import { AfterViewInit, Component, effect, inject, OnInit, Signal, signal, ViewChild, WritableSignal } from '@angular/core';

import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

import { concatMap, finalize, forkJoin, map, Observable, of, tap } from 'rxjs';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { MatTableDataSource } from '@angular/material/table';
import { EnumNameList } from '@Ordering/data/custom/enum-name-list';

import {
  MessageState,
  Order,
  OrderItemContent,
  OrderResponse,
  OrderState,
  Config,
  OrderItemAction,
  OrderItemResponse,
  OrderItemType,
  OrderType,
} from '@Ordering/api';

import { ConfirmationDialogComponent } from '@Ordering/shared/components/confirmation-dialog/confirmation-dialog.component';
import { ListComponent } from '@Ordering/portalComponents/list/list.component';
import { ActionNamesEnum, ListTypesEnum, ListViewColumns } from '@Ordering/data/custom/enum/listTypes';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { SNACKBARCONFIG_ERROR, SNACKBARCONFIG_SUCCESS } from '@Ordering/utils/snackbar';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { OrderItemHandlingService } from '@Ordering/shared/services/order-item-handling.service';
import { ChatService } from '@Ordering/chat/chat.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ITabInstanceData } from '@Ordering/data/custom/ITabInstanceData';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { isFiniteNumber, isValidEnumValue } from '@Ordering/utils/type-guards/common';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { HttpErrorResponse } from '@angular/common/http';
import { HasPermissionDirective } from '@Ordering/core/directives/has-permission.directive';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
import { ActionFrom } from '@Ordering/data/custom/enum/action-from.enum';
import { TranslatableEnumPipe } from '@Ordering/core/pipes/translatable-enum.pipe';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { SOURCE_TAB_PARAM } from '@Ordering/shared/services/breadcrumb.service';
import { TextareaComponent } from '@Ordering/shared/components/textarea/textarea.component';
import { TextareaConfig } from '@Ordering/shared/components/textarea/textarea-config.interface';
import { OrderItemModuleRegistry } from '@Ordering/shared/services/order-item-module-registry.service';

type OrderItemContentRow = OrderItemContent & { offerDeadline?: string; externalId?: string; offerItemExternalId?: string };

@Component({
  selector: 'app-order',
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    SharedMaterialModule,
    TranslatePipe,
    TranslatableEnumPipe,
    ListComponent,
    HasPermissionDirective,
    TextareaComponent,
    MatMenuModule,
  ],
  templateUrl: './order.component.html',
  styleUrl: './order.component.scss',
})
export class OrderComponent implements OnInit, AfterViewInit {
  @ViewChild('itemsTabs') public itemsTabs: MatTabGroup | undefined;
  public readonly tr = inject(TranslationsService);
  private loadingSpinnerService = inject(LoadingSpinnerService);
  private configData: Config | undefined;
  private initialFormValues: any;
  private navigationService = inject(NavigationService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private chatService = inject(ChatService);
  private notificationService = inject(NotificationService);
  private errorHandlingService = inject(ErrorHandlingService);
  protected orderActionsService = inject(OrderActionsService);
  private orderItemHandlingService = inject(OrderItemHandlingService);
  private configDataService = inject(ConfigDataService);
  protected filterService = inject(FilterService);
  private readonly userPermissionService: UserPermissionService = inject(UserPermissionService);
  private readonly moduleRegistry = inject(OrderItemModuleRegistry);
  protected readonly userPermissionsEnum = UserPermissionsEnum;
  private itemsSelectedTab: ITabInstanceData | undefined;

  protected tabs: ITabInstanceData[] = [
    { id: 0, name: TabsTypesEnum.ORDERED_ITEMS, label: this.tr.translate('lblOrderItems'), abbreviation: 'OrI', static: true },
    { id: 1, name: TabsTypesEnum.OFFERED_ITEMS, label: this.tr.translate('lblOfferedItems'), abbreviation: 'OfI', static: true },
  ];
  protected listType: ListTypesEnum = ListTypesEnum.ORDER_ITEMS;
  protected selectedTabIndex: number = 0;
  protected orderData: OrderResponse | undefined;
  private isFormChanged: WritableSignal<boolean> = signal<boolean>(false);
  protected isOrderControl = new FormControl<boolean>(true);
  protected listTypesEnum = ListTypesEnum;
  protected orderTypeEnum: typeof OrderType = OrderType;
  protected EnumNameList = EnumNameList;
  protected orderItemTableColumns: string[] = ['trainNumber', 'beginDate', 'endDate', 'operatingDays', 'action'];
  protected messageState = MessageState;
  protected orderObservable = inject(ActivatedRoute).data.pipe(map(data => data['order'])) as Observable<any>;
  protected itemsDataSource = signal<MatTableDataSource<OrderItemContent> | undefined>(undefined);
  protected externalItemId: string[] = [];
  protected actionVisibility: boolean = false;
  protected canEditOrderDetails: boolean = true;
  protected descriptionConfig: TextareaConfig = {
    label: this.tr.translate('lblDescription'),
    placeholder: this.tr.translate('lblDescription'),
    rows: 4,
  };

  /** Available order-item modules for the "Add" button/dropdown */
  protected availableModules = this.moduleRegistry.availableModules;

  /**
   * Determines if the offer deadline column should be visible.
   * Visible only on the offered items tab for STP orders.
   *
   * @returns {boolean}
   */
  private isOfferDeadlineColumnVisible = (): boolean => {
    return this.itemsSelectedTab?.name === TabsTypesEnum.OFFERED_ITEMS && this.orderData?.orderType === OrderType.STP;
  };

  /**
   * Determines if the delete action should be visible for the current order item.
   *
   * @param {OrderState} orderState - The current state of the order.
   * @returns {boolean}
   */
  // TODO: Refactor: The visibility checks (e.g. .some/.every on orderItems) are
  // currently evaluated at the order level. This should be refactored to per-row event-based
  // evaluation instead of checking the entire order's orderItems collection.
  private isDeleteActionVisible = (orderState: OrderState): boolean => {
    const currentOrder = this.orderActionsService.currentlySelectedOrderSig();
    const isReadonlyOrderState = this.orderActionsService.readonlyOrderStates.includes(orderState);
    const isIMViewingRUOrder = this.orderActionsService.isIMViewingRUOrder;
    const hasPermission = this.userPermissionService.checkPermissions(
      this.userPermissionService.getRequiredPermission(ActionNamesEnum.DELETE, ActionFrom.ORDERITEM),
    );
    return !(
      isReadonlyOrderState ||
      isIMViewingRUOrder ||
      (currentOrder.state === OrderState.DRAFT &&
        currentOrder.orderItems?.some(item => item.content.action === OrderItemAction.MODIFICATION)) ||
      !hasPermission
    );
  };

  /**
   * Determines if the edit action should be visible for the current order item.
   *
   * @param {OrderState} orderState - The current state of the order.
   * @returns {boolean}
   */
  private isEditActionVisible = (orderState: OrderState): boolean => {
    const isReadonlyOrderState = this.orderActionsService.readonlyOrderStates.includes(orderState);
    const isIMViewingRUOrder = this.orderActionsService.isIMViewingRUOrder;
    const hasPermission = this.userPermissionService.checkPermissions(
      this.userPermissionService.getRequiredPermission(ActionNamesEnum.EDIT, ActionFrom.ORDERITEM),
    );
    return !isReadonlyOrderState && !isIMViewingRUOrder && hasPermission;
  };

  /**
   * Determines if the view action should be visible for the current order item.
   *
   * @param {OrderState} orderState - The current state of the order.
   * @returns {boolean}
   */
  private isViewActionVisible = (orderState: OrderState): boolean => {
    const isReadonlyOrderState = this.orderActionsService.readonlyOrderStates.includes(orderState);
    const isIMViewingRUOrder = this.orderActionsService.isIMViewingRUOrder;
    return isReadonlyOrderState || isIMViewingRUOrder;
  };

  /**
   * Determines if the cancel/modify train run actions should be visible for the current order item.
   *
   * @param {OrderState} orderState - The current state of the order.
   * @returns {boolean}
   */
  // TODO: Refactor: This .some() check evaluates visibility at the order level.
  // It should be refactored to per-row event-based evaluation instead.
  private isCancelOrModifyTrainRunVisible = (orderState: OrderState): boolean => {
    const isIMViewingRUOrder = this.orderActionsService.isIMViewingRUOrder;
    const hasNonCancellationItem = this.orderData?.orderItems?.some(item => item.content?.action !== OrderItemAction.CANCELLATION) ?? false;
    const hasPermission = this.userPermissionService.checkPermissions(
      this.userPermissionService.getRequiredPermission(ActionNamesEnum.CANCEL_TRAIN_RUN, ActionFrom.ORDERITEM),
    );
    return (
      !isIMViewingRUOrder &&
      hasPermission &&
      orderState === OrderState.AGREED &&
      this.itemsSelectedTab?.name === TabsTypesEnum.OFFERED_ITEMS &&
      hasNonCancellationItem
    );
  };

  protected filteredOrderType: KeyValue<OrderType, string>[] = [];
  protected orderForm: FormGroup = new FormGroup({
    subject: new FormControl('', { nonNullable: true }),
    orderType: new FormControl<OrderType | null>(null),
    description: new FormControl('', { nonNullable: true }),
  });

  protected get descriptionControl(): FormControl {
    return this.orderForm.get('description') as FormControl;
  }

  protected displayOfferActionButton: WritableSignal<boolean> = signal(false);
  protected itemsColumns: ListViewColumns = [
    { columnDef: 'externalId', type: 'string', header: this.tr.translate('lblOrderItemId') },
    {
      columnDef: 'offerItemExternalId',
      type: 'string',
      header: this.tr.translate('lblOfferItemId'),
      columnVisibility: () => this.itemsSelectedTab?.name === TabsTypesEnum.OFFERED_ITEMS,
    },
    { columnDef: 'trainNumber', type: 'number', header: this.tr.translate('lblTrainNumber') },
    { columnDef: 'beginDate', type: 'beginOperatingDay', header: this.tr.translate('lblBeginDate') },
    { columnDef: 'trainType', type: 'trainType', header: this.tr.translate('lblTrainType') },
    { columnDef: 'lastModifiedDateTime', type: 'date', header: this.tr.translate('lblLastChanged') },
    {
      columnDef: 'offerDeadline',
      type: 'date',
      header: this.tr.translate('lblOfferDeadline'),
      showTimeStamp: true,
      columnVisibility: this.isOfferDeadlineColumnVisible,
    },
    {
      columnDef: 'itemActions',
      type: 'itemActions',
      header: this.tr.translate('lblActions'),
      actionsList: [
        {
          actionName: ActionNamesEnum.DELETE,
          actionIcon: 'delete',
          actionVisibility: this.actionVisibility,
          actionTooltip: this.tr.translate('lblDelete'),
        },
        {
          actionName: ActionNamesEnum.EDIT,
          actionIcon: 'edit',
          actionVisibility: this.actionVisibility,
          actionTooltip: this.tr.translate('lblEdit'),
        },
        {
          actionName: ActionNamesEnum.CANCEL_TRAIN_RUN,
          actionIcon: 'cancel',
          actionVisibility: this.actionVisibility,
          actionTooltip: this.tr.translate('lblCancelTrainRun'),
        },
        {
          actionName: ActionNamesEnum.MODIFY_TRAIN_RUN,
          actionIcon: 'edit',
          actionVisibility: this.actionVisibility,
          actionTooltip: this.tr.translate('lblModifyTrainRun'),
        },
        {
          actionName: ActionNamesEnum.VIEW,
          actionIcon: 'visibility',
          actionVisibility: true,
          actionTooltip: this.tr.translate('lblView'),
        },
      ],
    },
  ];

  constructor() {
    effect(() => {
      if (this.configDataService.configData) {
        this.configData = this.configDataService.configData;
        this.updateAddTrainRun();
      }
    });
  }

  public ngOnInit(): void {
    this.onRouteChange();

    // Save initial values and monitor form changes
    this.saveFormState();
    this.orderForm.valueChanges.subscribe(() => {
      this.isFormChanged.set(JSON.stringify(this.orderForm.value) !== JSON.stringify(this.initialFormValues));
    });
  }

  ngAfterViewInit(): void {
    if (this.itemsTabs) {
      this.setInitialTab(this.itemsTabs);
      // Only handle tab selection if we already have order data
      // Otherwise, it will be handled when the order data arrives
      if (this.orderData) {
        this.handleTabSelection();
      }
    }
  }

  /**
   * Sets the initial active tab for the items display based on the current order state
   * and whether it's a train run cancellation.
   *
   * If the order data's state is 'AGREED' and it's not a train run cancellation,
   * the method will set the second tab (index 1) as selected. Otherwise, it defaults
   * to the first tab (index 0).
   *
   * @private
   * @param itemsTabs The `MatTabGroup` instance representing the tab group for items.
   *                  This is used to programmatically set the selected tab index.
   * @returns {void}
   */
  private setInitialTab(itemsTabs: MatTabGroup): void {
    if (this.orderData?.state === OrderState.AGREED && !this.orderActionsService.isTrainRunCancellation) {
      this.itemsSelectedTab = this.tabs[1];
      itemsTabs.selectedIndex = 1;
    } else {
      this.itemsSelectedTab = this.tabs[0];
      itemsTabs.selectedIndex = 0;
    }
  }

  /**
   * returns `isFormChanged` signal as readonly
   *
   * @returns {Signal<boolean>}
   */
  get isUnsavedChanges(): Signal<boolean> {
    return this.isFormChanged.asReadonly();
  }

  /**
   * Handles route changes by subscribing to the order observable.
   * When an order response is received, it processes the response.
   *
   * @returns {void}
   */
  private onRouteChange(): void {
    this.orderObservable.subscribe((orderRes: OrderResponse) => {
      if (orderRes) {
        this.orderActionsService.currentlySelectedOrderSig.set(orderRes);
        this.processOrderResponse();
      }
    });
  }

  /**
   * Saves the current state of the form.
   *
   * This method captures the current values of the `orderForm` and stores them
   * in `initialFormValues`. It also sets the `isFormChanged` flag to `false` to
   * indicate that the form has not been modified since the last save.
   *
   * @returns {void}
   */
  private saveFormState(): void {
    this.initialFormValues = this.orderForm.value;
    this.isFormChanged.set(false);
  }

  /**
   * Updates item action button visibility based on order state and user permissions.
   *
   * @param {OrderState} orderState - The current state of the order.
   * @returns {void}
   */
  protected updateColumnsActionVisibility(orderState: OrderState): void {
    this.itemsColumns = this.itemsColumns.map(column => {
      if (column.columnDef === 'itemActions' && column.actionsList) {
        column.actionsList = column.actionsList.map(action => {
          switch (action.actionName) {
            case ActionNamesEnum.DELETE:
              action.actionVisibility = this.isDeleteActionVisible(orderState);
              break;
            case ActionNamesEnum.EDIT:
              action.actionVisibility = this.isEditActionVisible(orderState);
              break;
            case ActionNamesEnum.VIEW:
              action.actionVisibility = this.isViewActionVisible(orderState);
              break;
            case ActionNamesEnum.CANCEL_TRAIN_RUN:
            case ActionNamesEnum.MODIFY_TRAIN_RUN:
              action.actionVisibility = this.isCancelOrModifyTrainRunVisible(orderState);
              break;
            default:
              action.actionVisibility = false;
          }
          return action;
        });
      }
      return column;
    });
  }

  /**
   * Function to get Order Details
   *
   * @param {string | null} externalId
   * @returns {void}
   */
  protected getOrderDetails(externalId: string | null, isHandleOfferedItemsTab?: boolean): void {
    if (!externalId) {
      return;
    }
    this.orderActionsService.getOrderDetails(externalId).subscribe({
      next: () => {
        this.processOrderResponse();
        if (isHandleOfferedItemsTab) {
          this.handleOfferedItemsTab();
        }
      },
    });
  }

  /**
   * Processes the order response and updates the component's state accordingly.
   *
   * @returns {void}
   */
  private processOrderResponse(): void {
    this.orderData = this.orderActionsService.currentlySelectedOrderSig();
    if (!this.orderData) {
      return;
    }
    this.updateAddTrainRun();
    this.updateColumnsActionVisibility(this.orderData.state);
    if (this.itemsTabs && this.itemsSelectedTab) {
      this.setInitialTab(this.itemsTabs);
      this.handleTabSelection();
    }

    if (isFiniteNumber(this.orderData.orderType)) {
      this.orderForm.get('orderType')?.disable();
    }
    this.patchFormValue();
    this.saveFormState();
  }

  /**
   * Patches the form values with the current order data.
   *
   * This method checks if `orderData` is available. If it is, it updates the
   * `orderForm` with the `subject` and `orderType` from `orderData`.
   *
   * @private
   * @returns {void} This method does not return a value.
   */
  private patchFormValue(): void {
    if (!this.orderData) {
      return;
    }
    this.orderForm.patchValue({
      subject: this.orderData.subject,
      orderType: this.orderData.orderType,
      description: this.orderData.description || '',
    });
  }

  /**
   * To Cancel the current uncreated order and return back to orders page.
   *
   * @returns {void}
   */
  protected onCancel(): void {
    this.navigationService.navigateToList();
  }

  /**
   * Handles the form submission event.
   *
   * This method checks if the form's subject field has a value. If the form is being used to create a new order,
   * it calls `createDraftOrder` with the subject value. If the form is being used to edit an existing order,
   * it constructs an `Order` object with the subject value and calls `editOrderDetails`.
   *
   * @protected
   */
  protected onSubmit(): void {
    if (!this.orderForm.valid) {
      return;
    }
    this.isFormChanged.set(false);
    if (!this.route.snapshot.paramMap.get('externalId')) {
      this.createNewOrder();
    } else {
      this.editOrderDetails(this.orderForm.value);
    }
  }

  /**
   * Creates a draft order and navigates to the order details page upon success.
   *
   * @param {string} subject - The subject of the order.
   * @param {number} orderType - The type of the order, represented as a number.
   * @param {string} description - Optional description of the order.
   *
   * @returns An Observable that emits the order response.
   */
  protected createDraftOrder(subject: string, orderType: number, description?: string): Observable<OrderResponse> {
    return this.orderActionsService.createDraftOrder(subject, orderType, description).pipe(
      tap({
        next: (orderingRes: OrderResponse) => {
          this.navigationService.navigate(['/orders', orderingRes.externalId], {
            extras: { queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS } },
          });
        },
      }),
    );
  }

  /**
   * Creates a new order if the form is valid.
   *
   * This method checks if the `subject` field in the `orderForm` is valid.
   * If they are valid, it calls the `createDraftOrder` method with the `subject` value.
   *
   * @protected
   * @returns {void}
   */
  protected createNewOrder(): void {
    if (!this.orderForm.value.subject || !isValidEnumValue(this.orderForm.get('orderType')?.value)) {
      return;
    }

    this.createDraftOrder(
      this.orderForm.value.subject,
      Number(this.orderForm.get('orderType')?.value),
      this.orderForm.value.description,
    ).subscribe({
      next: () => this.notificationService.pushNotification(this.tr.translate('msgSuccessCreateDraftOrder'), SNACKBARCONFIG_SUCCESS),
    });
  }

  /**
   * Edits the details of an order.
   *
   * This method sends a request to update the order details using the provided `orderToEdit` object.
   * If the `orderData` does not have an `externalId`, the method returns early without making any changes.
   *
   * @param {order} orderToEdit - The order object containing the updated details to be saved.
   *
   * The method subscribes to the response of the `editOrderDetails` service call:
   * - On success, it saves the current form state and displays a success notification.
   * - On error, it displays an error notification.
   */
  private editOrderDetails(orderToEdit: Order): void {
    if (!this.orderData?.externalId) {
      console.error('editOrderDetails: externalId is undefined or null');
      return;
    }

    this.orderActionsService.editOrderDetails(this.orderData.externalId, orderToEdit)?.subscribe({
      next: () => {
        this.notificationService.pushNotification(this.tr.translate('msgSuccessUpdateOrder'), SNACKBARCONFIG_SUCCESS);
        if (this.orderData?.externalId) {
          this.getOrderDetails(this.orderData?.externalId);
        }
        return of({});
      },
      error: error => {
        this.errorHandlingService.handleError(error, OrderingApiName.EditOrderDetails);
      },
    });
  }

  /**
   * Navigates to the 'add order item' page for the current order.
   *
   * @remarks
   * This method constructs a URL using the current `externalOrderId` and navigates to the 'add order item' page.
   * Preserves the 'from' query param for breadcrumb navigation.
   * Passes the moduleId in router state for multi-module support.
   */
  public navigateToAddOrderItem(moduleId?: OrderItemType): void {
    if (!this.orderData?.externalId) {
      return;
    }
    const effectiveModuleId = moduleId ?? this.availableModules()[0]?.moduleId;
    this.navigationService.navigate(['/orders', this.orderData.externalId, 'order-items', 'add'], {
      extras: { state: { moduleId: effectiveModuleId } },
    });
  }

  /**
   * To cancel the order and return back to orders page.
   *
   * @returns {void}
   */
  protected cancelOrder(): void {
    this.openConfirmationDialog(this.tr.translate('msgCancelOrder')).subscribe(result => {
      if (result) {
        if (this.orderData?.externalId) {
          this.orderActionsService.cancelOrder(this.orderData.externalId).subscribe(() => {
            this.orderActionsService.showSuccessAndNavigateToList('msgSuccessCancelOrder');
          });
        }
      }
    });
  }

  /**
   * Opens a confirmation dialog with the specified message.
   *
   * @param {string} message - The message to display in the confirmation dialog.
   * @returns An Observable that emits a boolean value indicating whether the dialog was closed with a confirmation (true) or cancellation (false).
   */
  private openConfirmationDialog(message: string): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: { message: message },
    });
    return dialogRef.afterClosed();
  }

  /**
   * Deletes the current order after user confirmation.
   *
   * This method opens a confirmation dialog to ask the user if they really want to delete the order.
   * If the user confirms, it checks if the order has an external ID. If so, it shows a loading spinner,
   * calls the `deleteDraftOrder` method from `orderActionsService` to delete the order, and hides the spinner
   * once the operation is complete.
   *
   * On successful deletion, a success notification is shown and the user is navigated to the order list page.
   * If there is an error during deletion, an error notification is shown.
   *
   * @protected
   * @returns {void}
   */
  protected deleteOrder(): void {
    this.openConfirmationDialog(this.tr.translate('msgDelete')).subscribe(result => {
      if (result) {
        if (this.orderData?.externalId) {
          this.loadingSpinnerService.showSpinner();
          this.orderActionsService
            .deleteDraftOrder(this.orderData.externalId)
            .pipe(
              finalize(() => {
                this.loadingSpinnerService.hideSpinner();
              }),
            )
            .subscribe({
              next: () => {
                this.notificationService.pushNotification(this.tr.translate('msgSuccessDeleteDraftOrder'), SNACKBARCONFIG_SUCCESS);
                this.navigationService.navigateToList();
              },
            });
        }
      }
    });
  }

  /**
   * Copies the current order by creating a new draft order with a modified subject.
   * If the current order has items, they will be copied to the new order.
   *
   * The method performs the following steps:
   * 1. Checks if the order form has a subject. If not, it returns early.
   * 2. Creates a new subject for the copied order by appending a translated label to the current subject.
   * 4. Retrieves the items of the current order to be copied.
   * 5. Creates a new draft order with the new subject.
   * 6. If there are items to be copied, it copies them to the new order.
   * 7. Subscribes to the observable to handle success and error notifications.
   *
   * @returns {void}
   */
  protected copyOrder(): void {
    if (!this.orderForm.value.subject) {
      return;
    }

    const newCopySubject = this.tr.translate('lblcopy') + this.orderForm.value.subject;
    const neworderType = Number(this.orderForm.get('orderType')?.value);
    const newOrderDescription = this.orderForm.value.description;
    const orderItemsToBeCopied = this.orderData?.orderItems;

    this.createDraftOrder(newCopySubject, neworderType, newOrderDescription)
      .pipe(
        concatMap((newOrderResponse: OrderResponse) => {
          if (orderItemsToBeCopied) {
            return this.copyOrderItems(newOrderResponse.externalId, orderItemsToBeCopied);
          }
          return of(null);
        }),
      )
      .subscribe({
        next: () => {
          this.notificationService.pushNotification(this.tr.translate('msgSuccessCopyOrderItems'), SNACKBARCONFIG_SUCCESS);
        },
        error: () => {
          this.notificationService.pushNotification(this.tr.translate('msgErrorCopyOrderItems'), SNACKBARCONFIG_ERROR);
        },
      });
  }

  /**
   * Sends the current order to the next state.
   * @returns {void}
   */
  protected onSendOrder(): void {
    if (this.orderData?.orderItems?.some(item => this.orderItemHandlingService.getMissingFields(item.content.item).length > 0)) {
      this.notificationService.pushNotification(this.tr.translate('msgErrorSubmitOrder'), SNACKBARCONFIG_ERROR);
      this.orderItemHandlingService.triggerRowHighlight(); // Highlight incomplete/missing items
      return;
    }
    if (this.orderData?.externalId) {
      this.orderActionsService.submitOrder(this.orderData.externalId);
    }
  }

  /**
   * Copies the given order items to a new order.
   *
   * @param {string} newOrderId - The ID of the new order to which the items will be copied.
   * @param {OrderItemResponse[]} orderItems - An array of order items to be copied.
   * @returns An Observable that emits an array of arrays of OrderItemResponse objects,
   *          where each inner array corresponds to the result of creating an order item.
   */
  private copyOrderItems(newOrderId: string, orderItems: OrderItemResponse[]): Observable<OrderItemResponse[][]> {
    const copyItemObservables = orderItems.map(item => {
      const orderItemContent = {
        content: {
          type: OrderItemType.TRAIN_RUN,
          action: OrderItemAction.CREATION,
          item: item.content.item,
        },
      };
      return this.orderActionsService.createOrderItem(newOrderId, orderItemContent);
    });
    return forkJoin(copyItemObservables);
  }

  /**
   * Opens a message dialog if order data is available.
   *
   * This method checks if `orderData` is present. If it is, it uses the `chatService`
   * to open a message dialog with the provided `orderData`.
   *
   * @returns {void} This method does not return a value.
   */
  public openMessageDialog(): void {
    if (!this.orderData) {
      return;
    }
    this.chatService.checkMessagePermission(this.orderData.externalId).subscribe({
      next: () => {
        // User has permission, open the dialog
        const dialogRef = this.chatService.openMessageDialog(this.orderData!);
        dialogRef.afterClosed().subscribe(() => {
          if (this.orderData) {
            this.orderActionsService.getOrderDetails(this.orderData.externalId).subscribe({
              next: (updatedOrder: OrderResponse) => {
                if (this.orderData) {
                  this.orderData.messageState = updatedOrder.messageState;
                }
              },
            });
          }
        });
      },
      error: (error: HttpErrorResponse) => {
        // Permission check failed, don't open the dialog
        // Error is already handled by ErrorHandlingService through the Observable's error handling
        console.error('Permission check failed:', error);
      },
    });
  }

  /**
   * Get Lables from ChatService.
   * @param {string} action
   * @returns {void}
   */
  public getLabel(action: number): string {
    return this.chatService.getMessageTooltip(action);
  }
  /**
   * Get MatIcon from ChatService.
   * @param {string} action
   * @returns {void}
   */

  public getMatIcon(action: number): string {
    return this.chatService.getMatIcon(action);
  }

  /**
   * Updates the `canEditOrderDetails` property based on the current order state and configuration.
   *
   * This method checks if the order and configuration data are available and if the order state is set.
   * It determines if the order is in a read-only state by checking against the list of read-only states
   * from the `orderActionsService`. If a maximum number of order items per order is defined in the configuration,
   * it allows editing order details only if the current number of order items is less than the maximum and the order is not read-only.
   * If no maximum is defined, editing is allowed as long as the order is not read-only.
   *
   * @returns {void}
   */
  private updateAddTrainRun(): void {
    if (!this.configData) return;
    if (!this.orderData) return;
    if (this.orderData.state == null) return;
    const isReadonly = this.orderActionsService.readonlyOrderStates.includes(this.orderData.state);
    const isIMViewingRUOrder = this.orderActionsService.isIMViewingRUOrder;
    const maxItems = this.configData.maxNumberOfOrderItemsPerOrder;

    if (maxItems != null) {
      this.canEditOrderDetails = (this.orderData.orderItems?.length ?? 0) < maxItems && !isReadonly && !isIMViewingRUOrder;
    } else {
      this.canEditOrderDetails = !isReadonly && !isIMViewingRUOrder;
    }
  }

  /**
   * Determines if the order form should be rendered in a read-only state.
   *
   * The form is considered read-only if `orderData` is available and its current `state`
   * is included in the list of states defined as read-only by `orderActionsService.readonlyOrderStates`.
   * If `orderData` is not yet loaded or is null/undefined, the form is not considered read-only.
   *
   * @protected
   * @returns {boolean} `true` if the order form should be read-only; `false` otherwise.
   */
  protected get isOrderFormReadonly(): boolean {
    if (!this.orderData) {
      return false;
    }
    const isReadonlyState = this.orderActionsService.readonlyOrderStates.includes(this.orderData.state);
    const hasEditPermission = this.userPermissionService.checkPermissions(UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER);
    return isReadonlyState || !hasEditPermission || this.orderActionsService.isIMViewingRUOrder;
  }

  /**
   * Determines if the user has permission to confirm an offer for LTP orders.
   *
   * This method checks the user's permissions using the `userPermissionService`.
   * It returns `true` if the user has the `CAN_CONFIRM_OFFER_LTP` permission, and `false` otherwise.
   *
   * @protected
   * @returns {boolean} `true` if the user can confirm offers for LTP orders; `false` otherwise.
   */
  protected get canConfirmOfferLtp(): boolean {
    return this.userPermissionService.checkPermissions(UserPermissionsEnum.CAN_CONFIRM_OFFER_LTP);
  }

  /**
   * Determines if the "Confirm Offer" button should be visible based on the current order type and user permissions.
   *
   * The button is visible if:
   * - The offer action button should be displayed (as determined by `displayOfferActionButton()`).
   * - The order type is either STP or LTP, and the user has permission to confirm offers for LTP orders.
   *
   * @protected
   * @returns {boolean} `true` if the "Confirm Offer" button should be visible; `false` otherwise.
   */
  protected get isConfirmOfferButtonVisible(): boolean {
    return (
      this.displayOfferActionButton() &&
      (this.orderData?.orderType === OrderType.STP || (this.orderData?.orderType === OrderType.LTP && this.canConfirmOfferLtp))
    );
  }

  /**
   * Set the clicked tab active.
   * @param {MatTabChangeEvent} - The tab instance data.
   * @returns {void}
   */
  protected tabClicked($event: MatTabChangeEvent): void {
    this.itemsSelectedTab = this.tabs[$event.index];
    this.handleTabSelection();
  }

  /**
   * Refuses an offer for the current order item.
   *
   * This method checks if the `orderData` is available. If not, it exits early.
   * It retrieves the external ID of the order and calls the `refuseOfferItem` method
   * from the `orderActionsService` to refuse the offer for the specified item.
   * Upon successful refusal, it fetches the updated order details.
   *
   * @returns {void}
   */
  protected refuseOffer(): void {
    if (!this.orderData || this.externalItemId.length === 0) return;
    const orderExternalId = this.orderData.externalId;
    const refuseObservables = this.externalItemId.map(id => this.orderActionsService.refuseOfferItem(orderExternalId, id));
    forkJoin(refuseObservables).subscribe({
      next: () => this.getOrderDetails(orderExternalId, true),
    });
  }

  /**
   * Confirms an offer for the current order item.
   *
   * This method checks if the `orderData` is available, and if so, retrieves the external
   * order ID and confirms the offer for the first item in the `externalItemId` array.
   * Upon successful confirmation, it fetches the updated order details.
   *
   * @returns {void} This method does not return a value.
   */
  protected confirmOffer(): void {
    if (!this.orderData || this.externalItemId.length === 0) return;
    const orderExternalId = this.orderData.externalId;
    const confirmObservables = this.externalItemId.map(id => this.orderActionsService.confirmOfferItem(orderExternalId, id));
    forkJoin(confirmObservables).subscribe({
      next: () => this.getOrderDetails(orderExternalId, true),
    });
  }

  /**
   * Handles the selection of a tab and triggers the appropriate logic based on the selected tab's name.
   *
   * Depending on the tab selected, this method delegates the handling to specific methods:
   * - `handleOrderedItemsTab` for the `ORDERED_ITEMS` tab.
   * - `handleOfferedItemsTab` for the `OFFERED_ITEMS` tab.
   *
   * If the selected tab is not recognized, a warning is logged to the console.
   *
   * @returns {void}
   */
  private handleTabSelection(): void {
    switch (this.itemsSelectedTab?.name) {
      case TabsTypesEnum.ORDERED_ITEMS:
        this.handleOrderedItemsTab();
        break;
      case TabsTypesEnum.OFFERED_ITEMS:
        this.handleOfferedItemsTab();
        break;
      default:
        console.warn('Unknown tab selected');
    }
  }

  /**
   * Handles the logic for the "Ordered Items" tab in the order component.
   *
   * This method performs the following actions:
   * - Sets the data source for the items to the order items data source.
   * - Updates the list type to represent ordered items.
   * - Extracts and assigns the external IDs of the ordered items from the order data.
   * - Disables the display of the offer action button.
   *
   * @returns {void}
   */
  // TODO: Refactor: Order items are currently fetched from the order API response.
  // They should be fetched from the individual API endpoint (get all order items by order externalId).
  private handleOrderedItemsTab(): void {
    if (this.orderData) {
      const orderItems = this.orderData.orderItems ?? [];
      const items: OrderItemContentRow[] = orderItems.map(orderItem => ({
        ...orderItem.content.item,
        externalId: orderItem.externalId,
      }));
      this.itemsDataSource.set(new MatTableDataSource<OrderItemContentRow>(items));
      this.listType = ListTypesEnum.ORDER_ITEMS;
      this.externalItemId = orderItems.map(orderItem => orderItem.externalId);
      this.displayOfferActionButton.set(false);
      this.updateColumnsActionVisibility(this.orderData.state);
    }
  }

  /**
   * Handles the logic for the "Offered Items" tab in the order component.
   *
   * This method updates the data source for the items to display offered items,
   * sets the list type to `OFFER_ITEMS`, and extracts the external IDs of the
   * offered items from the order data. It also determines whether the "Offer Action"
   * button should be displayed based on the order state and the presence of external IDs.
   *
   *  @returns {void}
   */
  // TODO: Refactor: Offer items are currently fetched from the order API response.
  // They should be fetched from the individual API endpoint (get all offer items by order externalId).
  private handleOfferedItemsTab(): void {
    if (this.orderData && isFiniteNumber(this.orderData.state)) {
      const showOffer = this.orderActionsService.offerAvailableStates.includes(this.orderData.state);
      const items: OrderItemContentRow[] = showOffer
        ? (this.orderData.orderItems ?? []).flatMap(orderItem =>
            (orderItem.offerItems ?? []).map(offerItem => ({
              ...offerItem.content.item,
              offerDeadline: offerItem.offerDeadline,
              externalId: orderItem.externalId,
              offerItemExternalId: offerItem.externalId,
            })),
          )
        : [];

      this.itemsDataSource.set(new MatTableDataSource<OrderItemContentRow>(items));
      this.listType = ListTypesEnum.OFFER_ITEMS;
      this.externalItemId = items.map(item => item.offerItemExternalId ?? '');
      this.displayOfferActionButton.set(
        this.orderData.state !== undefined && this.orderActionsService.offeredItemActionStates.includes(this.orderData.state),
      );
      this.updateColumnsActionVisibility(this.orderData.state);
    }
  }

  protected get isCancellationOrderItem(): boolean {
    return this.orderData?.orderItems?.some(item => item.content?.action === OrderItemAction.CANCELLATION) ?? false;
  }

  /**
   * Determines whether to show the rejection reason card.
   * The rejection reason is only shown when the order is in REJECTED state.
   *
   * @returns {boolean} True if the rejection reason should be displayed
   */
  protected get showRejectionReason(): boolean {
    return this.orderData?.state === OrderState.REJECTED && !!this.orderData?.rejectionReason;
  }
}
