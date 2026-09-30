import { inject, Injectable } from '@angular/core';

import { OfferItemResponse, OrderItemContent, OrderItemResponse } from '@Ordering/api';

import { TranslationsService } from '@Ordering/core/services/translations.service';
import { OrderActionsService } from '@Ordering/shared/services/order-actions.service';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { ItemContextData } from '@Ordering/shared/models/item-operation-strategy.interface';
import { ItemContext } from '@Ordering/shared/models/component-slot.interface';
import { ItemRouteType } from '@Ordering/shared/models/order-item-module.interface';

/**
 * Parameters for building the ItemContext.
 */
export interface BuildContextParams {
  isCatalogView: boolean;
  isOfferItemView: boolean;
  isOrderItemView: boolean;
  hasOrderItemId: boolean;
}

/**
 * Parameters for building the base ItemContextData.
 */
export interface BuildContextDataParams {
  orderId: string;
  isCatalogView: boolean;
  routeParams: Record<string, string>;
  resolvedItem: OrderItemResponse | OfferItemResponse | OrderItemContent | null;
}

/**
 * Service responsible for constructing ItemContext and ItemContextData objects
 * used by strategies to determine behavior based on route/order state.
 *
 * Extracted from OrderItemHostComponent to reduce component complexity.
 */
@Injectable()
export class OrderItemContextBuilderService {
  private tr = inject(TranslationsService);
  private orderActionsService = inject(OrderActionsService);
  private userPermissionService = inject(UserPermissionService);

  /**
   * Constructs the ItemContext from route and order state.
   * @param {BuildContextParams} params - Route-derived parameters.
   * @returns {ItemContext} Context object passed to strategy methods.
   */
  public buildItemContext(params: BuildContextParams): ItemContext {
    const currentOrder = this.orderActionsService.currentlySelectedOrderSig();
    const isReadonlyState = this.orderActionsService.readonlyOrderStates.includes(currentOrder.state);
    const isIMViewingRUOrder = this.orderActionsService.isIMViewingRUOrder;
    const routeType = this.resolveRouteType(params);

    return {
      orderState: currentOrder.state,
      isReadonlyOrderState: isReadonlyState,
      isOfferItemView: params.isOfferItemView,
      isIMViewingRUOrder,
      isCatalogView: params.isCatalogView,
      userPermissions: this.userPermissionService,
      routeType,
      translate: (key: string) => this.tr.translate(key as any),
    };
  }

  /**
   * Builds a live context from the base context, incorporating real-time order state.
   * Catalog views have no live order context.
   * @param {ItemContext} baseContext - The initially built context.
   * @param {boolean} isCatalogView - Whether the view is a catalog view.
   * @returns {ItemContext} Context with live order state applied.
   */
  public buildLiveContext(baseContext: ItemContext, isCatalogView: boolean): ItemContext {
    if (isCatalogView) return baseContext;

    const currentOrder = this.orderActionsService.currentlySelectedOrderSig();
    return {
      ...baseContext,
      orderState: currentOrder.state,
      isReadonlyOrderState: this.orderActionsService.readonlyOrderStates.includes(currentOrder.state),
    };
  }

  /**
   * Builds the base ItemContextData with orderId, parentExternalId, and route params.
   * Module-specific and copy-flow data should be merged by the caller.
   * @param {BuildContextDataParams} params - Core parameters for context data.
   * @returns {ItemContextData} Base context data.
   */
  public buildItemContextData(params: BuildContextDataParams): ItemContextData {
    const contextData: ItemContextData = { orderId: params.orderId };

    if (params.resolvedItem && 'externalId' in params.resolvedItem) {
      contextData.parentExternalId = (params.resolvedItem as { externalId: string }).externalId;
    }

    if (params.isCatalogView) {
      contextData['routeParams'] = { ...params.routeParams };
    }

    return contextData;
  }

  /**
   * Determines the route type from route parameters.
   * @param {BuildContextParams} params - Route-derived parameters.
   * @returns {ItemRouteType} The resolved route type.
   */
  private resolveRouteType(params: BuildContextParams): ItemRouteType {
    if (params.isCatalogView) {
      return ItemRouteType.CATALOG;
    } else if (params.isOfferItemView) {
      return ItemRouteType.OFFER_ITEM;
    } else if (params.isOrderItemView && params.hasOrderItemId) {
      return ItemRouteType.ORDER_ITEM_EDIT;
    }
    return ItemRouteType.ORDER_ITEM_ADD;
  }
}
