import { TrainRunListItem } from '@Ordering/api';

/**
 * View model for Train Run list items.
 * Extends the API model with pre-formatted display fields.
 */
export interface TrainRunListViewModel extends TrainRunListItem {
  /** Pre-formatted last-modified date/time string */
  formattedLastModifiedDateTime: string;
  /** Pre-formatted cancellation date/time string (empty string when absent) */
  formattedCancellationDateTime: string;
  /** Translated state label */
  translatedState: string;
  /** Translated source label */
  translatedSource: string;
  /** Begin date from the first operating day segment */
  formattedBeginDate: string;
  /** Origin station code for display */
  fromStationDisplay: string;
  /** Destination station code for display */
  toStationDisplay: string;
}
