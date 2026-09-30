import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';

import { TrainListActionsComponent } from '@Ordering/portalComponents/train-list-actions/train-list-actions.component';
import { ArchivedOrdersListActionsComponent } from '@Ordering/portalComponents/archived-orders-actions/archived-orders-list-actions.component';
import { TrainListActions } from '@Ordering/data/custom/enum/train-list-actions.enum';
import { ArchivedOrderActions } from '@Ordering/data/custom/enum/archived-order-actions.enum';
import { ActionDialogData } from '@Ordering/data/custom/action-dialog-data.interface';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { OrderResponse, TrainRun } from '@Ordering/api';

@Injectable({
  providedIn: 'root',
})
export class ActionDialogService {
  private dialog = inject(MatDialog);
  private tr = inject(TranslationsService);

  private readonly defaultDialogConfig = {
    width: '550px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    autoFocus: false,
  };

  private readonly largeDialogConfig = {
    width: '700px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    autoFocus: false,
  };

  /**
   * Opens the appropriate action dialog based on the action type
   * @param {ActionDialogData} data - The data for the dialog
   * @returns Observable of the dialog result
   */
  public openActionDialog(data: ActionDialogData): Observable<boolean | undefined> {
    const component = this.getComponentForAction(data);
    const dialogConfig = this.getDialogConfig(data.action);

    return this.dialog
      .open(component as any, {
        ...dialogConfig,
        data,
      })
      .afterClosed();
  }

  /**
   * Opens a dialog to perform an action on a train run, such as modifying or canceling it.
   * The dialog message is determined based on the specified action.
   * Returns the dialog's afterClosed Observable so callers can react (e.g. reload the list).
   *
   * @param {ArchivedOrderActions} action - The action to perform on the train run (e.g., modify or cancel).
   * @param {OrderResponse} orderData - The order data associated with the train run.
   * @param {TrainRun} trainRunData - The train run data to be acted upon.
   * @returns {Observable<boolean | undefined>} Observable that emits when the dialog is closed.
   */
  public openTrainRunActionDialog(
    action: ArchivedOrderActions,
    orderData: OrderResponse,
    trainRunData: TrainRun,
  ): Observable<boolean | undefined> {
    const message =
      action === ArchivedOrderActions.MODIFY_TRAIN_RUN ? this.tr.translate('lblModifyTrainRun') : this.tr.translate('lblCancelTrainRun');
    return this.openActionDialog({ message, action, orderData, trainRunData });
  }

  /**
   * Gets the appropriate component for the given action
   * @param {TrainListActions | ArchivedOrderActions} action - The action to get component for
   * @returns {object} The component class to open
   */
  private getComponentForAction(data: ActionDialogData): typeof TrainListActionsComponent | typeof ArchivedOrdersListActionsComponent {
    const action = data.action;
    // Prioritize archived orders when orderData is present
    if (data.orderData && this.isValidAction(action, ArchivedOrderActions)) {
      return ArchivedOrdersListActionsComponent;
    }
    // Handle train list actions
    if (this.isValidAction(action, TrainListActions)) {
      return TrainListActionsComponent;
    }
    // Fallback to archived orders for actions without orderData
    if (this.isValidAction(action, ArchivedOrderActions)) {
      return ArchivedOrdersListActionsComponent;
    }
    throw new Error(`Unknown action type: ${action}`);
  }

  /**
   * Gets the appropriate dialog configuration based on the action type
   * @param {TrainListActions | ArchivedOrderActions} action - The action to get configuration for
   * @returns {object} The dialog configuration object
   */
  private getDialogConfig(action: TrainListActions | ArchivedOrderActions): { width: string } {
    // Use larger dialog for cancellation actions that need more space
    if (action === ArchivedOrderActions.CANCEL_TRAIN_RUN || action === TrainListActions.CANCEL_TRAIN_PATH) {
      return this.largeDialogConfig;
    }
    return this.defaultDialogConfig;
  }

  /**
   * Generic method to check if an action is valid for a given enum
   * @param {TrainListActions | ArchivedOrderActions} action - The action to validate
   * @param {object} enumObject - The enum object to check against
   * @returns {boolean} True if the action is valid for the enum, false otherwise
   */
  private isValidAction(
    action: TrainListActions | ArchivedOrderActions,
    enumObject: typeof TrainListActions | typeof ArchivedOrderActions,
  ): boolean {
    return Object.values(enumObject).includes(action as TrainListActions | ArchivedOrderActions);
  }
}
