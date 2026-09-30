import { TrainRunFilters } from '@Ordering/api';
import { TrainDateTimeEnum } from '@Ordering/data/custom/enum/trainDateTime';

/**
 * Application-level filter model for the Train Run list.
 * Extends the API's TrainRunFilters with the `showAllProjects` flag,
 * which is a separate query parameter on the API call rather than a filter field.
 */
export interface TrainRunListFilter extends TrainRunFilters {
  /** When true, fetches train runs from all accessible projects rather than only the selected one. */
  showAllProjects: boolean;
}

/**
 * Default/initial filter values for the Train Run list.
 */
export const INITIAL_TRAIN_RUN_FILTER: TrainRunListFilter = {
  searchString: undefined,
  dateRange: undefined,
  dateRangeType: TrainDateTimeEnum.BEGIN_DATE,
  state: [],
  trainSource: undefined,
  showAllProjects: false,
};
