import { SNACKBARCONFIG_SUCCESS } from '@Ordering/utils/snackbar';
import { Injectable, inject, signal, computed } from '@angular/core';

import {
  Order,
  OrderState,
  OrderingService,
  OrderItem,
  OrderItemResponse,
  OrderResponse,
  OfferItemResponse,
  OrderItemAction,
  OrderItemType,
  Source,
} from '@Ordering/api';

import { NotificationService } from '@Ordering/shared/services/notification.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { EMPTY, Observable, catchError, finalize, of, tap } from 'rxjs';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { NavigationService } from '@Ordering/shared/services/navigation.service';

// Success message key per order-item type; add a new entry when introducing a new OrderItemType.
const CREATE_ORDER_ITEM_SUCCESS_MESSAGE_KEYS: Record<OrderItemType, 'msgSuccessCreateTrainRun' | 'msgSuccessCreateRestriction'> = {
  [OrderItemType.TRAIN_RUN]: 'msgSuccessCreateTrainRun',
  [OrderItemType.RESTRICTION]: 'msgSuccessCreateRestriction',
};

@Injectable({
  providedIn: 'root',
})
export class OrderActionsService {
  private tr = inject(TranslationsService);
  readonly orderingService = inject(OrderingService);
  private notificationService = inject(NotificationService);
  private loadingSpinnerService = inject(LoadingSpinnerService);
  private errorHandlingService = inject(ErrorHandlingService); // Assuming this is the service for error handling
  private navigationService = inject(NavigationService);
  private configDataService = inject(ConfigDataService);
  protected externalId: string | undefined;
  public readonly readonlyOrderStates = [
    OrderState.AGREED,
    OrderState.CANCELLED,
    OrderState.OFFERED,
    OrderState.REFUSED,
    OrderState.REJECTED,
    OrderState.SUBMITTED,
  ];
  public readonly offerItemsVisibleStates = [
    OrderState.AGREED,
    OrderState.CANCELLED,
    OrderState.OFFERED,
    OrderState.REFUSED,
    OrderState.REJECTED,
  ];
  public currentlySelectedOrderSig = signal<OrderResponse>({} as OrderResponse);
  public contentTypeSig = computed<OrderItemType | undefined>(() => {
    const currentOrder = this.currentlySelectedOrderSig();
    return currentOrder?.orderItems?.[0]?.content?.type;
  });
  public contentActionSig = computed<OrderItemAction | undefined>(() => {
    const currentOrder = this.currentlySelectedOrderSig();
    return currentOrder?.orderItems?.[0]?.content?.action;
  });
  public orderDeletableStates = [OrderState.DRAFT];
  public orderCancelableStates = [OrderState.SUBMITTED, OrderState.OFFERED, OrderState.REFUSED];
  public orderSendStates = [OrderState.DRAFT];
  public offeredItemActionStates = [OrderState.OFFERED];
  public offerAvailableStates = [OrderState.AGREED, OrderState.CANCELLED, OrderState.OFFERED, OrderState.REFUSED, OrderState.REJECTED];

  public get isTrainRunCancellation(): boolean {
    const content = this.currentlySelectedOrderSig()?.orderItems?.[0]?.content;
    return content?.type === OrderItemType.TRAIN_RUN && content?.action === OrderItemAction.CANCELLATION;
  }

  /**
   * Checks if the current user is an IM user viewing an order created by an RU user.
   * This getter provides centralized access control logic for IM/RU order interactions.
   * @returns {boolean} True if IM user is viewing RU-created order, false otherwise
   */
  public get isIMViewingRUOrder(): boolean {
    const currentOrder = this.currentlySelectedOrderSig();
    if (!currentOrder || !currentOrder.externalId) {
      return false;
    }
    return this.configDataService.isInfrastructureManagerUser() && currentOrder.orderOrigin === Source.RAILWAY_UNDERTAKING_WEB_PORTAL;
  }

  /**
   * Delete a draft order.
   * @param {string | undefined} externalOrderId
   * @returns {void}
   */
  public deleteDraftOrder(externalOrderId: string | undefined): Observable<null> {
    if (!externalOrderId) {
      return of(null);
    }
    return this.orderingService.deleteOrder(externalOrderId).pipe(
      catchError(err => {
        this.errorHandlingService.handleError(err, OrderingApiName.DeleteOrder);
        return EMPTY;
      }),
    );
  }

