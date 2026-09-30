import { SpareCapacityListItem } from '@Ordering/api';

/**
 * View model for spare capacity list items
 * Extends library model and adds navigation property
 */
export interface SpareCapacityListViewModel extends SpareCapacityListItem {
  beginDate: string;
  operatingDaysNames?: string;
  _routerLink?: string | any[];
}
