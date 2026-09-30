import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import dayjs from 'dayjs';

import {
  OrderItemAction,
  OrderItemType,
  OrderingService,
  TrainRunCancellation,
  TrainRunListItem,
  TrainRun,
  OrderResponse,
  OrderItem,
} from '@Ordering/api';
import { SNACKBARCONFIG_ERROR, SNACKBARCONFIG_SUCCESS } from '@Ordering/utils/snackbar';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { ScheduleActionService } from '@Ordering/shared/services/schedule-action.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { DateTimeFormat } from '@Ordering/utils/dates';
import { ActionDialogData } from '@Ordering/data/custom/action-dialog-data.interface';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { SOURCE_TAB_PARAM } from '@Ordering/shared/services/breadcrumb.service';

enum ERROR_IDS {
  ORDER_REJECTED = 'order-rejected',
}
@Injectable({
  providedIn: 'root',
})
export class ListActionsService {
  readonly orderingService = inject(OrderingService);
  private tr = inject(TranslationsService);
  private notificationService = inject(NotificationService);
  private loadingSpinnerService = inject(LoadingSpinnerService);
  private orderActionsService = inject(OrderActionsService);
  private scheduleService = inject(ScheduleActionService);
  private errorHandlingService = inject(ErrorHandlingService);
  private navigationService = inject(NavigationService);
  private trainRunSignal = signal<TrainRun | undefined>(undefined);
  private trainRunNumberSignal = signal<string | undefined>(undefined);

  /**
   * Sets the current train run.
   *
   * @param trainRun - The TrainRun object to set.
   */
  set trainRun(trainRun: TrainRun) {
    this.trainRunSignal.set(trainRun);
  }

  /**
   * Gets the current train run.
   *
   * @returns {TrainRun | undefined} The current train run if available, otherwise undefined.
   */
  get trainRun(): TrainRun | undefined {
    return this.trainRunSignal();
  }

  /**
   * Clears the current train run signal by setting it to undefined.
   * This method is used to reset or clear the state of the train run signal.
   */
  public clearTrainRun(): void {
    this.trainRunSignal.set(undefined);
  }

  /**
   * Sets the current train run number.
   *
   * @param trainRunNumber - The train number to set.
   */
  set trainRunNumber(trainRunNumber: string) {
    this.trainRunNumberSignal.set(trainRunNumber);
  }

  /**
   * Gets the train run number.
   *
   * @returns {string | undefined} The train run number, or undefined if not available.
   */
  get trainRunNumber(): string | undefined {
    return this.trainRunNumberSignal();
  }

  /**
   * Clears the train run number by setting it to undefined.
   * This method updates the trainRunNumberSignal to indicate that
   * there is no current train run number.
   */
  public clearTrainRunNumber(): void {
    this.trainRunNumberSignal.set(undefined);
  }

