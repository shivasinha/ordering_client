import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { OfferItemResponse, Order, OrderItemResponse, OrderingService, ScheduleService, TrainRun } from '@Ordering/api';
import { EMPTY, catchError, map } from 'rxjs';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';

export const orderResolver: ResolveFn<Order | undefined> = route => {
  const orderId = route.params['externalId'] ?? '0';
  const errorHandlingService = inject(ErrorHandlingService);

  return inject(OrderingService)
    .getOrder(orderId)
    .pipe(
      map(response => response as Order),
      catchError(error => {
        errorHandlingService.handleError(error, OrderingApiName.GetOrderDetails);
        return EMPTY;
      }),
    );
};

export const orderItemResolver: ResolveFn<OrderItemResponse | undefined> = route => {
  const orderId = route.params['order-id'] ?? '0';
  const orderItemId = route.params['order-item-id'] ?? '0';
  const errorHandlingService = inject(ErrorHandlingService);

  return inject(OrderingService)
    .getOrderItem(orderId, orderItemId)
    .pipe(
      map(response => response),
      catchError(error => {
        errorHandlingService.handleError(error, OrderingApiName.GetOrderItemDetails);
        return EMPTY;
      }),
    );
};

export const offerItemResolver: ResolveFn<OfferItemResponse | undefined> = route => {
  const orderId = route.params['order-id'] ?? '0';
  const offerItemId = route.params['offer-item-id'] ?? '0';
  const errorHandlingService = inject(ErrorHandlingService);

  return inject(OrderingService)
    .getOfferItem(orderId, offerItemId)
    .pipe(
      map(response => response),
      catchError(error => {
        errorHandlingService.handleError(error, OrderingApiName.GetOfferItemDetails);
        return EMPTY;
      }),
    );
};

/**
 * Resolves a `TrainRun` object based on the provided route parameters.
 *
 * This resolver extracts the `trainId` and `schedVersionId` from the route parameters,
 * then uses the `ScheduleService` to fetch the corresponding train run data.
 * If an error occurs during the fetch, it is handled by the `ErrorHandlingService`
 * and an empty observable is returned.
 *
 * @param route - The activated route snapshot containing route parameters.
 * @returns An observable emitting the `TrainRun` object or `undefined` if an error occurs.
 */
export const trainRunResolver: ResolveFn<TrainRun | undefined> = route => {
  const trainId = route.params['trainId'] ?? '0';
  const schedVersionId = route.params['schedVersionId'] ?? '0';
  const errorHandlingService = inject(ErrorHandlingService);
  return inject(ScheduleService)
    .getTrainRun(trainId, schedVersionId)
    .pipe(
      map(response => response),
      catchError(error => {
        errorHandlingService.handleError(error, OrderingApiName.GetTrainRun);
        return EMPTY;
      }),
    );
};