  /**
   * Cancel an order. Handles spinner and errors internally.
   * Returns an Observable so callers can react to success (e.g. navigate away or reload a list).
   * @param {string} externalOrderId
   * @returns {Observable<object>}
   */
  public cancelOrder(externalOrderId: string): Observable<object> {
    this.loadingSpinnerService.showSpinner();
    return this.orderingService.cancelOrder(externalOrderId).pipe(
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.CancelOrder);
        return EMPTY;
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Show the success message and navigate to the orders page.
   * @param {string} message
   * @returns {void}
   */
  public showSuccessAndNavigateToList(message: 'msgSuccessDeleteDraftOrder' | 'msgSuccessCancelOrder' | 'msgSuccessSubmitOrder'): void {
    this.notificationService.pushNotification(this.tr.translate(message), SNACKBARCONFIG_SUCCESS);
    this.navigationService.navigateToList();
  }

  /**
   * Creates a draft order with the given subject.
   *
   * This method shows a loading spinner while the order is being created.
   * If the order creation is successful, the response is returned.
   * If there is an error during the creation process, a notification is pushed
   * and an empty array is returned.
   * The loading spinner is hidden once the process is finalized.
   *
   * @param {string} subject - The subject of the draft order.
   * @param {number} orderType - The type of the order (e.g., 1 for standard orders).
   * @param {string} description - Optional description for the order.
   *
   * @returns An Observable of OrderResponse.
   */
  public createDraftOrder(subject: string, orderType: number, description?: string): Observable<OrderResponse> {
    this.loadingSpinnerService.showSpinner();
    const order: Order = {
      subject: subject,
      orderType: orderType,
      ...(description && { description: description }),
    };
    return this.orderingService.createDraftOrder(order).pipe(
      tap((orderingRes: OrderResponse) => {
        return orderingRes;
      }),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.CreateDraftOrder);
        return EMPTY;
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Submits an order with the given external order ID.
   *
   * This method shows a loading spinner while the order is being submitted.
   * If the submission is successful, a success message is shown and the user is navigated to the orders page.
   * If an error occurs, an error message is shown.
   * The loading spinner is hidden once the operation is finalized.
   *
   * @param {string} externalOrderId
   * @returns {void}
   */
  public submitOrder(externalOrderId: string): void {
    if (!externalOrderId) {
      return;
    }
    this.loadingSpinnerService.showSpinner();
    this.orderingService
      .submitOrder(externalOrderId)
      .pipe(
        tap(() => {
          this.showSuccessAndNavigateToList('msgSuccessSubmitOrder');
        }),
        catchError(error => {
          this.errorHandlingService.handleError(error, OrderingApiName.SubmitOrder);
          return of(null);
        }),
        finalize(() => this.loadingSpinnerService.hideSpinner()),
      )
      .subscribe();
  }

  /**
   * Retrieves the details of an order based on the provided external order ID.
   *
   * @param {string} externalOrderId - The ID of the external order to retrieve details for.
   * @returns {Observable<OrderResponse>} An Observable that emits the order details as an OrderResponse.
   *
   * @remarks
   * This method shows a loading spinner while the order details are being fetched.
   * If an error occurs during the retrieval, a notification is pushed to the user
   * and an empty OrderResponse is returned.
   * The loading spinner is hidden once the operation is finalized.
   */
  public getOrderDetails(externalOrderId: string): Observable<OrderResponse> {
    this.loadingSpinnerService.showSpinner();
    return this.orderingService.getOrder(externalOrderId).pipe(
      tap((orderingRes: OrderResponse) => {
        this.currentlySelectedOrderSig.set(orderingRes);
      }),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetOrderDetails);
        return EMPTY;
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Edits the details of an existing order.
   *
   * This method shows a loading spinner, sends the updated order details to the server,
   * and handles the response. If the update is successful, it returns an observable of
   * the updated order response. If there is an error, it pushes a notification and returns
   * an observable with a null value. The loading spinner is hidden once the operation is complete.
   *
   * @param {string} externalOrderId - The ID of the external order to be edited.
   * @param {Order} orderToEdit - The order object containing the updated details.
   * @returns {Observable<OrderResponse>} An observable of the order response.
   */
  public editOrderDetails(externalOrderId: string, orderToEdit: Order): Observable<OrderResponse> {
    this.loadingSpinnerService.showSpinner();
    return this.orderingService.setOrder(externalOrderId, orderToEdit)?.pipe(
      tap(() => {
        return of({});
      }),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.EditOrderDetails);
        return of(null);
      }),
      finalize(() => {
        this.loadingSpinnerService.hideSpinner();
      }),
    );
  }

