import { AdminDataEntry } from '@Ordering/api';

export interface ImportedSignalRow {
  area: string;
}

export interface ImportedSignalValidationResult {
  area: string;
  status: string;
  signal?: AdminDataEntry;
}