  /**
   * Perform the deletion of the order item
   * @param {string} orderId - The ID of the order
   * @param {string} orderItemId - The ID of the order item to be deleted
   * @returns {void}
   */
  public deleteOrderItem(orderId: string, orderItemId: string): Observable<any> {
    if (!orderId || !orderItemId) {
      return of(null);
    }
    return this.orderingService.deleteOrderItem(orderId, orderItemId);
  }
  /**
   * Copies a train run and creates a draft order.
   *
   * This method:
   * - Creates a draft order with the given subject and order type.
   * - Retrieves the existing train run data and assigns a new train number.
   * - Creates a new order item of type TRAIN_RUN_CREATION using the updated train run.
   * - Navigates to the created order item's details page.
   *
   * @param data - The original train run list item to be copied.
   * @param subject - The subject/title for the new draft order.
   * @param orderType - The type identifier for the order being created.
   * @param newTrainRunNumber - The new train number to assign to the copied train run.
   */
  public copyTrainRun(data: TrainRunListItem, subject: string, orderType: number, newTrainRunNumber: string): void {
    this.orderActionsService
      .createDraftOrder(subject, orderType)
      .pipe(
        switchMap(orderRes =>
          this.scheduleService.getTrainRun(data).pipe(
            switchMap(trainRun => {
              trainRun.trainNumber = newTrainRunNumber;
              const orderItemContent = {
                content: {
                  type: OrderItemType.TRAIN_RUN,
                  action: OrderItemAction.CREATION,
                  item: trainRun as TrainRun,
                },
              };
              return this.orderActionsService.createOrderItem(orderRes.externalId, orderItemContent).pipe(
                switchMap(() => this.orderActionsService.getOrderDetails(orderRes.externalId)),
                tap(details => {
                  const item = details.orderItems?.[0];
                  if (item) {
                    this.navigationService.navigate(['/orders', orderRes.externalId, 'order-items', item.externalId], {
                      extras: { queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS } },
                    });
                  }
                }),
              );
            }),
          ),
        ),
      )
      .subscribe();
  }

  /**
   * Creates a new order from a train run (e.g., spare capacity).
   *
   * This method:
   * - Creates a draft order with the given subject, order type, and optional description.
   * - Creates an order item of type TRAIN_RUN_CREATION with the provided train run.
   * - Navigates to the created order item's details page.
   *
   * @param {TrainRun} trainRun - The train run object to create an order from.
   * @param {string} subject - The subject/title for the new draft order.
   * @param {number} orderType - The type identifier for the order being created.
   * @param {string} description - Optional description for the order.
   */
  public createOrderFromTrainRun(trainRun: TrainRun, subject: string, orderType: number, description?: string): void {
    this.loadingSpinnerService.showSpinner();

    this.orderingService
      .createDraftOrder({ subject, orderType, description })
      .pipe(
        switchMap(order => {
          const orderItemContent = {
            content: {
              type: OrderItemType.TRAIN_RUN,
              action: OrderItemAction.CREATION,
              item: trainRun,
            },
          };
          return this.orderingService.createOrderItem(order.externalId, orderItemContent as OrderItem).pipe(
            map(orderItem => ({ order, orderItem })),
            catchError(error => {
              this.orderingService.deleteOrder(order.externalId).subscribe();
              this.errorHandlingService.handleError(error, OrderingApiName.CreateTrainRun);
              return EMPTY;
            }),
          );
        }),
        catchError(error => {
          this.errorHandlingService.handleError(error, OrderingApiName.CreateDraftOrder);
          return EMPTY;
        }),
        finalize(() => this.loadingSpinnerService.hideSpinner()),
      )
      .subscribe({
        next: ({ order, orderItem }) => {
          this.orderActionsService.currentlySelectedOrderSig.set(order);
          this.notificationService.pushNotification(this.tr.translate('msgSuccessCreateDraftOrder'), SNACKBARCONFIG_SUCCESS);
          this.navigationService.navigate(['/orders', order.externalId, 'order-items', (orderItem as any).externalId], {
            extras: { queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS } },
          });
        },
      });
  }

  /**
   * Cancels a train run by creating a draft order, adding a train run cancellation item,
   * and submitting the order. Shows loading spinner during the process and handles
   * success/error notifications with appropriate navigation.
   *
   * @param {string} subject - The subject/title for the order
   * @param {number} orderType - The type of order to create
   * @param {TrainRunCancellation} trainRunCancellationData - The cancellation data for the train run
   *
   * @returns {Observable<void>} Observable that emits once on success (after notification and navigation),
   *          or completes empty on any error (errors are handled internally via ErrorHandlingService).
   *          The caller is responsible for subscribing. On `next`, the cancellation succeeded.
   */
  public cancelTrainRun(subject: string, orderType: number, trainRunCancellationData: TrainRunCancellation): Observable<void> {
    this.loadingSpinnerService.showSpinner();

    // Ensure beginDate remains as string and doesn't get converted to Date object
    const normalizedCancellationData: TrainRunCancellation = {
      ...trainRunCancellationData,
      cancellationDays: trainRunCancellationData.cancellationDays.map(daySet => ({
        ...daySet,
        beginDate: typeof daySet.beginDate === 'string' ? daySet.beginDate : dayjs(daySet.beginDate).format(DateTimeFormat.API_DATE_FORMAT),
      })),
    };

    return this.orderingService.createDraftOrder({ subject, orderType }).pipe(
      switchMap(order => {
        const orderItemContent = {
          content: {
            type: OrderItemType.TRAIN_RUN,
            action: OrderItemAction.CANCELLATION,
            item: normalizedCancellationData,
          },
        };
        return this.orderingService.createOrderItem(order.externalId, orderItemContent).pipe(
          map(() => order.externalId),
          catchError(error => {
            this.orderingService.deleteOrder(order.externalId).subscribe();
            this.errorHandlingService.handleError(error, OrderingApiName.CreateCancelTrainRun);
            return EMPTY;
          }),
        );
      }),
      switchMap(externalOrderId => {
        // Submit the order after successful association
        return this.orderingService.submitOrder(externalOrderId).pipe(
          tap(() => {
            this.notificationService.pushNotification(this.tr.translate('msgSuccessTrainRunCancellation'), SNACKBARCONFIG_SUCCESS);
          }),
          catchError(error => {
            // Still navigate to the order even if submission fails
            // If the error is thrown intentionally i.e. for order rejection, do not delete the order.
            const excludedErrors = [ERROR_IDS.ORDER_REJECTED];
            if (!excludedErrors.includes(error.error.id)) {
              this.orderingService.deleteOrder(externalOrderId).subscribe();
            }
            this.errorHandlingService.handleError(error, OrderingApiName.SubmitDraftOrderCancelTrainRun);
            return EMPTY;
          }),
        );
      }),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.CreateDraftOrderCancelTrainRun);
        return EMPTY;
      }),
      map(() => void 0),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }
  /*
   * Modifies a train run by creating a draft order and associating it with the provided train run data.
   * This method performs the following operations:
   * 1. Shows a loading spinner
   * 2. Creates a draft order using the provided subject and order type
   * 3. Associates the train run data with the created order using its external ID
   * 4. Handles errors by hiding the spinner and showing error notifications
   *
   * @param {string} subject - The subject/title for the order
   * @param {number} orderType - The type of order to create (numeric identifier)
   * @param {TrainRun} trainRunData - The train run data to be associated with the created order
   *
   * @returns {void}
   */
  public modifyTrainRun(subject: string, orderType: number, dialogData: ActionDialogData): void {
    this.loadingSpinnerService.showSpinner();
    // First create the order
    this.orderingService.createDraftOrder({ subject, orderType }).subscribe({
      next: order => {
        // Fetch the train run from backend and associate with the order
        this.associateTrainRun(order, dialogData);
      },
      error: error => {
        this.loadingSpinnerService.hideSpinner();
        this.errorHandlingService.handleError(error, OrderingApiName.CreateDraftOrderPathModification);
        console.error('Error creating order:', error);
      },
    });
  }

  /**
   * Associates a train run with an existing order by creating a new order item.
   *
   * This method creates an order item of type TRAIN_RUN_CREATION and handles the async operation
   * with loading spinner management, success/error notifications, and navigation on success.
   *
   * @param {string} externalOrderId - The unique identifier of the order to associate the train run with
   * @param {TrainRun} trainRunData - The train run data to be associated with the order
   *
   * @returns {void}
   */
  private associateTrainRun(newOrder: OrderResponse, dialogData: ActionDialogData): void {
    // Only use parentExternalId when modifying from archived orders (dialogData.orderData exists)
    // For trains list modifications, there is no parent order
    const parentExternalId = dialogData.orderData?.externalId;
    const trainRun$ = dialogData.trainRunData
      ? of(dialogData.trainRunData).pipe(
          tap(trainRun => {
            const modifiedOrder = {
              ...newOrder,
              orderItems: [
                { content: { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.REPLACEMENT, item: trainRun }, externalId: '' },
              ],
            };
            this.orderActionsService.currentlySelectedOrderSig.set(modifiedOrder);
          }),
        )
      : this.orderingService.getOrder(dialogData?.orderData?.externalId ? dialogData.orderData.externalId : '').pipe(
          map(order => {
            this.orderActionsService.currentlySelectedOrderSig.set({ ...newOrder, orderItems: order.orderItems });
            // Extract trainRunData from the order object as needed
            return order.orderItems?.[0]?.offerItems?.[0]?.content?.item; // Adjust this line based on actual structure
          }),
        );

    trainRun$
      .pipe(
        switchMap(trainRun => {
          const orderItemContent = {
            content: {
              type: OrderItemType.TRAIN_RUN,
              action: OrderItemAction.REPLACEMENT,
              item: { ...trainRun, parentExternalId },
            },
          };
          return this.orderingService.createOrderItem(newOrder.externalId, orderItemContent as OrderItem).pipe(
            catchError(error => {
              this.orderingService.deleteOrder(newOrder.externalId).subscribe();
              this.errorHandlingService.handleError(error, OrderingApiName.CreateCancelPathModification);
              return EMPTY;
            }),
            finalize(() => this.loadingSpinnerService.hideSpinner()),
          );
        }),
      )
      .subscribe({
        next: orderItem => {
          this.loadingSpinnerService.hideSpinner();
          this.notificationService.pushNotification(this.tr.translate('msgTrainRunModifiedSuccessfully'), SNACKBARCONFIG_SUCCESS);
          this.navigationService.navigate(['/orders', newOrder.externalId, 'order-items', (orderItem as any).externalId], {
            extras: { queryParams: { [SOURCE_TAB_PARAM]: TabsTypesEnum.CURRENT_ORDERS } },
          });
        },
        error: error => {
          this.loadingSpinnerService.hideSpinner();
          this.notificationService.pushNotification(this.tr.translate('msgErrorModifyingTrainRun'), SNACKBARCONFIG_ERROR);
          console.error('Error associating train run:', error);
        },
      });
  }
}
