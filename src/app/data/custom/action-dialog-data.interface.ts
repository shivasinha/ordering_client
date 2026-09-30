import { OrderResponse, TrainRun, TrainRunListItem } from '@Ordering/api';
import { TrainListActions } from '@Ordering/data/custom/enum/train-list-actions.enum';
import { ArchivedOrderActions } from '@Ordering/data/custom/enum/archived-order-actions.enum';

export interface ActionDialogData {
  action: TrainListActions | ArchivedOrderActions;
  message?: string;
  trainRunData?: TrainRun;
  trainRunListItemData?: TrainRunListItem;
  orderData?: OrderResponse;
}
