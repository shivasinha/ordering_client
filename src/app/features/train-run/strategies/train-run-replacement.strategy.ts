import { Injectable } from '@angular/core';
import { DaySet, OrderContent, OrderItemContent, OrderItemAction, OrderItemType, TrainRunReplacement } from '@Ordering/api';
import {
  ComponentSlot,
  ItemContext,
  SlotDisplayMode,
  TitleConfig,
  ValidationResult,
} from '@Ordering/shared/models/component-slot.interface';
import { ItemContextData, ItemOperationStrategy } from '@Ordering/shared/models/item-operation-strategy.interface';

import {
  resolveTrainRunEditMode,
  validateTrainRunStops,
  buildTrainRunBasePayload,
  extractTrainRunInitialData,
  buildTrainRunTitleConfig,
  buildTrainRunSlots,
  isOperatingDaysVisible,
} from './train-run-strategy.utils';

/**
 * Strategy for replacing an existing train run.
 * Locks the train number and operating company fields,
 * and passes parent operating days to the OD slot for comparison.
 */
@Injectable()
export class TrainRunReplacementStrategy implements ItemOperationStrategy {
  readonly operationType = OrderItemAction.REPLACEMENT;
  readonly moduleId = OrderItemType.TRAIN_RUN;

  /** @returns {ComponentSlot[]} Header with locked fields, OD with parent comparison, and stops. */
  public getComponentSlots(): ComponentSlot[] {
    return buildTrainRunSlots({
      headerInputs: { lockTrainNo: true, lockOperatingCompany: true },
      operatingDaysVisible: isOperatingDaysVisible,
      operatingDaysInputs: item => ({
        trainRunOriginalOperatingDays: this.resolveParentOperatingDays(item),
        contentType: OrderItemAction.REPLACEMENT,
      }),
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getTitleConfig(item: OrderItemContent | null, _context: ItemContext): TitleConfig {
    return buildTrainRunTitleConfig(item, 'lblModifyTrainRun', _context.translate);
  }

  /**
   * Builds a TRAIN_RUN_REPLACEMENT payload, adding parent references
   * and zeroed trainId/schedVersionId on top of the shared base.
   * @param {Record<string, unknown>} aggregatedData - Form data from all slots.
   * @param {ItemContextData} contextData - Context with parentExternalId, parentOperatingDays.
   * @returns {OrderContent} The order content ready for the API.
   */
  public assembleSavePayload(aggregatedData: Record<string, unknown>, contextData: ItemContextData): OrderContent {
    const replacement = {
      ...buildTrainRunBasePayload(aggregatedData, contextData),
      trainId: 0,
      schedVersionId: 0,
      parentExternalId: contextData.parentExternalId || '',
    } as unknown as TrainRunReplacement;

    return { type: OrderItemType.TRAIN_RUN, action: OrderItemAction.REPLACEMENT, item: replacement };
  }

  public extractInitialData(item: OrderItemContent): Record<string, unknown> {
    return extractTrainRunInitialData(item);
  }

  /** @param {ItemContext} context - Evaluates permissions and order state. */
  public resolveEditMode(context: ItemContext): { globalMode: SlotDisplayMode } {
    return resolveTrainRunEditMode(context);
  }

  /** @param {Record<string, unknown>} aggregatedData - Validates trainType and tractionUnit on first stop. */
  public validateBeforeSave(aggregatedData: Record<string, unknown>): ValidationResult {
    return validateTrainRunStops(aggregatedData);
  }

  /**
   * Resolves parent operating days from the item.
   * Prefers explicit parentOperatingDays (stored by backend), falls back to
   * the item's own operatingDays (which equals parent days on initial creation).
   * @param {OrderItemContent | null} item - The resolved content item.
   * @returns {DaySet[]} The parent operating days for comparison highlighting.
   */
  private resolveParentOperatingDays(item: OrderItemContent | null): DaySet[] {
    if (!item) return [];
    const asReplacement = item as TrainRunReplacement;
    if (asReplacement.parentOperatingDays?.length) {
      return asReplacement.parentOperatingDays;
    }
    return [];
  }
}
