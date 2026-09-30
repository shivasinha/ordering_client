import { inject } from '@angular/core';
import { OrderContent, OrderItemContent, OrderItemAction, OrderItemType, TrainRun, TrainRunReplacement } from '@Ordering/api';
import { CopyFlowData, OrderItemModule, ViewActionType } from '@Ordering/shared/models/order-item-module.interface';
import { ListActionsService } from '@Ordering/shared/services/list-actions.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';

/**
 * Extracts parentOperatingDays from the active item.
 * Prefers stored parentOperatingDays (for saved replacements), falls back to own operatingDays.
 */
function extractParentOperatingDays(activeItem: OrderItemContent | null): Record<string, unknown> {
  if (!activeItem) return {};

  const asReplacement = activeItem as TrainRunReplacement;
  if (asReplacement.parentOperatingDays?.length) {
    return { parentOperatingDays: asReplacement.parentOperatingDays };
  }
  return {};
}

/**
 * Extracts the copied train run number from navigation state.
 */
function extractCopiedTrainRunNumber(navState: Record<string, unknown>): Record<string, unknown> {
  if (navState['copiedTrainRunNumber']) {
    return { copiedTrainRunNumber: navState['copiedTrainRunNumber'] };
  }
  return {};
}

/**
 * Extracts conditional train config defaults from ConfigDataService.
 */
function extractConditionalTrainConfig(): Record<string, unknown> {
  const configDataService = inject(ConfigDataService);
  const config = configDataService.configData?.conditionalTrainsConfig;
  if (!config?.enableConditionalTrains) return {};

  const defaultOD = config.projectDefaultOperatingDays;
  return { defaultOperatingDays: Array.isArray(defaultOD) ? defaultOD : defaultOD ? [defaultOD] : [] };
}

/**
 * Module definition for train-run order items.
 * Configures creation, catalog view, copy flow, operation overrides, and context building.
 */
export const TRAIN_RUN_MODULE: OrderItemModule = {
  moduleId: OrderItemType.TRAIN_RUN,
  labelKey: 'lblTrainRun',
  icon: 'train',
  defaultCreationOperation: OrderItemAction.CREATION,
  catalogRouteSegment: 'train-run',
  catalogViewStrategy: ViewActionType.TRAIN_RUN_CATALOG,
  resolverKeys: ['trainRun'],

  /**
   * Extracts train-run copy data from router navigation state.
   * @param {Record<string, unknown>} navState - The navigation state extras.
   * @returns {CopyFlowData | null} Copy flow data if trainRunData exists, null otherwise.
   */
  extractCopyData(navState: Record<string, unknown>): CopyFlowData | null {
    const trainRunData = navState['trainRunData'] as TrainRun | undefined;
    if (!trainRunData) return null;
    return {
      item: trainRunData,
      operationType: OrderItemAction.CREATION,
      extraContext: {
        copiedTrainRunNumber: navState['copiedTrainRunNumber'] as string | undefined,
      },
    };
  },

  /**
   * Detects if the order item should use a replacement strategy instead of the default.
   * @param {OrderContent | null} activeContent - The resolved active item's content envelope.
   * @returns {OrderItemAction | null} Replacement operation type if active item is a replacement, null otherwise.
   */
  detectOperationOverride(activeContent: OrderContent | null): OrderItemAction | null {
    if (activeContent?.action === OrderItemAction.REPLACEMENT && activeContent?.type === OrderItemType.TRAIN_RUN) {
      return OrderItemAction.REPLACEMENT;
    }
    return null;
  },

  /**
   * Builds module-specific context data for the host component.
   * Extracts parent operating days, copied train number, and conditional train config.
   * @param {OrderItemContent | null} activeItem - The resolved content item being edited/viewed.
   * @param {Record<string, unknown>} navState - The navigation state extras.
   * @returns {Record<string, unknown>} Additional context data merged into ItemContextData.
   */
  buildContextData(activeItem: OrderItemContent | null, navState: Record<string, unknown>): Record<string, unknown> {
    const extra: Record<string, unknown> = {};

    Object.assign(extra, extractParentOperatingDays(activeItem));
    Object.assign(extra, extractCopiedTrainRunNumber(navState));
    Object.assign(extra, extractConditionalTrainConfig());

    return extra;
  },

  /**
   * Post-save cleanup hook. Clears cached train-run and train-run-number state from the list service.
   */
  onSaveComplete(): void {
    const listActionsService = inject(ListActionsService);
    listActionsService.clearTrainRun();
    listActionsService.clearTrainRunNumber();
  },
};
