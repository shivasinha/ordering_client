import { OrderFilters } from '@Ordering/api';
import { OrderDateTimeEnum } from '@Ordering/data/custom/enum/orderDateTime';

/**
 * Default/initial filter values for the order list
 */
export const INITIAL_ORDER_FILTER: OrderFilters = {
  searchString: undefined,
  dateRange: undefined,
  dateRangeType: OrderDateTimeEnum.CREATION_DATETIME,
  orderState: [],
  orderType: [],
};