  /**
   * Creates an order item for a given external order ID.
   *
   * @param externalOrderId - The ID of the external order.
   * @param orderItem - The order item to be created.
   * @returns An Observable that emits an array of OrderItemResponse objects.
   *
   * @remarks
   * This method shows a loading spinner while the order item is being created.
   * If the creation is successful, the response is returned.
   * If an error occurs, a notification is pushed and an empty array is returned.
   * The loading spinner is hidden once the operation is finalized.
   */
  public createOrderItem(externalOrderId: string, orderItem: OrderItem): Observable<OrderItemResponse[]> {
    this.loadingSpinnerService.showSpinner();
    const successMessageKey = CREATE_ORDER_ITEM_SUCCESS_MESSAGE_KEYS[orderItem.content?.type];
    return this.orderingService.createOrderItem(externalOrderId, orderItem).pipe(
      tap((response: OrderItemResponse[]) => {
        this.notificationService.pushNotification(this.tr.translate(successMessageKey), SNACKBARCONFIG_SUCCESS);
        return response;
      }),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.CreateTrainRun);
        return EMPTY;
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Retrieves the details of an order item based on the provided external order ID and order item ID.
   * This method shows a loading spinner while fetching the order item details.
   * If the retrieval is successful, it returns an observable of the order item response.
   * If an error occurs, it pushes a notification with an error message and returns an empty OrderItemResponse.
   * The loading spinner is hidden once the operation is finalized.
   * @param {string} externalOrderId - The ID of the external order.
   * @param {string} orderItemId - The ID of the order item to retrieve.
   * @return {Observable<OrderItemResponse>} An observable that emits the order item details.
   */
  public getOrderItemDetails(externalOrderId: string, orderItemId: string): Observable<OrderItemResponse> {
    this.loadingSpinnerService.showSpinner();
    return this.orderingService.getOrderItem(externalOrderId, orderItemId).pipe(
      tap((response: OrderItemResponse) => {
        return response;
      }),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetOrderItemDetails);
        return of({} as OrderItemResponse);
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Retrieves the details of an offer item based on the provided external order ID and offer item ID.
   * This method shows a loading spinner while fetching the offer item details.
   * If the retrieval is successful, it returns an observable of the offer item response.
   * If an error occurs, it pushes a notification with an error message and returns an empty OfferItemResponse.
   * The loading spinner is hidden once the operation is finalized.
   * @param {string} externalOrderId - The ID of the external order.
   * @param {string} offerItemId - The ID of the offer item to retrieve.
   * @return {Observable<OfferItemResponse>} An observable that emits the offer item details.
   */
  public getOfferItemDetails(externalOrderId: string, offerItemId: string): Observable<OfferItemResponse> {
    this.loadingSpinnerService.showSpinner();
    return this.orderingService.getOfferItem(externalOrderId, offerItemId).pipe(
      tap((response: OfferItemResponse) => {
        return response;
      }),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetOfferItemDetails);
        return of({} as OfferItemResponse);
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Updates an existing order item inside a draft order.
   *
   */
  public editOrderItem(externalOrderId: string, orderItemId: string, orderItem: OrderItem): Observable<OrderItemResponse[]> {
    this.loadingSpinnerService.showSpinner();
    return this.orderingService.setOrderItem(externalOrderId, orderItemId, orderItem).pipe(
      tap((response: OrderItemResponse[]) => {
        this.notificationService.pushNotification(this.tr.translate('msgSuccessUpdateOrderItem'), SNACKBARCONFIG_SUCCESS);
        return response;
      }),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.EditOrderItem);
        return [];
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  public confirmOfferItem(externalOrderId: string, externalOfferItemId: string): Observable<any> {
    return this.handleOfferItemAction(
      externalOrderId,
      externalOfferItemId,
      'confirmOfferItem',
      'msgSuccessConfirmOfferItem',
      OrderingApiName.ConfirmOffer,
    ).pipe(
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.ConfirmOffer);
        return [];
      }),
    );
  }

  public refuseOfferItem(externalOrderId: string, externalOfferItemId: string): Observable<any> {
    return this.handleOfferItemAction(
      externalOrderId,
      externalOfferItemId,
      'refuseOfferItem',
      'msgSuccessRefuseOfferItem',
      OrderingApiName.RefuseOffer,
    ).pipe(
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.RefuseOffer);
        return [];
      }),
    );
  }

  private handleOfferItemAction(
    externalOrderId: string,
    externalOfferItemId: string,
    action: 'confirmOfferItem' | 'refuseOfferItem',
    successMessage: 'msgSuccessConfirmOfferItem' | 'msgSuccessRefuseOfferItem',
    errorEnum: OrderingApiName.ConfirmOffer | OrderingApiName.RefuseOffer,
  ): Observable<any> {
    this.loadingSpinnerService.showSpinner();
    return this.orderingService[action](externalOrderId, externalOfferItemId).pipe(
      tap((response: any) => {
        this.notificationService.pushNotification(this.tr.translate(successMessage), SNACKBARCONFIG_SUCCESS);
        return response;
      }),
      catchError(error => {
        this.errorHandlingService.handleError(error, errorEnum);
        return [];
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }
}
