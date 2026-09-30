import { Injectable } from '@angular/core';
import { OrderContent, OrderItemContent, OrderItemAction, OrderItemType, TrainRunCancellation } from '@Ordering/api';
import {
  ComponentSlot,
  ItemContext,
  SlotDisplayMode,
  TitleConfig,
  ValidationResult,
} from '@Ordering/shared/models/component-slot.interface';
import { ItemContextData, ItemOperationStrategy } from '@Ordering/shared/models/item-operation-strategy.interface';

import { buildTrainRunSlots, ContributorKey } from './train-run-strategy.utils';

/**
 * Strategy for viewing a cancelled train run.
 * All slots are read-only (via resolveEditMode), stops are hidden.
 */
@Injectable()
export class TrainRunCancellationStrategy implements ItemOperationStrategy {
  readonly operationType = OrderItemAction.CANCELLATION;
  readonly moduleId = OrderItemType.TRAIN_RUN;

  /** @returns {ComponentSlot[]} Header, OD visible, stops hidden. */
  public getComponentSlots(): ComponentSlot[] {
    return buildTrainRunSlots({
      stopsVisible: () => false,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public getTitleConfig(item: OrderItemContent | null, _context: ItemContext): TitleConfig {
    return {
      title: _context.translate('lblCancelledTrainRun'),
    };
  }

  /**
   * Builds a minimal cancellation payload containing only
   * trainNumber, operatingCompany, and cancellationDays.
   * @param {Record<string, unknown>} aggregatedData - Form data from all slots.
   * @param {ItemContextData} _contextData - Unused.
   * @returns {OrderContent} The cancellation order content.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public assembleSavePayload(aggregatedData: Record<string, unknown>, _contextData: ItemContextData): OrderContent {
    const operatingDays = aggregatedData[ContributorKey.OPERATING_DAYS] as any[];

    const cancellation: TrainRunCancellation = {
      trainNumber: (aggregatedData[ContributorKey.TRAIN_HEADER] as any)?.trainNo || '',
      operatingCompany: '',
      cancellationDays: operatingDays ?? [],
    };

    return {
      type: OrderItemType.TRAIN_RUN,
      action: OrderItemAction.CANCELLATION,
      item: cancellation,
    };
  }

  /**
   * Maps cancellation-specific fields into the standard contributor shape.
   * Uses cancellationDays as operatingDays and provides an empty stops array.
   * @param {OrderItemContent} item - The cancellation item.
   * @returns {Record<string, unknown>} Initial data keyed by contributor key.
   */
  public extractInitialData(item: OrderItemContent): Record<string, unknown> {
    const cancellation = item as TrainRunCancellation;
    return {
      [ContributorKey.TRAIN_HEADER]: {
        trainNo: cancellation.trainNumber,
        isConditionalTrainRun: false,
        operatingCompany: cancellation.operatingCompany,
        remark: '',
        cancellationReason: (cancellation as any).cancellationReason || '',
      },
      [ContributorKey.OPERATING_DAYS]: cancellation.cancellationDays ?? [],
      [ContributorKey.STOPS]: [],
    };
  }

  /** @returns {{ globalMode: SlotDisplayMode }} Always READONLY — cancellation is view-only. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public resolveEditMode(_context: ItemContext): { globalMode: SlotDisplayMode } {
    return {
      globalMode: SlotDisplayMode.READONLY,
    };
  }

  /** @returns {ValidationResult} Always valid — no editable fields to validate. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public validateBeforeSave(_aggregatedData: Record<string, unknown>): ValidationResult {
    return { valid: true };
  }
}
