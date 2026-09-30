import { PaginationAndSorting, SortOrder } from '@Ordering/api';
import { ColumnConfig } from '@Ordering/shared/models/base-list-column.model';
import { ActionConfig } from '@Ordering/shared/models/base-list-action.model';
import { LocalConfigService } from '@Ordering/shared/services/local-config.service';

/**
 * Configuration object for BaseListComponent
 * Consolidates all input parameters into a single, manageable object
 * Uses library models for pagination and sorting to maintain uniformity
 */
export interface BaseListConfig<T = any> {
  /** The data items to display */
  data: T[];

  /** Column definitions */
  columns: ColumnConfig<T>[];

  /** Optional action buttons for each row */
  actions?: ActionConfig<T>[];

  /** Pagination and sorting configuration from library */
  paginationAndSorting?: PaginationAndSorting & {
    /** Total count of items (for server-side pagination) */
    totalCount: number;
    /** Available page size options */
    pageSizeOptions?: number[];
    /** Whether to show pagination controls */
    show?: boolean;
  };

  /** UI configuration */
  ui?: {
    /** Message to show when no data is available */
    noDataMessage?: string;
  };

  /** When true, rows emit a rowClick event and gain hover/cursor styling */
  rowClickable?: boolean;

  /** Optional predicate to mark a row as selected (adds .selected CSS class) */
  isRowSelected?: (row: T) => boolean;
  /**
   * Optional row click handler. When provided, rows become clickable and this
   * callback is invoked with the row item. Use this instead of [routerLink] so
   * that all navigation goes through NavigationService (which auto-appends the
   * activeTab query param).
   */
  onRowClick?: (item: T) => void;
}

/**
 * Default configuration values
 */
export const DEFAULT_LIST_CONFIG: Partial<BaseListConfig> = {
  actions: [],
  paginationAndSorting: {
    totalCount: 0,
    pageSize: LocalConfigService.paginatorPageSizes[1],
    pageIndex: 0,
    pageSizeOptions: LocalConfigService.paginatorPageSizes,
    show: true,
    sortOrder: SortOrder.ASC,
  },
  ui: {
    noDataMessage: '',
  },
};
