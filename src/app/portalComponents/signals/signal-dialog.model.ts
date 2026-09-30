import { AdminDataEntry } from '@Ordering/api';

export interface AddSignalDialogData {
  preselectedSignals?: AdminDataEntry[];
  singleSelection?: boolean;
}

export interface ImportSignalDialogResult {
  acceptedSignals: AdminDataEntry[];
}
