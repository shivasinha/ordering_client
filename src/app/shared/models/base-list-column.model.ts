import { TemplateRef } from '@angular/core';
import { UserAccessRights } from '@Ordering/api';

/**
 * Column definition used in BaseListComponent.
 */
export interface ColumnConfig<T = any> {
  /** Property key in the view model */
  field: keyof T | string;
  /** Column header text (already translated) */
  header: string;
  /** Whether the column is sortable (defaults to true) */
  sortable?: boolean;
  /**
   * The actual API field name to send as `sortBy` when this column is sorted.
   * Use this when `field` is a formatted/translated view-model property (e.g. `formattedCreationDateTime`)
   * and the backend expects the original API field name (e.g. `creationDateTime`).
   * Defaults to `field` when not specified.
   */
  sortField?: string;
  /** Fixed width (e.g., '120px', '15%') */
  width?: string;
  /** Dynamic CSS class(es) for the cell */
  cssClass?: (item: T) => string | string[] | Record<string, boolean>;
  /** Renders a mat-icon instead of text. Returns the Material icon name. */
  icon?: (item: T) => string;
  /** Tooltip for icon cells */
  tooltip?: (item: T) => string;
  /** Click handler for icon cells */
  iconClick?: (item: T, event: MouseEvent) => void;
  /** Permission key checked via *appHasPermission before rendering the icon */
  iconPermission?: keyof UserAccessRights;
  /** Custom cell template — overrides all other renderers */
  cellTemplate?: TemplateRef<{ $implicit: T }>;
}
