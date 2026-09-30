import { OrderState, TrainState } from '@Ordering/api'; // Ensure this import is actually used

// Enum for different list types
export enum ListTypesEnum {
  CURRENT_ORDERS = 'CURRENT_ORDERS',
  ARCHIVED_ORDERS = 'ARCHIVED_ORDERS',
  TRAINS = 'TRAINS',
  ORDER_ITEMS = 'ORDER_ITEMS',
  OFFER_ITEMS = 'OFFER_ITEMS',
}
// Interface for actions, allowing visibility based on order state, train state, or boolean
export interface Action {
  actionName: ActionNamesEnum;
  actionIcon: string; // Icon name from mat-icons for the action
  actionVisibility?: OrderState[] | TrainState[] | boolean | string | ((element: any) => boolean); // Optional property for visibility - can be array, boolean, string, or function
  actionTooltip?: string; // Optional tooltip for the action
}

export enum ActionNamesEnum {
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  CANCEL = 'CANCEL',
  COPY = 'COPY',
  VIEW = 'VIEW',
  CANCEL_TRAIN_RUN = 'CANCEL_TRAIN_RUN',
  MODIFY_TRAIN_RUN = 'MODIFY_TRAIN_RUN',
}

// Interface for column definition
interface ColumnDefinition {
  columnDef: string; // Column identifier
  type:
    | 'string'
    | 'number'
    | 'date'
    | 'message'
    | 'actions'
    | 'itemActions'
    | 'station'
    | 'beginOperatingDay'
    | 'operatingDays'
    | 'enum'
    | 'state'
    | 'trainType'; // Type of data in the column
  header: string; // Column header label
  enumName?: string; // Optional enum name
  translateEnum?: boolean; // Optional flag to enable enum translation
  actionsList?: Action[]; // Optional list of actions
  showTimeStamp?: boolean; // Optional time stamp
  columnVisibility?: boolean | (() => boolean); // Optional flag or function to control column visibility
  accessor?: (isOrder: boolean, item: any) => any; // Optional accessor function
}

// Type definition for list view columns
export type ListViewColumns = ColumnDefinition[];
