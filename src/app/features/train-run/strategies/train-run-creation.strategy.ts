import { Injectable } from '@angular/core';
import { OrderContent, OrderItemContent, OrderItemAction, OrderItemType, TrainRun } from '@Ordering/api';
import {
  ComponentSlot,
  ItemContext,
  SlotDisplayMode,
  TitleConfig,
  ValidationResult,
} from '@Ordering/shared/models/component-slot.interface';
import { ItemContextData, ItemOperationStrategy } from '@Ordering/shared/models/item-operation-strategy.interface';
import { ItemRouteType } from '@Ordering/shared/models/order-item-module.interface';

import {
  TrainHeaderData,
  ContributorKey,
  resolveTrainRunEditMode,
  validateTrainRunStops,
  buildTrainRunBasePayload,
  extractTrainRunInitialData,
  buildTrainRunTitleConfig,
  buildTrainRunSlots,
  isOperatingDaysVisible,
} from './train-run-strategy.utils';

/**
 * Strategy for creating a new train run within an order.
 * Enables the conditional-train toggle and validates first-stop data before save.
 */
@Injectable()
export class TrainRunCreationStrategy implements ItemOperationStrategy {
  readonly operationType = OrderItemAction.CREATION;
  readonly moduleId = OrderItemType.TRAIN_RUN;

  /** @returns {ComponentSlot[]} Header with conditional toggle, conditional OD visibility, and stops. */
  public getComponentSlots(): ComponentSlot[] {
    return buildTrainRunSlots({
      headerInputs: () => ({ showConditionalToggle: true }),
      operatingDaysVisible: isOperatingDaysVisible,
    });
  }

  /**
   * Returns 'lblOfferedTrainRun' for offer views, 'lblRequestTrainRun' otherwise.
   * @param {OrderItemContent | null} item - The resolved train run item.
   * @param {ItemContext} context - Current view context.
   * @returns {TitleConfig} Title configuration for the host.
   */
  public getTitleConfig(item: OrderItemContent | null, context: ItemContext): TitleConfig {
    const translationKey = context.routeType === ItemRouteType.OFFER_ITEM ? 'lblOfferedTrainRun' : 'lblRequestTrainRun';
    return buildTrainRunTitleConfig(item, translationKey, context.translate);
  }

  /**
   * Builds a TRAIN_RUN_CREATION payload, adding cancellationReason
   * and zeroed trainId/schedVersionId on top of the shared base.
   * @param {Record<string, unknown>} aggregatedData - Form data from all slots.
   * @param {ItemContextData} contextData - Context with orderId, originalItem, etc.
   * @returns {OrderContent} The order content ready for the API.
   */
  public assembleSavePayload(aggregatedData: Record<string, unknown>, contextData: ItemContextData): OrderContent {
    const header = aggregatedData[ContributorKey.TRAIN_HEADER] as TrainHeaderData;
    const trainRun = {
      ...buildTrainRunBasePayload(aggregatedData, contextData),
      cancellationReason: header.cancellationReason || '',
      trainId: 0,
      schedVersionId: 0,
    } as unknown as TrainRun;

    return { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.CREATION, item: trainRun };
  }

  /** @param {OrderItemContent} item - The train run to extract from (includes state and cancellationReason). */
  public extractInitialData(item: OrderItemContent): Record<string, unknown> {
    return extractTrainRunInitialData(item, { includeCancellationReason: true, includeState: true });
  }

  /** @param {ItemContext} context - Evaluates permissions and order state. */
  public resolveEditMode(context: ItemContext): { globalMode: SlotDisplayMode } {
    return resolveTrainRunEditMode(context);
  }

  /** @param {Record<string, unknown>} aggregatedData - Validates trainType and tractionUnit on first stop. */
  public validateBeforeSave(aggregatedData: Record<string, unknown>): ValidationResult {
    return validateTrainRunStops(aggregatedData);
  }
}
