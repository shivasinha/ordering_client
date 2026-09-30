import { Injectable, inject } from '@angular/core';
import { OrderItemContent, OrderItemType, TrainRun } from '@Ordering/api';
import { ComponentSlot, ItemContext, SlotDisplayMode, TitleConfig } from '@Ordering/shared/models/component-slot.interface';
import {
  ActionButtonColor,
  HostAction,
  ItemContextData,
  ItemOperationStrategy,
} from '@Ordering/shared/models/item-operation-strategy.interface';
import { ViewActionType } from '@Ordering/shared/models/order-item-module.interface';

import { UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
import { EnumNameList } from '@Ordering/data/custom/enum-name-list';
import { ActionDialogService } from '@Ordering/shared/services/action-dialog.service';
import { TrainListActions } from '@Ordering/data/custom/enum/train-list-actions.enum';

import { extractTrainRunInitialData, buildTrainRunTitleConfig, buildTrainRunSlots } from './train-run-strategy.utils';

/**
 * Strategy for the read-only train-run catalog view.
 * Renders train run details without order context and provides
 * the "Modify Train Run" action button when permitted.
 */
@Injectable()
export class TrainRunCatalogStrategy implements ItemOperationStrategy {
  readonly operationType = ViewActionType.TRAIN_RUN_CATALOG;
  readonly moduleId = OrderItemType.TRAIN_RUN;

  private readonly actionDialogService = inject(ActionDialogService);

  /** @returns {ComponentSlot[]} Header without conditional toggle, OD, and stops — all read-only. */
  public getComponentSlots(): ComponentSlot[] {
    return buildTrainRunSlots({
      headerInputs: () => ({ showConditionalToggle: false }),
    });
  }

  public getTitleConfig(item: OrderItemContent | null, context: ItemContext): TitleConfig {
    return buildTrainRunTitleConfig(item, 'lblDetailTrainRun', context.translate, {
      showTrainNumber: true,
      showStateBadge: true,
      stateEnumName: EnumNameList.TrainState,
    });
  }

  /** @param {OrderItemContent} item - The train run to extract from (includes state and cancellationReason). */
  public extractInitialData(item: OrderItemContent): Record<string, unknown> {
    return extractTrainRunInitialData(item, { includeCancellationReason: true, includeState: true });
  }

  /** @returns {{ globalMode: SlotDisplayMode }} Always READONLY — catalog is view-only. */
  public resolveEditMode(): { globalMode: SlotDisplayMode } {
    return { globalMode: SlotDisplayMode.READONLY };
  }

  /**
   * Provides the "Modify Train Run" button when the user has
   * CAN_INITIATE_PATH_ALTERATION permission and the train is modifiable.
   * Returns an empty array when the user lacks permission.
   * @param {OrderItemContent | null} item - The current train run.
   * @param {ItemContext} context - View context with permission service.
   * @param {ItemContextData} contextData - Contains routeParams with trainId and schedVersionId.
   * @returns {HostAction[]} Action buttons for the host toolbar.
   */
  public getActionButtons(item: OrderItemContent | null, context: ItemContext, contextData: ItemContextData): HostAction[] {
    const canModify =
      !!item &&
      'trainSource' in item &&
      context.userPermissions.canModifyTrainRun(item as TrainRun) &&
      context.userPermissions.checkPermissions([UserPermissionsEnum.CAN_INITIATE_PATH_ALTERATION]);

    if (!canModify) return [];

    const routeParams = contextData['routeParams'] as Record<string, string> | undefined;

    return [
      {
        label: context.translate('lblModifyTrainRun'),
        color: ActionButtonColor.PRIMARY,
        execute: () => {
          if (!item) return;
          this.actionDialogService.openActionDialog({
            action: TrainListActions.MODIFY_TRAIN_RUN,
            trainRunData: {
              ...(item as TrainRun),
              trainId: Number(routeParams?.['trainId']),
              schedVersionId: Number(routeParams?.['schedVersionId']),
            },
          });
        },
      },
    ];
  }
}
